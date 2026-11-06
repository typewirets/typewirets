---
name: retro
description: Turn each correction the person makes into a reviewable fix to this repository's tests, rules or skills, and keep a Lessons table of them. Trigger AUTOMATICALLY, with no command, the moment the person corrects you (tells you something was wrong, undoes or redoes your work, or repeats an instruction you missed), and again when that task ends ("that's it", "done", "thanks"). Also whenever the person asks for a retro, a lessons-learned or "what should we change so this doesn't happen again".
---

# retro: lessons into fixes, reviewed like code

**Outcome:** every correction the person made in this session is named, and
each one that could recur has a proposed fix in the right place, as a change
the person can review (a pull request, or a commit on a branch). Nothing is
fixed silently, and nothing is filed only as a note.

## At each correction

Fix what they asked, then in the same reply add a row to a **Lessons** table
with these columns:

| Correction (their words) | Cause | Fix: test, rule, skill or nothing | Why this stops it recurring |
|---|---|---|---|

Name the kind of fix and its file. In the last column, say why that place is
enough: for a test alone, why no rule is needed; for "nothing", why it was a
one-off. Every request to add, change or undo something gets a row, even one
you think your work already covered: then the row says what was already
there and why. Keep the same table in the open pull request's description,
updated each time. Then, at the end of the task, run the steps below over the
whole session.

## When the task ends

1. **List the corrections.** Go back through the session and write down
   each time the person corrected you: what you did, what they wanted, and
   their words. Count even small ones. *Done when* every correction is on
   the list, each in one line.
2. **Find the cause of each.** Why did you get it wrong? Pick one:
   | Cause | Where the fix goes |
   |---|---|
   | The code allowed a wrong result, and a test would have caught it | **a test** that fails on the wrong behaviour |
   | A repository rule or convention you couldn't have inferred | **a rule**: one line in `AGENTS.md`, outside the factory block |
   | A skill told you to do it, or left the case out | **a skill**: an edit to that skill's `SKILL.md` |
   | A one-off: a typo, a misread the person already fixed | **nothing**; say so |
   *Done when* each correction has a cause and a place.
3. **Write each fix** as a small change in that place, the way the
   repository's own guides say: a test through the public behaviour, a rule
   in one imperative line, a skill edit that names the case. Keep each fix
   separate in its own commit, so the person can take some and drop others.
   *Done when* every fix is written and the repository's checks still pass.
4. **Hand it over for review.** Put the fixes on a branch and open one pull
   request (`create-pr`) titled for the lessons, or add them to the task's
   open pull request, with the Lessons table above. End your reply with the same table, even if every fix
   already landed during the task: the table is how the person sees what
   will change. *Done when* the person has the link and the table.
5. **Upstream, only if this repository opted in.** If the factory settings
   in `AGENTS.md` say `upstream: yes` and a lesson would hold in any
   repository (it's about how agents work, not about this code), hand that
   lesson to the `contribute-upstream` skill, which asks the person first.
   If the setting is `no`, or missing, never mention sending lessons
   anywhere. This holds for every lesson, including ones the person gives
   after you've run the retro: offer each as it comes, in the same reply
   that records it.

## Rules

- Quote the person's corrections; don't soften or reinterpret them.
- One correction, one fix. Don't bundle unrelated changes into a fix.
- Never edit inside the `soft-factorio` marked block in `AGENTS.md`; a lesson
  about the factory's own rules is an upstream lesson.
