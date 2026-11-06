---
name: html-for-humans
description: Write a self-contained HTML page instead of a long chat reply. Use it whenever your answer would run past one screen or need sections, such as a report, a review, the status or health of a project or repository, an explainer, a comparison, a brief, or a decision with options to choose from. The page reads at a glance on a phone, uses visuals that make the point faster, and can collect the person's answer. Other agents read the same file, so it is built for both.
---

# HTML for humans

A page is how you **tell, show, ask or agree** with a person when chat is too
thin. One file serves two readers: the human, who skims it on a phone, and any
agent that reads it later. Write for both every time.

**Page or chat?** Ask: *would they understand this faster by seeing it than by
reading it?* A short answer stays in chat. Anything with structure, comparison,
flow, options or more than a screen of content becomes a page.

## Steps

1. **Name the takeaway.** Write the one sentence the reader should leave with,
   and the question they're trying to answer. *Done when* you can say both in
   one line each.
2. **Choose where it lives.**
   - **Durable** (briefs, decisions, anything that's part of the record): commit
     it next to the work it belongs to.
   - **Throwaway** (reviews, status, a look at the moment): scratch or temp
     space, kept out of the repo.

   *Done when* the path is chosen.
3. **Outline by questions.** Lead with the takeaway. Each section answers one
   sub-question the reader will have. For each section, pick its form: a
   sentence, a table, or a visual. Use [visualization.md](visualization.md) to
   choose. *Done when* every section has one form and one reason.
4. **Write the page** from [template.html](template.html), following the rules
   below. *Done when* every section is filled with real content.
5. **Add an answer block** if the page asks the person anything (see below).
6. **Check it** against the checklist at the end. *Done when* every item passes.
7. **Hand it over.** Give the path or link the way your harness allows (open
   it, publish it, or print the absolute path) plus a one-line summary in chat.

## Rules for the two readers

**For the human**
- The point comes first: a takeaway box at the top states the conclusion.
- Short, plain sentences in active voice, with no jargon they didn't use first.
  Write the way a knowledgeable colleague talks.
- A visual wherever it explains faster than prose, chosen with
  [visualization.md](visualization.md).
- **Structure over paragraphs.** Each section opens with a table, diagram
  or bullets. No paragraph runs past three lines on a phone. Short
  sentences strung into paragraphs still read as a wall.
- **Cards only for choices.** A row of cards suits options the reader picks
  from. Short facts or points go in a table or plain sentences; as cards
  they read like a carousel.
- **A look that fits the subject.** The template's tokens are a neutral
  default. Swap the palette and type stack for ones that suit the subject
  (still no external requests), and keep every color a token.
- Phone first: about 400px wide, comfortable to read in both light and dark
  themes.

**For agents**
- Semantic structure: one `h1`, `section`s with `h2`s, real `table`s, `ol`/`ul`
  for lists, `figure` + `figcaption` for visuals.
- Stable IDs on anything another document will cite: an anchor `id` plus the
  same ID as visible text (`<li id="r3"><b>R3.</b> …</li>`).
- Metadata as visible text in the header (date, author, source, status), one
  copy only.
- A footer that says when the page was composed, by what, and from which inputs.

**For both**
- **Every visual carries its meaning in text too:** a `figcaption` that states
  the takeaway, plus the underlying values in a table or a `<details>` block.
  An agent that never renders the page should lose nothing.
- **One self-contained file:** inline CSS and inline SVG, no external
  requests, no build step.
- Interactivity (tabs, toggles, filters) reveals more detail. The first screen,
  before any clicks, tells the whole story.

## Answer block

When the page asks something (pick an option, approve, rank, fill gaps), end it
with an **answer block**: the page's inputs assemble a short plain-text answer,
and one tap copies it so the person can paste it back into the chat. It works
in any harness with no server. The template includes one.

- Keep the questions few, each with your **recommended answer preselected**.
- The assembled text must make sense on its own (`Q1: B — reason…`), because it
  arrives without the page.
- If your harness has a live channel back from the page, you can use it as
  well, but the copyable answer stays as the fallback.

## Checklist

- [ ] The title states the takeaway, not just the topic.
- [ ] The takeaway box is the first thing on the page.
- [ ] Every visual has a caption with its message and its data in text.
- [ ] Every visual is the form [visualization.md](visualization.md) picks for
      its question.
- [ ] Every section opens with a table, diagram or bullets; no paragraph
      over three lines at 400px. Cards appear only for choices.
- [ ] Nothing scrolls sideways at 400px. Wide tables and diagrams scroll inside
      their own box.
- [ ] Readable in both light and dark themes, with colors coming from the
      template's tokens, following a viewer's own theme setting too.
- [ ] You **looked** at the rendered page (a screenshot or preview) in both
      themes, not only measured it. A missing `>` in the head can turn the
      whole page into raw CSS while every size check passes.
- [ ] No external requests (fonts, scripts, images, CSS).
- [ ] Stable IDs are visible, and metadata appears once, as text.
- [ ] The footer names the date, the author agent and the inputs.
- [ ] If the page asks something: the answer block works, and each question has
      a recommendation.

## Improving this skill

When the person corrects how a page reads or looks ("too long", "show me the
trend", "I couldn't find the decision"), fix the page, then decide whether the
lesson generalizes. If it does, propose an edit to this skill or
[visualization.md](visualization.md) in the same change, for human review. A
lesson that can be checked mechanically goes into the checklist.
