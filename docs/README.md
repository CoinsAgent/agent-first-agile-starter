# Human-owned product documents

The starter intentionally does **not** create `VISION.md` or `PRODUCT_CONTRACT.md` and does not invent a product.

When ready, write **both** files here:

## `VISION.md` (human owns)

Suggested headings: `Who we serve`, `Problem`, `Desired outcomes`, `Success signals`, `Non-goals`.

## `PRODUCT_CONTRACT.md` (human owns)

Suggested headings: `Product principles`, `Non-negotiable constraints`, `Trust and privacy boundaries`, `Out of scope`, `Decision authority`.

Codex may offer drafts or questions, but never assert a product decision is approved without the person's explicit approval. Product work cannot become `READY` until both files exist, are meaningful and have been reviewed by a human. Structural checks cannot prove genuine human approval: use Git branch protections and reviews.

## UI design principles

[UI_DESIGN_CONTRACT.md](UI_DESIGN_CONTRACT.md) is the reference for UI design principles, visual tokens, interaction patterns and accessibility requirements. Read it when shaping, implementing or reviewing UI work. Product/security rules and protocol correctness take precedence, followed by accessibility, then aesthetic preferences. Apply relevant requirements within approved story scope, record verification and deviations in the story's evidence, and raise scope conflicts for human decision. This reference does not make a story READY or establish human acceptance.

## Project structure before implementation

[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) is the single directory skeleton and code-placement reference. It distinguishes existing paths from proposed destinations, explains feature/shared/app responsibilities, and gives examples for UI, backend endpoints, browser API calls, tests and configuration. Read it before adding or updating code. Document and agree on new-area structure first; create only directories needed by approved real files. PROCESS and the delivery plan govern scope review. The guide documents local checks, exact-diff scope checking and the bootstrap/host requirements; passing local tests does not establish protected merging.

## From product intent to stories

After reviewing these documents, use `$shape-story` to map journeys, propose a
minimal usable end-to-end release, split it into DRAFT stories, and detail the
next story’s acceptance criteria. The map lives in `backlog/STORY_MAP.md`;
`backlog/STORY_MAP_TEMPLATE.md` provides its structure. Discovery may proceed
provisionally before product approval, but stories cannot become READY until
the product documents and the selected story are human-approved. See
[PROCESS.md](PROCESS.md) for ownership and delivery gates.
