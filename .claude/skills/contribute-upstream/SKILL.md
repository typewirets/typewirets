---
name: contribute-upstream
description: Offer to send a lesson this repository learned back to the software factory, as one GitHub issue, asking the person before each one. Use every time a lesson would hold in any repository (about how agents work, not about this code): after a retro, and for each later lesson in the same session, in the reply that records it. Also when the person asks to send feedback or a lesson to the factory. Installed only in repositories that opted in.
---

# contribute-upstream: one lesson, one issue, only with a yes

**Outcome:** the person decided, for this lesson, whether it goes to the
factory. On a yes, exactly one issue exists on the factory's repository,
written so it holds anywhere and carries nothing private to this
repository. On a no, nothing was sent.

## Steps

1. **Check the setting.** The factory settings table in `AGENTS.md` must say
   `upstream: yes`. If it says anything else, stop and say nothing about
   sending lessons.
2. **Draft the lesson** using the factory's lesson layout: what happened,
   the lesson in one or two sentences, the change you'd propose to the
   factory (which skill, guide or rule, and what it would say), and the
   factory version from `.agents/factory/manifest.json`.
   - **Strip everything private to this repository:** its name, people's
     names, company or product names, file paths, code, URLs, and anything
     the person called confidential. Describe the situation in general
     terms ("a repository with a frozen folder").
3. **Ask, every time.** Show the person the full draft and ask: "Send this
   lesson to the factory as an issue?" Wait for the answer. A previous yes
   doesn't cover this lesson.
4. **On yes:** open one issue on `rexk/soft-factorio` with the `lesson`
   label, with the GitHub route your harness has (for example
   `gh issue create --repo rexk/soft-factorio --title "<lesson>" --label lesson --body-file <file>`),
   and give the person the link. If the label is refused, open it without.
   **On no:** send nothing, and don't ask again for this lesson.

## Never

- Send without a yes to this exact draft.
- Send more than one issue per lesson, or bundle several lessons.
- Include anything you removed in step 2, even in a code block or a link.
