# sync-createwith

Make a `createWith` wire whose imports are all synchronous resolve synchronously on first use, so `getInstanceSync` works and `useTypeWire` does not suspend for it (root cause of issue #21's React symptom).

- [product.html](product.html): value and behaviour (B1–B8). Status: awaiting approval.
- [design.html](design.html): approaches A1–A3, spike evidence E1–E3, test plan T1–T6. Status: awaiting a pick (Q1, Q2).

## Where things stand

- 2026-11-05: briefs drafted. PR #28 (`getSync` refuses a second creation) is still open; any code starts from `main` after it merges.
- Recommendation A1 depends on issue #20's per-step resolution chain (triage plan P3a), because today's shared monitor stack is corrupted by mixed sync/async reads (design.html E1).

## Next steps

1. Get a yes on product.html and a pick for Q1/Q2.
2. Build per the pick; every B line gets a test from the plan.
