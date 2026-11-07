"""Host-shaped fixtures are simulations, not evidence of live GitHub enforcement."""
from copy import deepcopy
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from verify_scope_approval import authorize, approval_command, current_review_approved, governance_digest


class ApprovalTests(unittest.TestCase):
    def setUp(self):
        self.context = dict(repository="owner/repo", repository_id=123, pr=7, proposal="a" * 40,
                            scope_digest="b" * 64, policy_digest="c" * 64)
        self.policy = {"repository": "owner/repo", "repository_id": 123, "maintainers": [{"login": "human", "id": 42}]}
        self.comment = {"id": 1, "user": {"login": "human", "id": 42, "type": "User"},
                        "body": approval_command(self.context), "created_at": "2026-11-07T00:00:00Z",
                        "updated_at": "2026-11-07T00:00:00Z"}

    def check(self, comment=None, context=None):
        return authorize([comment or self.comment], self.policy, context or self.context)

    def test_exact_human_authorization(self):
        self.assertEqual(1, self.check()["id"])

    def test_wrong_actor_id_or_bot_rejected(self):
        for field, value in [("id", 43), ("login", "impostor"), ("type", "Bot")]:
            c = deepcopy(self.comment)
            c["user"][field] = value
            with self.assertRaises(ValueError):
                self.check(c)

    def test_edited_comment_cannot_be_rewritten_as_approval(self):
        c = {**self.comment, "updated_at": "2026-11-07T00:01:00Z"}
        with self.assertRaises(ValueError):
            self.check(c)

    def test_changed_scope_policy_commit_or_copied_pr_reject(self):
        for field, value in [("repository", "owner/other"), ("repository_id", 124), ("pr", 8),
                             ("proposal", "d" * 40), ("scope_digest", "e" * 64), ("policy_digest", "f" * 64)]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.check(context={**self.context, field: value})

    def test_empty_or_branch_written_claim_rejected(self):
        with self.assertRaises(ValueError):
            authorize([], self.policy, self.context)
        with self.assertRaises(ValueError):
            self.check({**self.comment, "body": "approved_by: human"})

    def test_scope_authorization_is_not_final_review(self):
        self.check()
        self.assertFalse(current_review_approved([], "h" * 40, self.policy))

    def test_final_review_must_cover_current_head(self):
        review = {"user": self.comment["user"], "state": "APPROVED", "commit_id": "h" * 40}
        self.assertTrue(current_review_approved([review], "h" * 40, self.policy))
        self.assertFalse(current_review_approved([review], "i" * 40, self.policy))
        self.assertFalse(current_review_approved([{**review, "state": "DISMISSED"}], "h" * 40, self.policy))

    def test_latest_changes_requested_supersedes_approval(self):
        review = {"user": self.comment["user"], "state": "APPROVED", "commit_id": "h" * 40}
        self.assertFalse(current_review_approved([review, {**review, "state": "CHANGES_REQUESTED"}], "h" * 40, self.policy))

    def test_governance_edits_cannot_reuse_authorization(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()
            git("init", "-q")
            git("config", "user.name", "Fixture")
            git("config", "user.email", "fixture@example.invalid")
            paths = ["scripts/check_scope.py", ".github/workflows/ci.yml", "config/dependency-baseline.json", ".github/scope-policy.json", "package.json", "package-lock.json", "vitest.config.ts", "tests/test_scope.py", "src/features/a/AGENTS.md", "src/features/a/AGENTS.override.md"]
            for name in paths:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text("trusted\n")
            git("add", ".")
            git("commit", "-qm", "trusted")
            base = git("rev-parse", "HEAD")
            with patch("verify_scope_approval.ROOT", root):
                protected = ["scripts", ".github", "config", "tests", "package.json", "package-lock.json", "vitest.config.ts"]
                for name in paths:
                    initial = governance_digest(git("rev-parse", "HEAD"), protected)
                    context = {**self.context, "policy_digest": initial}
                    comment = {**self.comment, "body": approval_command(context)}
                    (root / name).write_text("weakened or widened\n")
                    git("add", ".")
                    git("commit", "-qm", "candidate changes governance")
                    current = governance_digest(git("rev-parse", "HEAD"), protected)
                    self.assertNotEqual(initial, current)
                    with self.assertRaises(ValueError):
                        authorize([comment], self.policy, {**context, "policy_digest": current})


if __name__ == "__main__":
    unittest.main()
