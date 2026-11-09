# concurrent-resolution

Fix issue #20: concurrent resolves inside one creator raise a false
`CircularDependency`, and a cycle entered from two requests at once hangs.

- [plan.html](plan.html): status check on `main` (C1–C4), causes, first fix
  outline. Its Q1 was reopened and is replaced by the product brief.
- [product.html](product.html): value (V0–V5) and behaviour (B1–B12).
  Status: approved 2026-11-09.
- [reader-test.html](reader-test.html): a fresh agent's 16 findings on the
  brief, each checked: 15 addressed, F14 for the design.
- [design.html](design.html): approaches A1–A3, recommendation A1, calls
  C1–C5, risks K1–K4, test plan T1–T9. Status: waiting for the person to
  pick an approach.

## Where things stand

- 2026-11-05: fix agreed as PR 3 in
  [the triage plan](../issue-triage-2026-11/plan.html) (P3a–P3d), for 0.2.0.
  Q2 there: carry the chain in a child context, not `AsyncLocalStorage`.
- 2026-11-06: the sync-createwith work that would have stacked on #20 was
  dropped (async stays the contract), so #20 stands alone.
- 2026-11-09: 0.2.0 shipped without #20. Both bugs still reproduce on `main`
  (0337a79). New: `container.preload()` hangs on any cycle, because it starts
  every singleton at once.
- 2026-11-09: person reopened plan Q1 to settle the developer experience
  first. Answers: the same `CircularDependency` error however a cycle is
  reached (U1: A); keep today's error format, made correct everywhere (U2);
  cycle detection built in, and the monitor stays, sees every step and can
  change its outcome (U3).
- 2026-11-09: reader test (reader-test.html). B11 decided by the person:
  a monitor may turn a `CircularDependency` only into another error, never a
  value (B12), because a value hides the cycle and leaves two different `A`s.
- 2026-11-09: product brief approved. Design brief drafted: A1 (keep the
  monitor's shape, add an optional `step` argument), release 0.3.0 (C1),
  0.2.0 monitors keep compiling (N3).

## Next steps

1. Person picks an approach in design.html (Q1) and checks C1–C5 (Q2).
2. Builder starts from product.html and design.html in a fresh context and
   works until every B line has a passing test (T1–T9) locally and in CI.
