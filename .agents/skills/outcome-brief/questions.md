# Territory to cover

Ground to cover in the interview, not a script. Skip anything the repo or
conversation already answers. Ask about what changes the build. Make every
question specific to their project, build it on their last answer, and attach
your recommended answer.

## Value (always, product brief)

| Area | Ask in this spirit | Why it matters |
|---|---|---|
| **Value** | "What value do we bring, to whom, and how?" | This becomes the value proposition (`V0`) |
| **For whom** | "Who gets that value? A named person, role or system, not 'users'." | A category can't be designed for |
| **Why now** | "What makes this worth doing now rather than later?" | Sets the appetite |
| **Smallest version** | "What's the smallest version that would already be worth having?" | Keeps the first build small |
| **Anti-goals** | "What would make this a failure even if it technically works?" | Catches the wrong solution early |
| **Future fit** | "As agents and tools improve, does this get more useful or less?" | Avoids building what's about to be free |

## Behaviour and proof (product brief)

| Area | Ask in this spirit |
|---|---|
| **Behaviour** | "Once it exists, what can people or systems do or see?" Propose the lines as observable, testable statements. |
| **Observable result** | "How would you notice it's working, without reading the code?" |
| **Edge cases** | "What should happen when it meets something unexpected (a clash, a conflict, a refusal)?" |

## Bounds and latitude (design brief)

| Area | Ask in this spirit |
|---|---|
| **Appetite** | "How much time or effort is this worth: an hour, a day, a week?" (Fixed time, flexible scope.) |
| **Constraints** | "What must stay true: tools, platforms, budgets, things not to touch?" |
| **Latitude** | "What should the agent decide on its own, and what should it check with you first?" |
| **Prior art** | "Anything you've seen that you liked or hated?" |

## How to ask

- Ask them to **describe value and behaviour first**, because options steer.
- For every **decision** (especially about how), give 2–3 real options with
  the evidence for each, then your recommendation.
- When they name an approach, thank them and carry it to the design brief,
  where it is weighed against alternatives.
- When they say "just guess" or "you decide", make a concrete proposal and
  record it in the brief as your call. That hands you the decision, not the
  approval: the brief still goes to them before anything is built.
- If the framing seems off, restate it: "It sounds like what you're really
  after is X. Does that capture it better?"
- Stop once the outcome brief can be filled without guessing. More questions
  past that point cost their time and add nothing.
