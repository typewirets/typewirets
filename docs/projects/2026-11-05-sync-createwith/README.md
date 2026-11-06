# sync-createwith

Make a `createWith` wire whose imports are all synchronous resolve synchronously on first use, so `getInstanceSync` works and `useTypeWire` does not suspend for it (root cause of issue #21's React symptom).

- [product.html](product.html): value and behaviour (B1–B8). Status: approved 2026-11-06.
- [design.html](design.html): approaches A1–A3, spike evidence E1–E3, test plan T1–T6. Status: A1 picked 2026-11-06; this session builds #20 first (Q2).

## Where things stand

- 2026-11-05: briefs drafted. PR #28 (`getSync` refuses a second creation) is still open; any code starts from `main` after it merges.
- Recommendation A1 depends on issue #20's per-step resolution chain (triage plan P3a), because today's shared monitor stack is corrupted by mixed sync/async reads (design.html E1).

- 2026-11-06: person replied "Approve A1, do #20 first". #28–#31 merged.

- 2026-11-06: person pointed out that runtime detection loses the type-safe dependency chain, and asked for pros, cons and risks of each side. [options.html](options.html) compares O0–O3; the A1 pick is on hold until they choose.

- 2026-11-06: person's context: createWith was made always async on purpose, because a creator override (`withCreator`) may need to be sync or async depending on what the constructor needs; what matters is delivering the instance. They asked to reassess at the requirement level: is sync vs async part of a wire's definition, or an implementation detail of whatever creator is bound?
- Finding: O3's compile-time proof does not survive overrides. `withCreator` keeps the token and `CreatorDecorator<T>` may return a promise, so an importer typed "all imports sync" can meet an async override at runtime.

- 2026-11-06: **Decided: async stays the contract.** No sync-first `createWith` (O1/O2) and no distinct sync wires (O3). A wire promises an instance through `getInstance`; whether its creator is sync is the bound creator's detail, free to change through overrides. `getInstanceSync` means "read what is already created". The React first-mount gap is to be closed by preloading instead (next project).

## Next steps

0. Superseded by the decision above; steps 1–2 below are kept for history only.
1. Issue #20 (per-step chains, wait-for cycle check) as its own PR, per the triage plan (docs/projects/issue-triage-2026-11/plan.html, P3a–P3d).
2. This change stacked on it; every B line gets a test from the plan.
