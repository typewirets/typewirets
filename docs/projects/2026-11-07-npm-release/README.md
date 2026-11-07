# npm-release

The maintainer releases `@typewirets/core`, `@typewirets/inversify` and `@typewirets/react` from GitHub in one run, at one version. Each package goes live only after the maintainer approves it on npm with 2FA, and the tag and GitHub release follow. No npm token is stored anywhere.

- [product.html](product.html): value V0–V5, behaviour B1–B14. Status: draft, awaiting approval and answers to Q1–Q3.
- design.html: not started. Comes after the product brief is approved.

## Where things stand

- 2026-10-23: TypeWireTS never had automated publishing. 0.1.0 of each package was published by hand from the maintainer's npm account (no provenance), and the v0.1.0 GitHub release was made by hand. 0.1.1 was prepared (#16) but never published. The maintainer asked to replicate typewirepy's release flow: a manual `workflow_dispatch` that publishes with OIDC and creates the tag and GitHub release.
- 2026-10-23: npm facts, from npm's docs: classic tokens were removed in November 2025; direct publishing with granular tokens ends in January 2027; trusted publishing (OIDC) needs npm ≥ 11.5.1; staged publishing (`npm stage publish`, then the maintainer approves with 2FA) needs npm ≥ 11.15.0; a new trusted-publisher configuration expires unless used within 2 days.
- 2026-10-26: the maintainer chose staged publishing over a GitHub environment reviewer, and asked whether the run can wait for the npm approval.
- 2026-10-26: a first implementation was built before the factory was installed: `.github/workflows/publish.yml`, `scripts/release.mjs` and the "Releasing" section of MAINTAINING.md (PR #23, commit 90b8ee6 after rebasing onto main). Treat it as a prototype until the design brief picks an approach.
- 2026-11-07: rebased onto main (factory install #27, SHA pins #25, pinned corepack #26). Product brief drafted.

## Open, for the product brief (answer block in product.html)

- Q1. When the tag and GitHub release appear. Recommended: only after every package is live.
- Q2. Who picks the version. Recommended: the maintainer types it.
- Q3. What counts as done. Recommended: the next real release (likely 0.2.0) ships end to end.

## Open, for the design brief

- The prototype doesn't yet follow AGENTS.md: top-level `permissions` should start from `contents: read`; `persist-credentials: false` is missing on the staging checkout; pnpm should come from the pinned `corepack@0.36.0` install, as in `ci.yml`.
- How the run waits for approval (the prototype polls the public registry for up to 3 hours, and "Re-run failed jobs" resumes it), weighed against alternatives.
- Whether a rejected version number can be staged again (B14).
- The changelogs: main has `## Unreleased` entries above `## 0.1.1`, and 0.1.1 was never published.

## Next steps

1. The maintainer answers Q1–Q3 and approves the product brief.
2. Write design.html, with the prototype as the named approach weighed against alternatives, and a test plan that covers B1–B14.
3. Rework PR #23 to the picked design.
