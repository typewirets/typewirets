# Brief sections

Both briefs are html-for-humans pages: start from that skill's `template.html`
and follow its rules, especially *structure over paragraphs*. Below is **what
goes in each page**. Every item carries a stable ID, shown as visible text and
used as its anchor `id`, so builders, tests and reviews can cite it (`B2`,
`A1`).

**Citing from outside the project.** The project's slug (the folder name
without its date) is its key. Outside the project, cite an item as
`<slug>-<ID>`, like an issue key: `settings-page-B3`, `settings-page-Q2`.
From another repository, put the repository first:
`<repository>/settings-page-B3`. Show the key in each brief's metadata
(`Key: settings-page`), so a search for the reference finds the brief.

## Product brief: value and behaviour, nothing about how

| Section | ID | Content |
|---|---|---|
| **Takeaway** | — | One sentence: the value, and that the behaviour below delivers it. |
| **Value** | `V0`, `V1…` | `V0`: the value proposition, what value we bring, to whom, and how, in one or two sentences. `V1…`: a few value points, one short line each. |
| **Behaviour** | `B1…` | What people and systems can do or see once it exists. Observable, so a test can prove it. Group related lines (adopt, use, learn…) and show the groups in a small diagram. |

Rules:
- **Behaviour is the heart of the brief.** Write it as what happens ("a
  repository's agent applies the factory from one file"), never as an
  implementation ("a shell script copies the folder").
- **Nothing about how.** Tools, file layouts, install methods and approaches
  the person named go to the design brief, where they are weighed against
  alternatives.
- Short rows: put the edge case under the line as a note, not in the line.

## Design brief: how, with evidence

| Section | ID | Content |
|---|---|---|
| **Takeaway** | — | The recommended approach in one sentence, and why. |
| **Links** | — | The product brief it serves (path, plus the `B` lines it targets). |
| **Named approaches** | `M1…` | Each approach the person named, set against 1–2 alternatives with evidence: kept, changed or rejected, and why. |
| **Approaches** | `A1…` | 2–3 options: the smallest that delivers the behaviour, the long-term pick, and optionally a lateral one. Each with effort (S/M/L), risk, what it reuses and its evidence. A side-by-side table or option cards work well. |
| **Recommendation** | `R1` | The pick and the reason, tied to the value, behaviour and bounds. |
| **Shape** | — | A diagram of the main parts and how they connect, at box level, not file level. |
| **Bounds and latitude** | `N1…`, `L1…` | Appetite, constraints, not-now items and anti-goals; what the builder decides alone and what it checks first. When the builder can't meet a behaviour line, it says so and asks, rather than faking it or weakening a test. |
| **Agent's calls** | `C1…` | Anything you filled in yourself, each with its reason, for the person to check. |
| **Risks and rabbit holes** | `K1…` | What could eat time, and the timebox for each. |
| **Test plan** | `T1…` | Which unit or integration test proves each `B` line, and the one command that runs them locally and in CI. |
| **Open** | `Q1…` | Anything still undecided. Empty before building starts, unless the person accepts it. |
| **Left to the builder** | — | Decisions deliberately not made here. |

Rules:
- Stay at the level of shape and trade-offs. File paths and code are the
  builder's.
- Every `B` line from the product brief maps to at least one `T` item.
- Evidence means something checkable: a source, a fact from the repo, a
  measurement, or the person's own words. Mark confidence when it's thin.
