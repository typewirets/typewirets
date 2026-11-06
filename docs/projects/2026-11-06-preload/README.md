# preload

An app waits for its async wires once per phase (startup, login, route), and React components then read them synchronously. Async stays the wire contract (decided in [../2026-11-05-sync-createwith](../2026-11-05-sync-createwith/README.md)).

- [product.html](product.html): value V0–V4, behaviour B1–B11. Status: approved 2026-11-06.
- [design.html](design.html): approaches A1–A3, H1–H3, S1–S3; recommendation A1 + H1 + S1; test plan T1–T10. Status: awaiting a pick.

## Where things stand

- 2026-11-06: the maintainer chose to keep async as the contract and to preload before React. Asked which preload scope suits typical apps; agreed on both: per-phase sets as the main pattern, whole-container preload for small apps, servers and tests. Unpreloaded wires keep suspending.
- Facts found in code (a9dc4ac): `TypeWireGroup.getAllInstances` already preloads a group in parallel; `container.getAllAsync()` resolves every binding one at a time, transients included; `useTypeWire` ends with `if (value) return value; throw promise;`, so a falsy preloaded value suspends; the React README shows Suspense, not preloading.

## Open, for the design brief

- B11 depends on issue #20's wait-for cycle check: sequence #20 before or with this.
- Not in scope: transient `createWith` wires in `useTypeWire` (they throw a non-retriable error today), and `useTypeWire` calling `getInstance` on every render (creates a transient instance per render). Separate fix.

## Next steps

1. Pick Q1–Q3 in design.html.
2. Build per the pick; every B line gets its T test.
