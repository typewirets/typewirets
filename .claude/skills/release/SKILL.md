---
name: release
description: Work out the next version of the typewirets packages and get the release ready, without publishing anything. Use when someone asks what version comes next, wants to cut, prepare or start a release, or types /release. It suggests a version from the commits since the latest version on npm, checks the changelogs for what commit titles miss, and hands over the Publish to npm dry run.
---

# Release: resolve the next version

**Outcome:** the person knows which version to release and why, the
changelogs are ready for it (or there is a PR that makes them ready), and
they have the exact dry-run step to start the **Publish to npm** workflow.
You suggest; the person picks. Never publish, tag, or change a
`package.json` version: the workflow does that (MAINTAINING.md, Releasing).

The three packages (`@typewirets/core`, `@typewirets/inversify`,
`@typewirets/react`) always share one version.

## Steps

1. **Get the suggestion.**
   ```bash
   git fetch --tags origin main
   node scripts/release.mjs suggest origin/main
   ```
   It reads the latest stable version on npm and rates every commit on
   `main` since its `v<version>` tag by Conventional Commits: `type!:` or a
   `BREAKING CHANGE:` footer is breaking, `feat:` is a feature, anything else
   is a patch. The strongest commit decides the bump. Below 1.0.0 a breaking
   change bumps the minor version (npm's `^0.1.0` already excludes 0.2.0);
   from 1.0.0 it bumps the major. It also reports each changelog's state.
   *Done when* you have the output. If it refuses because a tag is missing,
   fetch the tags and run it again.
2. **Check what commit titles miss.** Read `## Unreleased`, and any section
   the output marks "never published", in each package's `CHANGELOG.md`.
   Look for breaking changes a commit title didn't mark with `!`: a removed or
   renamed export, changed behaviour callers rely on, a raised
   `engines.node` or peer dependency range. Apply the same rule as step 1;
   the stronger impact wins. *Done when* every entry is rated, and you can
   name the entry behind any change to the suggestion.
3. **Pre-release, only if asked.** For a release candidate, use
   `<version>-rc.<n>`, where `n` is one more than the highest `rc` of that
   version on npm (`npm view @typewirets/core versions --json`; compare `n`
   as a number). It is published under the `next` dist-tag.
4. **Present it** in a few lines:
   - the version and bump, and the commits or changelog entries that decide it;
   - each package's changelog state;
   - the next steps below, with the version filled in.

   *Done when* the person has picked a version, or says they'll decide later.
5. **Get the changelogs ready** once they pick, if they aren't already. In
   each package's `CHANGELOG.md`, move the `## Unreleased` entries, and any
   never-published section, under `## <version>`. Every package gets the
   heading; one with no changes of its own gets "Depends on
   `@typewirets/core` <version>." (MAINTAINING.md, Release Checklist). Open
   it as a pull request (`create-pr`). *Done when* the PR is open, or the
   changelogs already have the heading.
6. **Hand over the release.** After the changelog PR merges, the person runs
   **Publish to npm** from the Actions tab on `main` with the version and
   **dry-run** checked (or
   `gh workflow run publish.yml -f version=<version> -f dry-run=true`), then
   again unchecked, and approves each package on npm. Don't start the run
   yourself unless they ask.

## Notes

- `scripts/release.test.mjs` tests the rating and bump rules
  (`pnpm test:scripts`). Change the rules there, not only in this file.
- The workflow refuses a version that isn't higher than npm's latest or
  lacks a changelog section, so a wrong pick fails safely at the dry run.
