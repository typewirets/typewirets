# Harness settings: let the everyday work run without a prompt

The factory's rules tell agents to carry approved work to its finish line:
commit, push a branch, open the pull request and run the repository's checks.
Your harness decides whether each of those stops to ask you. This guide is
for the person: what to allow, what to keep asking about, and where each
harness keeps the setting. An agent points you here; it never changes these
settings itself.

## What to allow, and what's the repository's call

**The factory needs these allowed:**

- the everyday git commands: status, diff, log, add, commit, branch,
  checkout, switch, stash, rebase, merge, fetch, pull, push;
- `gh pr create`, `gh pr edit`, `gh pr view`, `gh pr checks`;
- the repository's own check commands, each by name (`pnpm test`,
  `uv run pytest`).

**The repository decides the rest,** such as package runners and installs
(`npx`, `pnpm dlx`, `uvx`, `uv run`, `pnpm install`). Its authors know which
tools they trust. Write that choice in the committed project settings
(`.claude/settings.json`, `.codex/rules/`), so every person and agent working
there gets the same answer.

**Keep a prompt for programs nobody has read:** a script the agent just
downloaded or wrote, `curl … | sh`, and anything that deletes files outside
the repository or sends to another repository. The factory asks you itself
before sending lessons anywhere.

**Protect branches in the repository, not on your machine.** Force-push is
part of everyday work (rebasing a branch, squashing before review), so don't
block it locally. On GitHub, a branch protection rule or ruleset on the
default branch blocks force-pushes and deletion, and requires a pull request.
That holds whatever the agent types, and whichever harness it runs in. A
local command rule matches only the command's text, and both harnesses say
it isn't a security boundary.

## Claude Code

Settings live in three files, and their permission lists are combined:

| File | Who it affects |
|---|---|
| `~/.claude/settings.json` | you, in every project |
| `.claude/settings.json` | everyone in this repository (commit it) |
| `.claude/settings.local.json` | you, in this repository only |

Rules are checked in the order **deny, then ask, then allow**, and the first
match wins. So a `git push` rule under `ask` prompts even when `allow` has
one too: take it out of `ask` rather than adding to `allow`.

```json
{
  "permissions": {
    "allow": [
      "Bash(git status *)", "Bash(git diff *)", "Bash(git log *)",
      "Bash(git add *)", "Bash(git commit *)", "Bash(git branch *)",
      "Bash(git checkout *)", "Bash(git switch *)", "Bash(git stash *)",
      "Bash(git rebase *)", "Bash(git merge *)", "Bash(git fetch *)",
      "Bash(git pull *)", "Bash(git push *)",
      "Bash(gh pr create *)", "Bash(gh pr edit *)", "Bash(gh pr view *)",
      "Bash(gh pr checks *)",
      "Bash(pnpm test *)", "Bash(pnpm lint *)", "Bash(uv run pytest *)"
    ]
  }
}
```

- Swap the last line for your repository's own check commands.
- Git subcommands are listed one by one rather than as `Bash(git *)`.
  Options like `git -c` can make git run another program.
- A compound command (`a && b`) runs without a prompt only when every part is
  allowed. A `cd` inside the working folder doesn't count against it.
- Answering a prompt with "Yes, and don't ask again" saves the rule to
  `.claude/settings.local.json`, for you only. A choice the whole repository
  should share belongs in `.claude/settings.json`.

## Codex

`~/.codex/config.toml` (or `.codex/config.toml` in a trusted project) sets the
mode:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

In `workspace-write`, `.git` and `.agents/` stay read-only and the network is
off. So every commit, push and pull request, and installing the factory
itself, needs either your approval or a rule. Rules go in a `.rules` file in
`~/.codex/rules/` (or `<repo>/.codex/rules/` in a trusted project). A rule
with `decision = "allow"` runs that command outside the sandbox without a
prompt. A rule matches the command's leading words, so name each command.

```python
# ~/.codex/rules/factory.rules
prefix_rule(pattern = ["git", ["status", "diff", "log", "add", "commit", "branch",
                              "checkout", "switch", "stash", "rebase", "merge",
                              "fetch", "pull", "push"]],
            decision = "allow")
prefix_rule(pattern = ["gh", "pr", ["create", "edit", "view", "checks"]],
            decision = "allow")
prefix_rule(pattern = ["pnpm", "test"], decision = "allow")
```

- Swap the last rule for your repository's own check commands. Which other
  tools to allow is the repository's call.
- Restart Codex after editing a rules file.
- Check a rule before relying on it, for example
  `codex execpolicy check --rules ~/.codex/rules/factory.rules git push origin my-branch`.
  That one prints `allow`.
- Codex marks rules as experimental. The factory checked these with
  `codex-cli` 0.166.

## Cursor and other harnesses

The factory hasn't checked these yet. Look for the harness's allow-list for
terminal commands (often called auto-run). Allow the same commands as in the
table above, and protect branches in the repository.
