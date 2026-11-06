# Prompting for outcomes

When you hand work to another agent (a sub-agent, a new session, a task
for someone else's tool), say **what done looks like and why it matters**,
not the steps to get there. The other agent may know a better path, and
steps you prescribe go stale as agents improve.

## What a hand-off holds

| Part | Say | Example |
|---|---|---|
| **Value** | Why this matters, and to whom | "Reviewers need to know whether this change can break existing callers." |
| **Finish line** | What done looks like, and how you'll check it | "A list of every public function whose behaviour changed, each with one line on what a caller would notice. Empty if none." |
| **Context it lacks** | Facts it can't find quickly: the goal behind the task, decisions already made, where to look | "The change is on branch `x`; the public API is whatever `__init__.py` exports." |
| **Bounds** | What not to touch, time or cost limits, when to stop and ask | "Read only. Don't run the test suite; it takes 20 minutes." |

## Leave out

- **Step lists** ("first open X, then grep for Y, then..."). Name the
  outcome; let it choose the path.
- **What it can see for itself**: file contents, the language, the
  framework.
- **Hedged wishes** ("try to", "maybe look at"). State the finish line.

## Check before sending

- Could it tell, without asking you, when it's finished?
- Would the hand-off still make sense if it found a better way than you'd
  have picked?
- If it comes back with exactly what you asked for, can you use it as is?
