# Writing the PR title and description

Distilled from Google's guide to CL descriptions, the Linux kernel's and
git's patch guidelines, Conventional Commits 1.0.0, GitHub's squash-merge
behaviour and Sentry's `pr-writer` skill.

The one idea behind all of them: **a PR is a permanent public record.** The
title becomes the commit subject when the PR is squash-merged, and people
search history by it for years. The description is a cover note for the
reviewer, and later for whoever wonders why the code is the way it is.

## Title

**Rules**

1. **Say specifically what the change does**, so it stands alone in a list of
   titles. "Fix bug", "Update docs", "Phase 1", "Address feedback" fail this.
2. **Imperative mood**, as an order to the codebase: "Add", "Remove",
   "Record", not "Added", "Adds", "Adding".
3. **Short:** aim for 50–60 characters, hard stop at 72. Put the most
   telling word first, since lists and phones cut the end off.
4. **No trailing period**, no "WIP", no emoji, no bare issue number.
5. **Describe the whole branch**, not the last commit. Several unrelated
   changes in one PR is a sign it should be split; if you can't split it,
   name the main change and list the rest in the body.
6. **Follow the repo's pattern.** Look at the last ~20 merged titles:
   - Most are `type(scope): subject` → use
     [Conventional Commits](#conventional-commits).
   - Most are `Area: subject` → keep the area word the repo already uses
     (`Search:`, `Docs:`, `CLI:`); at most one short prefix.
   - No pattern → a plain imperative sentence.

**Good and bad**

| Bad | Why | Better |
|---|---|---|
| Fix bug | Which bug? What did you do? | Stop the search index rebuilding on every `list` call |
| Updates | Says nothing | Add create-pr skill for opening PRs without asking |
| Adding retry logic to the client and also fixing the README | Gerund, two topics, too long | Client: retry idempotent requests on 503 |
| feat: stuff. | Vague, trailing period | feat(search): rank title matches above body matches |

### Conventional Commits

Only when the repo already uses it. Format `<type>(<scope>): <subject>`,
lower-case type, scope optional. Common types: `feat` (new behaviour), `fix`
(bug), `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
Pick the narrowest type that fits the dominant change. Add `!` after the
type or scope **only** for a breaking change to something others rely on,
and explain the break and the migration in the body.

## Body

**Order: what, then why, then only what helps review.**

1. **What changed and what it does**, in one or two sentences. Lead with the
   effect on the reader or user, not the implementation.
2. **Why.** The problem or request behind it, and context that isn't in the
   code: choices a reviewer would question, alternatives you rejected.
3. **Only if it applies**, each as a short line or paragraph:
   - risk, trade-offs or known shortcomings (with numbers, if you claim a
     speed or size gain);
   - breaking changes and how to migrate;
   - where to start reviewing, or what to look at closely;
   - what is deliberately left for later;
   - how it was checked, but only when that changes how risky it looks.
4. **Links:** `Fixes #N` closes an issue, `Refs #N` only links it. Use
   references you have verified. A link to a review page is fine; summarise
   what it says too, since links rot.
5. **Footer** lines your harness requires, verbatim, last.

**Default shape** (small or medium change, no repo template):

```markdown
<What changed and what it does, in one or two sentences.>

<Why: the problem or request behind it, and any choice a reviewer would question.>

**Look at:** <where to start or what to check closely>   ← optional
**Not done:** <follow-ups left on purpose>                ← optional
```

Scale it to the change: a one-line fix gets one sentence; a breaking change
gets a before/after example and migration steps. A small table, diagram or
before/after is welcome when it saves the reviewer reconstructing something.

**Leave out**

- Boilerplate headings (`Summary`, `Changes`, `Test plan`) that the repo
  doesn't ask for, and empty template sections.
- Commit lists, CI logs, command output, exhaustive file lists.
- The story of the session or the review rounds ("v2: addressed comments").
  On a refresh, describe the PR as it is now.
- Secrets, tokens, internal hostnames, private data about anyone.
- Anything that needs another link to make sense; the description should
  stand on its own.

## Checklist before you open it

- [ ] Title is imperative, specific, ≤72 characters, no trailing period, and
      matches the repo's pattern.
- [ ] Title and body describe the **whole** diff against the base.
- [ ] Body opens with what changed, then why.
- [ ] Every claim (issue numbers, numbers, "tested") is true and checked.
- [ ] Nothing in it the reader couldn't understand without opening a link.
- [ ] Harness footer present, if one is required.
- [ ] Readable on a phone: short paragraphs, nothing wider than a small table.
