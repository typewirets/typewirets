# What a rules file holds

`AGENTS.md` (and `CLAUDE.md`, which should import it) is read at the start
of every session, so every line costs attention on every task. Keep it to
**what an agent can't infer from the repository**.

## Holds

| Kind | Example |
|---|---|
| Commands with non-obvious names or flags | "Run `just check` before pushing." |
| Conventions that differ from the default | "Errors are values: return `Result`, never raise in `core/`." |
| Boundaries and ask-first cases | "Never edit `legacy/`." "Ask before adding a dependency." |
| Gotchas that cost time | "Tests need `TZ=UTC`; they fail in other zones." |
| Pointers to longer docs | "Release steps: `docs/releasing.md`." |

## Leaves out

- What the code, config or README already shows: the language, the
  framework, the folder layout, what a script does.
- Generic advice any agent already follows ("write clean code", "add
  tests").
- Explanations and history. One line, and a link if there's more.

## Adding a rule

When the person gives a standing instruction ("always...", "never...",
"from now on..."), it goes in this file, where every agent and every
teammate's tool reads it. Not in your tool's private memory.

1. Check whether an agent could infer it from the repository. If it could,
   don't add it; say why.
2. Write it as **one short imperative line** in the section where it
   belongs, beside similar rules. Don't add a heading for one line.
3. Don't reword or reorder the lines around it.
4. Inside the factory's marked block, change nothing: local rules go
   outside it.
