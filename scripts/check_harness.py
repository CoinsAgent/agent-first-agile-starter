#!/usr/bin/env python3
"""Small zero-dependency structural gate for the Human/Agent story workflow.

This checks record *shape* and lifecycle coherence. It cannot authenticate
human approvals, review quality, or verify that self-reported evidence is true.
"""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
STORY_RE = re.compile(r"US-\d{3,}(?:-\d{2,})?\.md$")
STATES = {"DRAFT", "READY", "IN_PROGRESS", "VERIFYING", "BLOCKED", "QA_PASSED", "ACCEPTED"}
IMPLEMENTATION_STATES = {"IN_PROGRESS", "VERIFYING", "BLOCKED", "QA_PASSED", "ACCEPTED"}
WIP_STATES = {"IN_PROGRESS", "VERIFYING", "BLOCKED", "QA_PASSED"}
REQUIRED = (
    "AGENTS.md",
    "README.md",
    "docs/PROCESS.md",
    "backlog/STORY_TEMPLATE.md",
    "work/PLAN_TEMPLATE.md",
    "work/EVIDENCE_TEMPLATE.md",
    ".agents/skills/shape-story/SKILL.md",
    ".agents/skills/deliver-story/SKILL.md",
    "scripts/verify.sh",
)
FIELDS = ("id", "status", "approved_by", "approved_at", "accepted_by", "accepted_at")
HEADINGS = ("## User story", "## Acceptance criteria", "## Out of scope", "## Dependencies and risks")


def parse_frontmatter(content: str) -> dict[str, str]:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("missing opening --- front matter")
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration as exc:
        raise ValueError("missing closing --- front matter") from exc
    fields: dict[str, str] = {}
    for raw in lines[1:end]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if ":" not in raw:
            raise ValueError(f"invalid front matter entry: {raw!r}")
        key, value = raw.split(":", 1)
        key = key.strip()
        if key in fields:
            raise ValueError(f"duplicate field: {key}")
        fields[key] = value.strip().strip("\"'")
    return fields


def valid_date(value: str) -> bool:
    try:
        dt.date.fromisoformat(value)
        return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))
    except ValueError:
        return False


def story_paths(root: Path) -> list[Path]:
    return sorted((root / "backlog").glob("US-*.md"))


def has_implementation_story(root: Path) -> bool:
    for path in story_paths(root):
        try:
            state = parse_frontmatter(path.read_text(encoding="utf-8")).get("status", "")
        except (ValueError, OSError):
            return True  # fail closed on an unparsable story
        if state in IMPLEMENTATION_STATES:
            return True
    return False


def check_repository(root: Path) -> list[str]:
    errors: list[str] = []
    for file_name in REQUIRED:
        if not (root / file_name).is_file():
            errors.append(f"missing required harness file: {file_name}")

    paths = story_paths(root)
    active: list[str] = []
    for path in paths:
        rel = path.relative_to(root)
        if not STORY_RE.fullmatch(path.name):
            errors.append(f"{rel}: story filename must look like US-001.md or US-001-01.md")
            continue
        content = path.read_text(encoding="utf-8")
        try:
            meta = parse_frontmatter(content)
        except ValueError as exc:
            errors.append(f"{rel}: {exc}")
            continue
        for field in FIELDS:
            if field not in meta:
                errors.append(f"{rel}: missing metadata field {field}")

        story_id = path.stem
        if meta.get("id") != story_id:
            errors.append(f"{rel}: metadata id must match {story_id}")
        state = meta.get("status", "")
        if state not in STATES:
            errors.append(f"{rel}: unknown status {state!r}")
            continue
        if state in WIP_STATES:
            active.append(story_id)

        for heading in HEADINGS:
            if heading not in content:
                errors.append(f"{rel}: missing section {heading}")

        if state != "DRAFT":
            for product_doc in ("docs/VISION.md", "docs/PRODUCT_CONTRACT.md"):
                doc_path = root / product_doc
                if not doc_path.is_file() or len(doc_path.read_text(encoding="utf-8").strip()) < 50:
                    errors.append(f"{rel}: {product_doc} must contain human-approved product content")
            if not meta.get("approved_by"):
                errors.append(f"{rel}: human approved_by is required for {state}")
            if not valid_date(meta.get("approved_at", "")):
                errors.append(f"{rel}: approved_at must be YYYY-MM-DD for {state}")
            if not re.search(r"(?m)^-\s+(?:AC-\d+:|\*\*AC-\d+\*\*:)", content):
                errors.append(f"{rel}: must define at least one explicit AC-NN acceptance criterion")

        if state == "ACCEPTED":
            if not meta.get("accepted_by"):
                errors.append(f"{rel}: human accepted_by is required")
            if not valid_date(meta.get("accepted_at", "")):
                errors.append(f"{rel}: accepted_at must be YYYY-MM-DD")
        elif meta.get("accepted_by") or meta.get("accepted_at"):
            errors.append(f"{rel}: acceptance fields must remain blank until ACCEPTED")

        if state in IMPLEMENTATION_STATES:
            plan = root / "work" / story_id / "plan.md"
            if not plan.is_file() or len(plan.read_text(encoding="utf-8").strip()) < 80:
                errors.append(f"{rel}: missing substantive work/{story_id}/plan.md")
            if not (root / "scripts/project-verify.sh").is_file():
                errors.append(f"{rel}: product verification script scripts/project-verify.sh is required")

        if state in {"QA_PASSED", "ACCEPTED"}:
            evidence = root / "work" / story_id / "evidence.md"
            if not evidence.is_file():
                errors.append(f"{rel}: missing work/{story_id}/evidence.md")
            else:
                record = evidence.read_text(encoding="utf-8")
                if not re.search(r"(?m)^Status:\s*PASS\s*$", record):
                    errors.append(f"{rel}: evidence status must be PASS")
                for section in ("## Acceptance matrix", "## Verification", "## Review", "## Known limitations"):
                    if section not in record:
                        errors.append(f"{rel}: evidence missing section {section}")
                if "NOT_RUN" in record:
                    errors.append(f"{rel}: evidence contains unresolved NOT_RUN markers")

    if len(active) > 1:
        errors.append("WIP limit exceeded (max 1): " + ", ".join(active))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--needs-product", action="store_true", help="exit 0 if product tests are required, 1 otherwise")
    parser.add_argument("--root", type=Path, default=ROOT, help="repository root (for testing)")
    args = parser.parse_args()
    if args.needs_product:
        return 0 if has_implementation_story(args.root) else 1
    errors = check_repository(args.root)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    paths = story_paths(args.root)
    print(f"Harness state valid: {len(paths)} story file(s) checked. This is not product acceptance.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
