"""Exercise complete Git diffs, rather than mirroring checker implementation."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_scope import check_changes, load_scope, changed_paths, scope_from_diff


class ScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.write("feature/old name.ts", "original\n")
        self.write("other/private.ts", "private\n")
        self.commit()
        self.base = self.git("rev-parse", "HEAD").strip()
        self.scope = {"version": 1, "story": "US-001-02", "allowed": [{"path": "feature", "kind": "directory"}]}

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True)

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def commit(self):
        self.git("add", "--all")
        self.git("commit", "-qm", "fixture")

    def check(self):
        return check_changes(self.root, self.base, "HEAD", load_scope(self.scope))

    def test_added_file_and_space_rename_pass(self):
        self.git("mv", "feature/old name.ts", "feature/new name.ts")
        self.write("feature/added.ts", "new")
        self.commit()
        self.assertEqual([], self.check())

    def test_rename_requires_both_endpoints(self):
        self.git("mv", "other/private.ts", "feature/private.ts")
        self.commit()
        self.assertIn("other/private.ts", " ".join(self.check()))

    def test_deletion_outside_scope_fails(self):
        (self.root / "other/private.ts").unlink()
        self.commit()
        self.assertTrue(self.check())

    def test_entire_diff_not_last_commit(self):
        self.write("other/private.ts", "unauthorized")
        self.commit()
        self.write("feature/ok.ts", "allowed")
        self.commit()
        self.assertTrue(self.check())
        self.assertEqual({"feature/ok.ts", "other/private.ts"}, set(changed_paths(self.root, self.base, "HEAD")))

    def test_directory_prefix_is_not_sibling_permission(self):
        self.write("feature-other/a.ts", "no")
        self.commit()
        self.assertTrue(self.check())

    def test_file_permission_does_not_allow_children(self):
        self.scope["allowed"] = [{"path": "feature/one", "kind": "file"}]
        self.write("feature/one/child", "no")
        self.commit()
        self.assertTrue(self.check())

    def test_symlink_is_rejected(self):
        (self.root / "feature/link").symlink_to("../other/private.ts")
        self.commit()
        self.assertTrue(self.check())

    def test_invalid_scope_paths_reject(self):
        for path in ["", ".", "/src", "../src", "src/../other", "src//a", "src/", "src\\a", "src/*", ".git/config"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                load_scope({**self.scope, "allowed": [{"path": path, "kind": "directory"}]})

    def test_duplicate_and_overlapping_scopes_reject(self):
        for second in [{"path": "feature", "kind": "directory"}, {"path": "feature/a", "kind": "file"}]:
            with self.assertRaises(ValueError):
                load_scope({**self.scope, "allowed": self.scope["allowed"] + [second]})

    def test_missing_base_rejects(self):
        with self.assertRaises(ValueError):
            changed_paths(self.root, "missing", "HEAD")

    def test_advanced_base_requires_branch_update_not_false_deletions(self):
        self.git("checkout", "-qb", "candidate")
        self.write("feature/candidate.ts", "candidate")
        self.commit()
        candidate = self.git("rev-parse", "HEAD").strip()
        self.git("checkout", "-qb", "advanced-base", self.base)
        self.write("other/base-only.ts", "base change")
        self.commit()
        advanced = self.git("rev-parse", "HEAD").strip()
        with self.assertRaisesRegex(ValueError, "update the branch"):
            changed_paths(self.root, advanced, candidate)
        self.git("checkout", "-q", "candidate")
        self.git("merge", "--no-edit", "advanced-base")
        self.assertEqual(["feature/candidate.ts"], changed_paths(self.root, advanced, "HEAD"))


    def test_exact_head_scope_discovery_and_unauthorized_change(self):
        self.scope["allowed"].append({"path": "work/US-001-02/scope.json", "kind": "file"})
        self.write("work/US-001-02/scope.json", json.dumps(self.scope))
        self.write("feature/valid.ts", "allowed")
        self.commit()
        scope = scope_from_diff(self.root, self.base, "HEAD")
        self.assertEqual([], check_changes(self.root, self.base, "HEAD", scope))
        self.write("other/private.ts", "unauthorized")
        self.commit()
        self.assertTrue(check_changes(self.root, self.base, "HEAD", scope_from_diff(self.root, self.base, "HEAD")))

    def test_missing_ambiguous_or_mismatched_scope_proposal_rejects(self):
        with self.assertRaises(ValueError):
            scope_from_diff(self.root, self.base, "HEAD")
        self.write("work/US-999/scope.json", json.dumps(self.scope))
        self.commit()
        with self.assertRaisesRegex(ValueError, "story ID"):
            scope_from_diff(self.root, self.base, "HEAD")
        self.write("work/US-001-02/scope.json", json.dumps(self.scope))
        self.commit()
        with self.assertRaisesRegex(ValueError, "exactly one"):
            scope_from_diff(self.root, self.base, "HEAD")


if __name__ == "__main__":
    unittest.main()
