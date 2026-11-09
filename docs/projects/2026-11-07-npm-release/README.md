# npm-release

The maintainer releases `@typewirets/core`, `@typewirets/inversify` and `@typewirets/react` from GitHub in one run, at one version. Each package goes live only after the maintainer approves it on npm with 2FA, and the tag and GitHub release follow. No npm token is stored anywhere.

- [product.html](product.html): value V0–V6, behaviour B1–B16. Status: done 2026-11-08 (0.2.0 released end to end); approved 2026-11-07 with Q1 A (tag and release only once all are live), Q2 A (the maintainer types the version; npm guards it), Q3 A (done when the next real release ships end to end).
- [design.html](design.html): approaches M1–M3, A1–A3; picked A1 (one workflow plus a plan step); calls C1–C5; test plan T1–T18. Status: A1 built 2026-11-07, after the maintainer's "go ahead and implement".

## Where things stand

- 2026-10-23: TypeWireTS never had automated publishing. 0.1.0 of each package was published by hand from the maintainer's npm account (no provenance), and the v0.1.0 GitHub release was made by hand. 0.1.1 was prepared (#16) but never published. The maintainer asked to replicate typewirepy's release flow: a manual `workflow_dispatch` that publishes with OIDC and creates the tag and GitHub release.
- 2026-10-23: npm facts, from npm's docs: classic tokens were removed in November 2025; direct publishing with granular tokens ends in January 2027; trusted publishing (OIDC) needs npm ≥ 11.5.1; staged publishing (`npm stage publish`, then the maintainer approves with 2FA) needs npm ≥ 11.15.0; a new trusted-publisher configuration expires unless used within 2 days.
- 2026-10-26: the maintainer chose staged publishing over a GitHub environment reviewer, and asked whether the run can wait for the npm approval.
- 2026-10-26: a first implementation was built before the factory was installed: `.github/workflows/publish.yml`, `scripts/release.mjs` and the "Releasing" section of MAINTAINING.md (PR #23, commit 90b8ee6 after rebasing onto main). Treat it as a prototype until the design brief picks an approach.
- 2026-11-07: rebased onto main (factory install #27, SHA pins #25, pinned corepack #26). Product brief drafted.
- 2026-11-07: the maintainer wants no release commits on `main`: package versions stay a placeholder, and the version comes from the run, checked against what npm already has (V6, B16, B3, B2, Q2 reworked). The changelog heading for a version is still written beforehand in an ordinary PR; releasing straight from `## Unreleased` would leave `main`'s changelog without versions.
- 2026-11-07: an unapproved release must be recoverable (B14), and a partly approved one must be completable at the same version (B15), because the packages ship together.
- 2026-11-07: the maintainer keeps Node 22 in CI and the pinned Corepack from #26; PR #19 (Node 24 minimum, pnpm 12) is theirs to revisit separately.
- 2026-11-07: product brief approved. Built A1 on PR #23: `scripts/release.mjs` plans each release from npm, git tags, changelogs and provenance; `scripts/release.test.mjs` covers the rules (`pnpm test:scripts`, also in CI); `publish.yml` now follows AGENTS.md. Finishing a partly live release is allowed only from the commit its live packages were built from (C1).
- 2026-11-07: the maintainer noted Q3 can only be met after merging: a workflow can only be dispatched from `main`.
- 2026-11-07: after a code review, the maintainer asked for all seven findings to be fixed: building and packing moved to a job without the npm token, and the job that holds it runs no repository or dependency code (C5); dry runs no longer share the release's concurrency group; the wait job ends with a clear message before its timeout, including after a rejection; the tag is checked again right before it is created; npm's abbreviated metadata; one shared package list (`scripts/workspace-packages.mjs`); named parameters for multi-argument exports.
- 2026-11-07: the maintainer asked for a skill that resolves the version. Added `.agents/skills/release` (copied to `.claude/skills/release`) and `node scripts/release.mjs suggest [ref]`: it rates commits since the latest version on npm by Conventional Commits, below 1.0.0 a breaking change bumps the minor version (agent's call), and it flags changelog sections that were never published (today: `## 0.1.1`). It suggests 0.2.0 for `main` today. The workflow still takes the typed version (Q2 A).
- 2026-11-08: the first release through the workflow worked end to end: `0.2.0-rc.1` (#36 prepared the changelogs). All three packages went live under `next` after the maintainer approved each stage on npm; `latest` stays 0.1.0. Each has provenance naming commit 47da5e0, the adapters pin `@typewirets/core` to exactly 0.2.0-rc.1, and the workflow created the `v0.2.0-rc.1` tag on that commit and a pre-release with notes from the changelogs. On npm's trusted-publisher form, staging is always allowed and the only options are "Allow npm publish" and "Allow npm dist-tag", both left off. No npm token or GitHub secret is used.
- 2026-11-08: 0.2.0 released through the workflow (#37 prepared the changelogs; dry run, then the real run). All three packages are npm's `latest` at 0.2.0, with provenance naming aac33c8, the commit `v0.2.0` points at; the adapters pin `@typewirets/core` to exactly 0.2.0, and the GitHub release is the repository's latest. Q3 is met: the next real release shipped end to end. Done.

## Open

- Q4 (accepted): npm unknowns, settled on the first real release: whether a staged package expires; whether npm accepts a new stage of a version while an old one is pending; whether a first stage that is never approved counts as the "first successful publish" that keeps a new trusted-publisher configuration from expiring after 2 days.
- Which version goes first: `main` has `## Unreleased` above `## 0.1.1`, and 0.1.1 was never published. Settle it in the changelog PR.

## Next steps

1. On npm, set each package's publishing access to "Require two-factor authentication and disallow tokens", and revoke npm tokens no longer used.
2. Note any answer to Q4 when it shows up (stage expiry, re-staging a pending version).
