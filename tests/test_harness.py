"""Small tests for story metadata and lifecycle safety checks."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_harness import (  # noqa: E402
    REQUIRED,
    check_repository,
    has_implementation_story,
    parse_frontmatter,
)

STORY = """---
id: US-001
status: {status}
approved_by: {approved_by}
approved_at: {approved_at}
accepted_by:
accepted_at:
---
# US-001 — Basic value
## User story
As a user, I want value.
## Acceptance criteria
- AC-01: Something observable happens
- AC-02: A negative case is rejected
## Out of scope
- Other features
## Dependencies and risks
- None
"""


class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for name in REQUIRED:
            p = self.root / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("required", encoding="utf-8")
        (self.root / "backlog" / "US-001.md").write_text(
            STORY.format(status="DRAFT", approved_by="", approved_at=""), encoding="utf-8"
        )

    def write_story(self, status="READY", approved_by="Product Owner", approved_at="2026-11-03"):
        (self.root / "backlog" / "US-001.md").write_text(
            STORY.format(status=status, approved_by=approved_by, approved_at=approved_at), encoding="utf-8"
        )

    def write_docs(self):
        for p in ("docs/VISION.md", "docs/PRODUCT_CONTRACT.md"):
            (self.root / p).write_text("Human approved product intent and limits. " * 3, encoding="utf-8")

    def test_frontmatter(self):
        record = parse_frontmatter(STORY.format(status="DRAFT", approved_by="", approved_at=""))
        self.assertEqual(record["id"], "US-001")
        self.assertEqual(record["status"], "DRAFT")

    def test_draft_allowed_without_product_docs(self):
        self.assertEqual(check_repository(self.root), [])
        self.assertFalse(has_implementation_story(self.root))

    def test_ready_requires_product_docs_and_approval(self):
        self.write_story(status="READY", approved_by="", approved_at="")
        errors = check_repository(self.root)
        self.assertTrue(any("VISION.md" in e for e in errors))
        self.assertTrue(any("approved_by" in e for e in errors))

    def test_ready_after_human_fields_and_docs(self):
        self.write_docs()
        self.write_story()
        self.assertEqual(check_repository(self.root), [])

    def test_implementation_requires_plan_and_product_checks(self):
        self.write_docs()
        self.write_story(status="IN_PROGRESS")
        self.assertTrue(has_implementation_story(self.root))
        errors = check_repository(self.root)
        self.assertTrue(any("plan.md" in e for e in errors))
        self.assertTrue(any("project-verify.sh" in e for e in errors))


    def test_invalid_approval_date_rejected(self):
        self.write_docs()
        self.write_story(approved_at="next-week")
        self.assertTrue(any("approved_at" in e for e in check_repository(self.root)))

    def test_only_one_active_story(self):
        self.write_docs()
        self.write_story(status="IN_PROGRESS")
        other = STORY.replace("US-001", "US-002").format(
            status="IN_PROGRESS", approved_by="Product Owner", approved_at="2026-11-03"
        )
        (self.root / "backlog" / "US-002.md").write_text(other, encoding="utf-8")
        self.assertTrue(any("WIP limit" in e for e in check_repository(self.root)))

    def test_qa_requires_evidence(self):
        self.write_docs()
        self.write_story(status="QA_PASSED")
        errors = check_repository(self.root)
        self.assertTrue(any("evidence.md" in e for e in errors))

    def test_acceptance_metadata_required(self):
        self.write_docs()
        self.write_story(status="ACCEPTED")
        errors = check_repository(self.root)
        self.assertTrue(any("accepted_by" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
