---
name: outcome-brief
description: Turn what a person wants into a clear brief before any real work starts, by interviewing them, writing a product brief (the value we bring and the behaviour that delivers it), then drafting a design brief that weighs alternatives with evidence. Use when someone asks for something to be built, changed or decided and the intent isn't fully clear yet, or when they ask for a brief, spec, plan or "let's think this through". The brief states the goal, not the steps, so the building agent is free to choose the path.
---

# Outcome brief

Your job is to understand **what the person wants and why** well enough that
an agent could build it without coming back to them, and then to write that
down. A brief states the **outcome**, not the steps. The builder chooses the
path, because agents keep getting better and prescribed steps go stale.

You produce up to two HTML pages, written with the **html-for-humans** skill:

| Brief | Answers | Written by |
|---|---|---|
| **Product brief** | The value we bring, and the behaviour that delivers it. Nothing about how | you, from the interview; approved by the person |
| **Design brief** | How to get there: alternatives with evidence, the pick, bounds, risks, test plan | you, after the product brief is approved; the person picks the option |

Keep the two apart. A product brief that names tools, install methods or file
layouts has started designing too early.

## Steps

1. **Triage.** Check what you already know against the product brief's
   sections ([brief-sections.md](brief-sections.md)).
   - **Everything that matters is already stated**, and the work is small: say
     back the value and the behaviour in two lines, then do the work. No
     files.
   - **Something that would change what gets built is missing:** carry on with
     step 2.

   *Done when* you've decided between the two in one sentence.
2. **Look before asking.** Read what the person pointed at, the repo's
   AGENTS.md, related code, earlier briefs and any research the repo holds.
   Facts are your job; the person only makes decisions. *Done when* you can
   describe the current state, what the change would touch, and what evidence
   exists for the choices ahead.
3. **Interview in rounds.** Keep a list of open decisions. Each round, ask only
   the ones whose prerequisites are settled, numbered. For each decision, show
   **2–3 real options, the evidence for each** (a source, a fact from the
   repo, or the person's own words) and **your recommendation**, worded so
   "yes" accepts it. A question with one option is a statement in disguise.
   Use the questions in [questions.md](questions.md) as territory to cover,
   never as a script. Ask them to describe the value and behaviour in their own
   words before offering options.
   - For more than three questions, or on a phone, send the round as an
     html-for-humans page with an answer block.
   - Each answer reshapes the list: drop what it settled, and add what it
     opened.
   - When the person names an approach ("use a script", "keep it per repo"),
     note it for the design brief. Don't settle it in the interview, and never
     copy it into a brief untested.

   *Done when* every section of the product brief can be filled without
   guessing.
4. **Play back.** Describe your understanding in a few short chunks. Mark what
   they said as theirs, and anything you filled in as **your proposal, with
   your reason**. Ask what's wrong or missing. *Done when* they confirm, or
   their corrections are folded in.
   - **They leave it to you** ("you decide", "your call", "whatever you
     think"): take your recommendations, then go straight to step 5. Write
     the brief with those choices marked as your calls, and let the brief
     itself be the playback. They have handed you the decisions, not the
     approval.
5. **Write the product brief** as an html-for-humans page, using the sections
   and stable IDs in [brief-sections.md](brief-sections.md). It has two parts
   only:
   - **Value:** one value proposition (what value we bring, to whom, and how),
     plus a few value points. It must still read true under a completely
     different implementation.
   - **Behaviour:** what people and systems can do or see once it exists. Each
     line is observable, so a unit or integration test can prove it, runnable
     locally and in CI. Group the lines when there are many.

   Bounds, latitude, approaches the person named, your own calls and open
   questions belong to the design brief.
   [example-outcome-brief.html](example-outcome-brief.html) shows a filled
   product brief. *Done when* both parts are filled.
6. **Reader test.** Give **only the brief** to a fresh agent (a subagent, or a
   new session) and ask it what it would need to know to build this. Sort its
   questions:
   - **Already answered** by the conversation or the repo: add the answer to
     the brief.
   - **About how:** note it for the design brief.
   - **Theirs:** only the person can answer it, and the answer changes what gets
     built. Bring these back in one message.

   Without a way to start a fresh agent, reread the brief as a stranger would.
   *Done when* the "theirs" list is answered and the brief is updated.
7. **Approval gate.** Hand over the product brief and ask for approval, then
   stop: end your turn. Nothing gets built before approval: no product code,
   scaffolding or dependency installs. Reading and small throwaway spikes
   they agree to are fine.
   - **Approval** is a yes to the brief they have seen ("approved", "looks
     good, build it"), or an explicit "skip the brief, just build it".
   - **Not approval:** answers to your questions, "you decide", "go with your
     picks", or any reply given before they have seen the brief. Fold those
     into the brief and ask again.

   *Done when* they approve the brief they have seen, or tell you to skip it.
8. **Draft the design brief** as a second html-for-humans page:
   - **Named approaches first**: each approach the person named, weighed
     against 1–2 alternatives with evidence. Keep what was rejected and why.
   - **2–3 approaches** overall: the smallest version that delivers the
     behaviour, the approach you'd pick for the long term, and optionally a
     lateral one. Each with effort, risk, what it reuses, and its evidence.
   - **Your recommendation**, and why, tied to the value and behaviour.
   - **Bounds and latitude**: appetite, constraints, what the builder decides
     alone and what it checks first. Your calls, each with its reason. Open
     questions.
   - **Risks and rabbit holes**: the parts that could eat time, and how to
     timebox them.
   - **Test plan**: which unit and integration tests prove each behaviour
     line, and the one command that runs them locally and in CI. If the repo
     lacks that command, adding it is part of the plan.

   Leave out file-by-file instructions; the builder decides those. *Done when*
   they pick an approach.
9. **Hand off.** The builder starts from the two briefs in a fresh context,
   because the interview's detours are noise for building. The work is done
   when every behaviour line has a passing test, locally and in CI.
   - **The bounds are the only stops.** The builder checks with the person
     only at what the bounds list as "checks first", for a choice that would
     change the product brief, or for something only the person can give.
     A check that can't run isn't a stop: it says so and ships a draft.
     Everything else is already
     approved: committing, pushing its branch, opening pull requests, and
     moving from one stage to the next. Between stages it updates the state
     file and keeps going; it doesn't ask leave to continue.

## Where the briefs live

Briefs are durable: commit them in the project's folder. The repo's AGENTS.md
can set the place with a `projects` setting; without one, use
`docs/projects/YYYY-MM-DD-<slug>/`. The slug is the project's key, so it
must be new: check that no folder there already ends in `-<slug>`, and pick
another if one does. Items are cited from outside as `<slug>-<ID>`
(`settings-page-B3`; see [brief-sections.md](brief-sections.md)). A project
folder holds `product.html`,
`design.html` and a `README.md` state file (where things stand, open
questions, next steps), so any fresh session can resume from files alone.
Each brief is HTML only, with no Markdown twin, and readable by both people
and agents.

## Size it

| The ask | What you produce |
|---|---|
| Small and clear | two lines in chat, then work |
| Small but open in one spot | one or two questions, a short product brief in chat |
| A real piece of work | both briefs as pages |
| Several independent pieces | say so, agree the order, one brief each |

If it grows mid-way, say so and step up a size.

## Improving this skill

After the work ships, or when the person corrects a brief, note:
- **Which questions changed what got built.** Keep those, and move them earlier
  in [questions.md](questions.md).
- **Which questions changed nothing.** Cut or demote those.
- **Gaps that caused rework later.** Add a question or a section.

Propose these as edits to this skill in the same change, for human review.
