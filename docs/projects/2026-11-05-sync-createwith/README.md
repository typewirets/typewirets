# sync-createwith

Make a `createWith` wire whose imports are all synchronous resolve synchronously on first use, so `getInstanceSync` works and `useTypeWire` does not suspend for it (root cause of issue #21's React symptom).

- [product.html](product.html): value and behaviour (B1–B8). Status: approved 2026-11-06.
- [design.html](design.html): approaches A1–A3, spike evidence E1–E3, test plan T1–T6. Status: A1 picked 2026-11-06; this session builds #20 first (Q2).

## Where things stand

- 2026-11-05: briefs drafted. PR #28 (`getSync` refuses a second creation) is still open; any code starts from `main` after it merges.
- Recommendation A1 depends on issue #20's per-step resolution chain (triage plan P3a), because today's shared monitor stack is corrupted by mixed sync/async reads (design.html E1).

- 2026-11-06: person replied "Approve A1, do #20 first". #28–#31 merged.

## Next steps

1. Issue #20 (per-step chains, wait-for cycle check) as its own PR, per the triage plan (docs/projects/issue-triage-2026-11/plan.html, P3a–P3d).
2. This change stacked on it; every B line gets a test from the plan.
