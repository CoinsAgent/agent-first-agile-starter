#!/usr/bin/env python3
"""Check paths in a complete Git diff. This command does not authenticate approval."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys


def valid_path(value):
    if (not isinstance(value, str) or not value or value.startswith("/")
            or any(ord(c) < 32 for c in value) or any(c in value for c in "\\*?[]:")
            or any(p in ("", ".", "..", ".git") for p in value.split("/"))):
        raise ValueError(f"unsafe repository path: {value!r}")
    if str(PurePosixPath(value)) != value:
        raise ValueError(f"non-canonical repository path: {value!r}")
    return value


def load_scope(data):
    if isinstance(data, (str, Path)):
        data = json.loads(Path(data).read_text())
    if (not isinstance(data, dict) or set(data) != {"version", "story", "allowed"}
            or data["version"] != 1 or not isinstance(data["story"], str) or not re.fullmatch(r"US-\d{3,}(?:-\d{2,})?", data["story"])
            or not isinstance(data["allowed"], list) or not data["allowed"]):
        raise ValueError("scope requires version 1, story ID and nonempty allowed paths")
    entries = []
    for item in data["allowed"]:
        if not isinstance(item, dict) or set(item) != {"path", "kind"} or item["kind"] not in ("file", "directory"):
            raise ValueError("scope entries require path and kind=file|directory")
        valid_path(item["path"])
        for other in entries:
            if (item["path"] == other["path"] or contains(item, other["path"]) or contains(other, item["path"])):
                raise ValueError(f"overlapping scope paths: {item['path']}, {other['path']}")
        entries.append(item)
    return data


def contains(entry, path):
    return path == entry["path"] or (entry["kind"] == "directory" and path.startswith(entry["path"] + "/"))


def git(root, *args):
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True)
    if result.returncode:
        raise ValueError(f"Git operation failed: {args[0]} (missing/invalid ref or repository)")
    return result.stdout


def commit(root, ref):
    if not isinstance(ref, str) or not re.fullmatch(r"[A-Za-z0-9_./~-]+", ref) or ref.startswith("-"):
        raise ValueError("invalid Git ref")
    return git(root, "rev-parse", "--verify", ref + "^{commit}").decode().strip()


def changed_paths(root, base, head):
    base, head = commit(root, base), commit(root, head)
    if subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", base, head], capture_output=True).returncode:
        raise ValueError("diff base is not an ancestor of head; update the branch with the current trusted base before verification")
    # No rename detection: moving a file always includes both endpoints.
    result = git(root, "diff", "--no-ext-diff", "--no-renames", "--name-only", "-z", base, head, "--")
    return [p.decode("utf-8", "strict") for p in result.split(b"\0") if p]


def check_changes(root, base, head, scope):
    scope = load_scope(scope)
    errors = []
    for path in changed_paths(root, base, head):
        valid_path(path)
        if not any(contains(entry, path) for entry in scope["allowed"]):
            errors.append(f"outside approved scope: {path}; request scope expansion before editing")
        for ref in (base, head):
            entry = git(root, "ls-tree", commit(root, ref), "--", path)
            if entry and entry.split(b" ", 1)[0] not in (b"100644", b"100755"):
                errors.append(f"unsupported symlink/submodule/tree change: {path}")
    return errors



def scope_from_diff(root, base, head):
    candidates = [p for p in changed_paths(root, base, head)
                  if re.fullmatch(r"work/US-\d{3,}(?:-\d{2,})?/scope\.json", p)]
    if len(candidates) != 1:
        raise ValueError("complete PR diff must add/update exactly one work/<story>/scope.json")
    path = candidates[0]
    head = commit(root, head)
    entry = git(root, "ls-tree", head, "--", path)
    if entry.split(b" ", 1)[0] not in (b"100644", b"100755"):
        raise ValueError("scope proposal must be a regular Git blob")
    scope = load_scope(json.loads(git(root, "show", f"{head}:{path}")))
    if path != f"work/{scope['story']}/scope.json":
        raise ValueError("scope path and story ID do not match")
    return scope


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--scope", type=Path)
    selection.add_argument("--discover-scope", action="store_true", help="read the single changed scope proposal from the exact head commit")
    args = parser.parse_args()
    try:
        scope = scope_from_diff(args.root, args.base, args.head) if args.discover_scope else load_scope(args.scope)
        errors = check_changes(args.root, args.base, args.head, scope)
        if errors:
            raise ValueError("\n".join(errors))
        print("Scope paths passed for complete diff; approval authenticity is a separate gate.")
        return 0
    except (ValueError, OSError, UnicodeError, TypeError) as error:
        print(f"Scope check failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
