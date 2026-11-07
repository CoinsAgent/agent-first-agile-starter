"""Exercise the checked-in CI trigger matrix without adding a YAML dependency.

The workflow's `on` value is an inline JSON mapping (valid YAML). Keep that
small boundary machine-readable; reject multiline extensions and other workflows
rather than silently overlooking an additional automatic trigger. GitHub itself
validates workflow execution; these tests do not authenticate human approval.
"""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


def triggers(source):
    declarations = re.findall(r"^on:\s*(.*)$", source, re.M)
    if len(declarations) != 1:
        raise ValueError("workflow needs one inline JSON trigger mapping")
    value = declarations[0]
    result = json.loads(value)
    if not isinstance(result, dict):
        raise ValueError("trigger mapping must be an object")
    lines = source.splitlines()
    index = next(i for i, line in enumerate(lines) if line.startswith("on:"))
    for line in lines[index + 1:]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith((" ", "\t")):
            raise ValueError("multiline trigger extensions are not supported")
        break
    return result


def selected(config, event, action=None, base="main"):
    if event not in config:
        return False
    filters = config[event]
    return base in filters["branches"] and action in filters["types"]


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / ".github/workflows/ci.yml").read_text()

    def test_only_pr_verification_is_automatically_scheduled(self):
        config = triggers(self.source)
        self.assertEqual(set(config), {"pull_request"})
        self.assertEqual(set(config["pull_request"]), {"branches", "types"})
        self.assertEqual(config["pull_request"]["branches"], ["main"])
        self.assertEqual(set(config["pull_request"]["types"]), {"opened", "synchronize", "reopened"})
        scenarios = [
            ("push", None, "feature/story", False),  # pre-approval branch push
            ("push", None, "main", False),  # merge push must not duplicate PR CI
            ("pull_request", "opened", "main", True),
            ("pull_request", "synchronize", "main", True),  # in-scope fix
            ("pull_request", "reopened", "main", True),
            ("pull_request", "opened", "other", False),
            ("pull_request", "edited", "main", False),
            ("pull_request", "closed", "main", False),
            ("pull_request_target", "opened", "main", False),
            ("issue_comment", "created", "main", False),
            ("pull_request_review", "submitted", "main", False),
            ("workflow_dispatch", None, "main", False),
        ]
        for event, action, base, expected in scenarios:
            with self.subTest(event=event, action=action, base=base):
                self.assertEqual(selected(config, event, action, base), expected)

    def test_no_parallel_workflow_can_reintroduce_push_runs(self):
        files = set((ROOT / ".github/workflows").glob("*.yml"))
        files.update((ROOT / ".github/workflows").glob("*.yaml"))
        self.assertEqual(files, {ROOT / ".github/workflows/ci.yml"})

    def test_both_required_checks_still_execute_real_checks(self):
        jobs = dict(re.findall(r"^  ([\w-]+):\n(.*?)(?=^  [\w-]+:\n|\Z)",
                               self.source.split("\njobs:\n", 1)[1], re.M | re.S))
        self.assertEqual(set(jobs), {"verify", "path-scope"})
        self.assertIn("name: Harness and product verification", jobs["verify"])
        self.assertIn("run: bash scripts/verify.sh", jobs["verify"])
        self.assertIn("run: npm ci", jobs["verify"])
        self.assertIn("name: PR path scope", jobs["path-scope"])
        self.assertIn("--discover-scope", jobs["path-scope"])
        self.assertIn("github.event.pull_request.base.sha", jobs["path-scope"])
        self.assertIn("github.event.pull_request.head.sha", jobs["path-scope"])
        for body in jobs.values():
            self.assertNotRegex(body, r"(?m)^\s+if:")
            self.assertNotIn("continue-on-error", body)
        self.assertIn("permissions:\n  contents: read", self.source)
        self.assertNotRegex(self.source, r"permissions:[\s\S]*?\bwrite\b")

    def test_reader_rejects_hidden_or_unrecognized_trigger_shapes(self):
        for source in ('on:\n  push:\n', 'on: {}\n  push:\n', 'on: {}\non: {}\n', 'on: []\n'):
            with self.subTest(source=source):
                with self.assertRaises((ValueError, json.JSONDecodeError)):
                    triggers(source)


if __name__ == "__main__":
    unittest.main()
