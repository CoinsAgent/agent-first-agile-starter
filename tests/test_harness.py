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

    def test_follow_on_story_uses_existing_lifecycle_gates(self):
        path = self.root / "backlog" / "US-001-01.md"
        content = STORY.replace("US-001", "US-001-01")
        path.write_text(content.format(status="DRAFT", approved_by="", approved_at=""))
        self.assertEqual(check_repository(self.root), [])
        path.write_text(content.format(status="READY", approved_by="", approved_at=""))
        errors = check_repository(self.root)
        self.assertTrue(any("US-001-01.md: human approved_by" in e for e in errors))
        self.write_docs()
        path.write_text(content.format(status="IN_PROGRESS", approved_by="Owner", approved_at="2026-11-04"))
        errors = check_repository(self.root)
        self.assertTrue(any("work/US-001-01/plan.md" in e for e in errors))
        self.assertTrue(has_implementation_story(self.root))

    def test_malformed_story_ids_are_rejected(self):
        for story_id in ("US-01", "US-001-1", "US-001-aa", "US-001-01-01"):
            with self.subTest(story_id=story_id):
                path = self.root / "backlog" / f"{story_id}.md"
                path.write_text(STORY.replace("US-001", story_id).format(
                    status="DRAFT", approved_by="", approved_at=""))
                self.assertTrue(any("story filename" in e for e in check_repository(self.root)))
                path.unlink()

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


    def write_execution_records(self, story_id="US-001", evidence_status="PASS"):
        work = self.root / "work" / story_id
        work.mkdir(parents=True, exist_ok=True)
        (work / "plan.md").write_text("Approved scope, implementation approach and real checks. " * 4)
        (self.root / "scripts/project-verify.sh").write_text("#!/bin/sh\npython3 -m unittest discover -s tests\n")
        (work / "evidence.md").write_text(
            f"Status: {evidence_status}\n## Acceptance matrix\nLocal fixture results.\n"
            "## Verification\nObserved commands and results; CI has not been requested.\n"
            "## Review\nFresh review completed.\n## Known limitations\nFixture only.\n")

    def test_verifying_is_rejected(self):
        self.write_docs()
        self.write_execution_records()
        self.write_story(status="VERIFYING")
        self.assertTrue(any("unknown status 'VERIFYING'" in e for e in check_repository(self.root)))

    def test_each_current_state_accepts_appropriate_records(self):
        self.write_docs()
        self.write_execution_records()
        for state in ("DRAFT", "READY", "IN_PROGRESS", "BLOCKED", "QA_PASSED", "ACCEPTED"):
            with self.subTest(state=state):
                self.write_story(status=state)
                if state == "ACCEPTED":
                    p = self.root / "backlog/US-001.md"
                    p.write_text(p.read_text().replace("accepted_by:\n", "accepted_by: Human merger\n")
                                 .replace("accepted_at:\n", "accepted_at: 2026-11-07\n"))
                self.assertEqual(check_repository(self.root), [])
                self.assertEqual(has_implementation_story(self.root), state not in {"DRAFT", "READY"})

    def test_wip_includes_qa_and_blocked_but_excludes_accepted(self):
        self.write_docs()
        self.write_execution_records()
        self.write_execution_records("US-002")
        other = self.root / "backlog/US-002.md"
        other.write_text(STORY.replace("US-001", "US-002").format(
            status="IN_PROGRESS", approved_by="Owner", approved_at="2026-11-07"))
        for state in ("IN_PROGRESS", "BLOCKED", "QA_PASSED", "ACCEPTED"):
            with self.subTest(state=state):
                self.write_story(status=state)
                if state == "ACCEPTED":
                    p = self.root / "backlog/US-001.md"
                    p.write_text(p.read_text().replace("accepted_by:\n", "accepted_by: Human merger\n")
                                 .replace("accepted_at:\n", "accepted_at: 2026-11-07\n"))
                errors = check_repository(self.root)
                self.assertEqual(any("WIP limit" in e for e in errors), state != "ACCEPTED")
                if state == "ACCEPTED":
                    self.assertEqual(errors, [])

    def test_local_qa_passes_without_ci_or_acceptance_metadata(self):
        self.write_docs()
        self.write_story(status="QA_PASSED")
        self.write_execution_records()
        self.assertEqual(check_repository(self.root), [])

    def test_qa_rejects_incomplete_or_nonpassing_evidence(self):
        self.write_docs()
        self.write_story(status="QA_PASSED")
        for status in ("FAIL", "IN_PROGRESS", "NOT_RUN"):
            with self.subTest(status=status):
                self.write_execution_records(evidence_status=status)
                self.assertTrue(any("evidence status must be PASS" in e for e in check_repository(self.root)))
        self.write_execution_records()
        p = self.root / "work/US-001/evidence.md"
        p.write_text(p.read_text() + "Required browser check: NOT_RUN\n")
        self.assertTrue(any("unresolved NOT_RUN" in e for e in check_repository(self.root)))
        self.write_execution_records()
        p.write_text(p.read_text().replace("## Review", "## Pending review"))
        self.assertTrue(any("evidence missing section ## Review" in e for e in check_repository(self.root)))

    def test_acceptance_fields_forbidden_before_accepted(self):
        self.write_docs()
        self.write_execution_records()
        for state in ("READY", "IN_PROGRESS", "BLOCKED", "QA_PASSED"):
            with self.subTest(state=state):
                self.write_story(status=state)
                p = self.root / "backlog/US-001.md"
                p.write_text(p.read_text().replace("accepted_by:\n", "accepted_by: Premature\n"))
                self.assertTrue(any("acceptance fields must remain blank" in e for e in check_repository(self.root)))


if __name__ == "__main__":
    unittest.main()
