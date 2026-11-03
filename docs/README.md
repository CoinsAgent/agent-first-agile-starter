# Human-owned product documents

The starter intentionally does **not** create `VISION.md` or `PRODUCT_CONTRACT.md` and does not invent a product.

When ready, write **both** files here:

## `VISION.md` (human owns)

Suggested headings: `Who we serve`, `Problem`, `Desired outcomes`, `Success signals`, `Non-goals`.

## `PRODUCT_CONTRACT.md` (human owns)

Suggested headings: `Product principles`, `Non-negotiable constraints`, `Trust and privacy boundaries`, `Out of scope`, `Decision authority`.

Codex may offer drafts or questions, but never assert a product decision is approved without the person's explicit approval. Product work cannot become `READY` until both files exist, are meaningful and have been reviewed by a human. Structural checks cannot prove genuine human approval: use Git branch protections and reviews.

## From product intent to stories

After reviewing these documents, use `$shape-story` to map journeys, propose a
minimal usable end-to-end release, split it into DRAFT stories, and detail the
next story’s acceptance criteria. The map lives in `backlog/STORY_MAP.md`;
`backlog/STORY_MAP_TEMPLATE.md` provides its structure. Discovery may proceed
provisionally before product approval, but stories cannot become READY until
the product documents and the selected story are human-approved. See
[PROCESS.md](PROCESS.md) for ownership and delivery gates.
