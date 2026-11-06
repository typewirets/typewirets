# Visualization: choosing and drawing visuals that make the point

A visual exists to **answer the reader's question faster than a sentence
can**. Start from the question, then pick the form.

## 1. Pick the form from the question

| The reader wants to see… | Use | Avoid |
|---|---|---|
| how items compare | horizontal bar chart, sorted, shared zero baseline | pie, 3-D, unsorted bars |
| change over time | line chart (or a sparkline beside a number) | bars for long series |
| parts of a whole | one stacked or 100% bar; pie only for 2–3 parts | pie with 4+ slices |
| how values spread | histogram or dot/strip plot | an average alone |
| how two measures relate | scatter plot | two separate charts |
| a process or flow | boxes and arrows, left to right or top to bottom | prose paragraphs |
| a structure or hierarchy | tree or nested boxes | flat bullet lists |
| events in order | timeline | a table of dates |
| status of many items | table with colored status chips | a chart |
| before vs after, option A vs B | side by side, same scale, same order | two separate pages |
| exact values to look up | table, numbers right-aligned | a chart |
| one or two numbers | a sentence, or a big number with its context | any chart |

If no row fits, use a table.

## 2. Rules for drawing it

1. **One message per visual.** The title or caption states it as a sentence:
   "Search latency halved after the index change", not "Latency".
2. **Encode the important value with position or length.** People judge these
   most accurately, then angle and area, then color (Cleveland & McGill 1984).
   Use color for categories and status, not for magnitude you want read
   precisely.
3. **Label directly.** Put names at the ends of lines and values on or beside
   bars. Use a legend only when direct labels won't fit.
4. **Remove what carries no data:** heavy gridlines, borders, shadows,
   gradients, 3-D. A faint baseline and a few light reference lines are enough.
5. **Color with meaning.** Neutral for context, **one accent** for what the
   reader should look at, semantic colors (good / warning / bad) only for
   status. Never use red and green as the only difference, because color-blind
   readers can't tell them apart: add a label, an icon or a pattern.
6. **Scale honestly.** Bars start at zero. Charts placed side by side share a
   scale. State the units. Don't crop an axis to exaggerate a change.
7. **Keep sizes readable on a phone.** Text in visuals at least 12px, using
   SVG `viewBox` so it scales. Size the `viewBox` to the width the figure
   actually renders at (about 360 inside a padded figure on a 400px screen),
   or 12px text shrinks below 12px.
8. **Highlight what changed or matters.** In a long series, emphasize the
   latest point or the anomaly. In a comparison, emphasize the item the page
   is about.
9. **Give the text version.** Every `figure` has a `figcaption` with the
   message, plus the numbers in a table or `<details>`.
10. **A chart earns its place.** If a sentence says it as well, use the
    sentence.

## 3. Diagrams (flows, structures, timelines)

- Read left-to-right or top-to-bottom. Arrows point the way work moves.
- Group related boxes visually and label the group.
- Use at most about 7 boxes per diagram. Split anything bigger or show it
  zoomed out first.
- Keep box labels to a few words, with the detail in a caption or table below.
- Use solid lines for what happens and dashed lines for what's optional or
  proposed.

## 4. Inline SVG patterns (no libraries)

**Horizontal bar chart** (sorted, labelled, zero baseline):

```html
<figure>
  <svg viewBox="0 0 400 120" role="img" aria-labelledby="f1cap">
    <g font-size="12" fill="var(--fg)">
      <text x="0" y="22">Repo A</text>
      <rect x="80" y="10" width="260" height="16" fill="var(--accent)"/>
      <text x="346" y="22">65%</text>
      <text x="0" y="52">Repo B</text>
      <rect x="80" y="40" width="160" height="16" fill="var(--muted)"/>
      <text x="246" y="52">40%</text>
    </g>
    <line x1="80" y1="4" x2="80" y2="64" stroke="var(--line)"/>
  </svg>
  <figcaption id="f1cap"><b>Repo A passes 65% of checks, well ahead of Repo B.</b>
    <details><summary>Data</summary><table>…</table></details></figcaption>
</figure>
```

Compute each bar's length from one scale (`width = value / max * plotWidth`)
and keep every label inside the `viewBox`.

**Status chips** for many items: a table with a `<span class="chip ok|warn|bad">`
whose text says the status ("Passing", "Blocked"). Never rely on color alone.

## Sources

Cleveland & McGill (1984), *Graphical Perception*. Tufte (1983), *The Visual
Display of Quantitative Information*. Munzner (2014), *Visualization Analysis
and Design*.
