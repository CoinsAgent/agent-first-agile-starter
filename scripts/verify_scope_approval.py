#!/usr/bin/env python3
"""Trusted read-only GitHub scope verifier. Never execute this from a PR checkout."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import Request, urlopen

from check_scope import check_changes, commit, git, load_scope, valid_path

ROOT = Path(__file__).resolve().parents[1]
SCOPE_RE = re.compile(r"work/US-\d{3,}(?:-\d{2,})?/scope\.json\Z")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def approval_command(context):
    return (f"/approve-scope {context['repository']}#{context['pr']} {context['repository_id']} "
            f"{context['proposal']} {context['scope_digest']} {context['policy_digest']}")


def human(user, policy):
    return (user.get("type") == "User" and any(user.get("id") == p["id"] and
            user.get("login", "").lower() == p["login"].lower() for p in policy["maintainers"]))


def authorize(comments, policy, context):
    if (context["repository"] != policy["repository"] or context["repository_id"] != policy["repository_id"]):
        raise ValueError("repository identity does not match trusted policy")
    command = approval_command(context)
    for comment in reversed(comments):
        if (human(comment.get("user", {}), policy) and comment.get("body", "").strip() == command
                and comment.get("created_at") and comment.get("created_at") == comment.get("updated_at")):
            return comment
    raise ValueError("no exact, unedited, authenticated human scope approval; approve the displayed revision")


def current_review_approved(reviews, head, policy):
    latest = {}
    for review in reviews:
        if human(review.get("user", {}), policy) and review.get("state") != "COMMENTED":
            latest[review["user"]["id"]] = review
    if any(r.get("state") == "CHANGES_REQUESTED" for r in latest.values()):
        return False
    return any(r.get("state") == "APPROVED" and r.get("commit_id") == head for r in latest.values())


def api(path):
    # API host is fixed; never follow a URL supplied by PR source or comments.
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "structure-scope-verifier"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    with urlopen(Request("https://api.github.com/" + path, headers=headers), timeout=30) as response:
        return json.load(response)


def pages(path):
    result = []
    for page in range(1, 101):
        batch = api(f"{path}?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise ValueError("unexpected GitHub pagination response")
        result.extend(batch)
        if len(batch) < 100:
            return result
    raise ValueError("pagination limit exceeded; cannot establish complete authorization history")


def blob(ref, path):
    valid_path(path)
    mode = git(ROOT, "ls-tree", ref, "--", path).split(b" ", 1)[0]
    if mode not in (b"100644", b"100755"):
        raise ValueError(f"expected regular Git blob: {path}")
    return git(ROOT, "show", f"{ref}:{path}")


def governance_digest(ref, protected):
    # Bind governance additions/deletions too; includes directories such as scripts/.
    records = []
    for record in git(ROOT, "ls-tree", "-r", "-z", ref).split(b"\0"):
        if not record:
            continue
        header, path_bytes = record.split(b"\t", 1)
        path = path_bytes.decode("utf-8", "strict")
        if path.rsplit("/", 1)[-1] in ("AGENTS.md", "AGENTS.override.md") or any(path == p or path.startswith(p + "/") for p in protected):
            valid_path(path)
            records.append([path, header.decode()])
    return digest(json.dumps(sorted(records), separators=(",", ":")).encode())


def verify_live(number):
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("GITHUB_REPOSITORY is missing/invalid")
    info = api(f"repos/{repo}/pulls/{number}")
    if info.get("state") != "open" or info["base"]["repo"]["full_name"] != repo:
        raise ValueError("expected an open PR in the trusted repository")
    base, head = info["base"]["sha"], info["head"]["sha"]
    if not all(re.fullmatch(r"[0-9a-f]{40}", ref) for ref in (base, head)):
        raise ValueError("invalid host commit identity")
    # Main/base checkout only. Candidate content remains Git objects, never executed.
    if commit(ROOT, "HEAD") != base:
        raise ValueError("trusted checkout is not current PR base; rerun on its current base")
    policy = json.loads(blob(base, ".github/scope-policy.json"))
    if (policy["repository"] != repo or policy["repository_id"] != info["base"]["repo"]["id"]
            or info["base"]["ref"] != policy["base_branch"]):
        raise ValueError("repository/base identity does not match trusted policy")
    fetched = subprocess.run(["git", "fetch", "--no-tags", "origin", f"refs/pull/{number}/head"], cwd=ROOT, capture_output=True)
    if fetched.returncode or commit(ROOT, "FETCH_HEAD") != head:
        raise ValueError("unable to fetch exact host-reported head; retry")
    comments = pages(f"repos/{repo}/issues/{number}/comments")
    proposals = set()
    for comment in comments:
        parts = comment.get("body", "").strip().split()
        if len(parts) == 6 and parts[0] == "/approve-scope" and re.fullmatch(r"[0-9a-f]{40}", parts[3]):
            proposals.add(parts[3])
    candidates = []
    # Only trusted pattern; a PR cannot select an arbitrary executable/config path.
    for record in git(ROOT, "ls-tree", "-r", "--name-only", "-z", head).split(b"\0"):
        if record and SCOPE_RE.fullmatch(record.decode()):
            path = record.decode()
            # Scope must belong to this PR, not merely exist historically.
            if path in set(__import__("check_scope").changed_paths(ROOT, base, head)):
                candidates.append(path)
    if len(candidates) != 1:
        raise ValueError("PR must add/update exactly one story scope.json")
    scope_path = candidates[0]
    scope_bytes = blob(head, scope_path)
    scope = load_scope(json.loads(scope_bytes))
    if scope_path != f"work/{scope['story']}/scope.json":
        raise ValueError("scope path/story mismatch")
    protected = policy["protected"]
    policy_hash = digest(blob(base, ".github/scope-policy.json") + governance_digest(head, protected).encode())
    approved = None
    for proposal in proposals:
        try:
            commit(ROOT, proposal)
            if subprocess.run(["git", "merge-base", "--is-ancestor", proposal, head], cwd=ROOT, capture_output=True).returncode:
                continue
            if blob(proposal, scope_path) != scope_bytes or governance_digest(proposal, protected) != governance_digest(head, protected):
                continue
            context = dict(repository=repo, repository_id=policy["repository_id"], pr=number, proposal=proposal,
                           scope_digest=digest(scope_bytes), policy_digest=policy_hash)
            approved = authorize(comments, policy, context)
            break
        except (ValueError, KeyError):
            continue
    if approved is None:
        context = dict(repository=repo, repository_id=policy["repository_id"], pr=number, proposal=head,
                       scope_digest=digest(scope_bytes), policy_digest=policy_hash)
        print("Human scope approval required; proposed command (not an approval):")
        print(approval_command(context))
        raise ValueError("no valid approval for current scope and governance revision")
    errors = check_changes(ROOT, base, head, scope)
    if errors:
        raise ValueError("\n".join(errors))
    # Dependency evaluation uses trusted checker/config/installed dependencies.
    checked = subprocess.run(["node", "scripts/check_dependencies.mjs", "--ref", head,
                              "--config", "config/project-structure.json", "--baseline", "config/dependency-baseline.json"], cwd=ROOT)
    if checked.returncode:
        raise ValueError("trusted dependency check failed")
    final = current_review_approved(pages(f"repos/{repo}/pulls/{number}/reviews"), head, policy)
    print(json.dumps({"base": base, "head": head, "scope_comment": approved["id"],
                      "scope_authorized": True, "final_review_current": final,
                      "merge_enforcement": "not established by this read-only diagnostic"}))
    # Protect against head/base changes during inspection.
    current = api(f"repos/{repo}/pulls/{number}")
    if current["head"]["sha"] != head or current["base"]["sha"] != base:
        raise ValueError("PR moved during verification; rerun")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pr", type=int)
    args = parser.parse_args()
    try:
        number = args.pr
        if number is None:
            event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
            number = event.get("pull_request", {}).get("number") or event.get("issue", {}).get("number") or int(event.get("inputs", {}).get("pr", 0))
        if not isinstance(number, int) or number <= 0:
            raise ValueError("a positive PR number is required")
        verify_live(number)
        return 0
    except Exception as error:
        # Do not expose API headers/tokens or raw remote bodies.
        print(f"Trusted scope verification failed: {type(error).__name__}: {str(error)[:500]}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
