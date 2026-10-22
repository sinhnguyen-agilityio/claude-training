# Claude Code Training

A training repository for learning to build software with [Claude Code](https://claude.com/claude-code).
It holds two small, independent projects plus the Claude Code configuration (hooks and skills)
used while working on them.

| Folder                               | What it is                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [user-management/](user-management/) | Main project: a React + TypeScript CRUD app for managing users         |
| [mcp/](mcp/)                         | Side project: a minimal Model Context Protocol (MCP) server and client |
| [.claude/](.claude/)                 | Shared Claude Code settings, hooks and skills for the whole repository |
| [.gitlab/](.gitlab/)                 | Issue templates (Feature, Bug)                                         |

## Training goals

- Work the way a team would: GitLab issue → branch → merge request → review.
- Drive a feature from a written spec ([user-management/docs/SPEC.md](user-management/docs/SPEC.md))
  with clear acceptance criteria.
- Write tests first for bugs, and keep unit, component and E2E coverage healthy (80% threshold).
- Teach Claude Code the project's rules through `CLAUDE.md`, hooks and skills instead of repeating
  them in every prompt.
- Learn how MCP works end to end: tools, resources and prompts.

## Getting started

### User Management Dashboard

Prerequisites: **Node.js 22+** and **pnpm** (`corepack enable` installs the pinned version).

```bash
git clone git@gitlab.asoft-python.com:sinh.nguyen/claude.git
cd claude/user-management
pnpm install
pnpm dev
```

Open <http://localhost:5173>. There is no backend: a mock REST API (MSW) runs in the browser and
stores data in `localStorage`. See [user-management/README.md](user-management/README.md) for the
scripts, project structure and workflow.

### MCP demo

Prerequisites: **Python 3.10+**.

```powershell
cd mcp
pip install -r requirements.txt
python client.py
```

The client starts the server itself, so one terminal is enough. See [mcp/README.md](mcp/README.md)
for details.

## Working with Claude Code

Run `claude` from the repository root. It picks up the following configuration automatically.

### Project instructions

- [user-management/CLAUDE.md](user-management/CLAUDE.md): commands, architecture, testing rules and
  the "never do" list for the app.

### Hooks

Configured in [.claude/settings.json](.claude/settings.json), with scripts in [.claude/hooks/](.claude/hooks/):

| Hook                                                       | Event        | What it does                                                                                               |
| ---------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| [block-forbidden.mjs](.claude/hooks/block-forbidden.mjs)   | `PreToolUse` | Blocks risky git commands run through Bash/PowerShell (force push, hard reset, work on protected branches) |
| [notify-on-finish.mjs](.claude/hooks/notify-on-finish.mjs) | `Stop`       | Shows a Windows toast and plays a sound when Claude finishes a turn                                        |

`user-management/.claude/settings.json` adds a `PostToolUse` hook that runs Prettier on every file
Claude edits or writes.

### Skills

Defined in [.claude/skills/](.claude/skills/):

| Skill                                                                      | Use it to                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| [how-we-write-migrations](.claude/skills/how-we-write-migrations/SKILL.md) | Create and review safe database migrations               |
| [release-checklist](.claude/skills/release-checklist/SKILL.md)             | Run a final check before shipping (`/release-checklist`) |

### Hook tests

Run the hook tests with Node's built-in runner:

```bash
node --test .claude/hooks/*.test.mjs
```

## Workflow

1. Start every piece of work from a GitLab issue, using the **Feature** or **Bug** template.
2. Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`. Never commit to `main` directly.
3. Use conventional commit prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
4. Open a merge request that references the issue (`Closes #<n>`).
5. Before asking for review, run `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e`
   in `user-management/`.
6. A bug fix starts with a failing test that reproduces the bug.

A Husky pre-commit hook (`user-management/.husky/pre-commit`) lints and formats staged files, and
runs the ruff checks when files under `mcp/` are staged. Don't skip it with `--no-verify`.

## Repository layout

```text
.
├── .claude/          # Claude Code settings, hooks and skills
├── .gitlab/          # Issue templates
├── mcp/              # MCP server + client demo (Python)
└── user-management/  # User Management Dashboard (React + TypeScript)
    ├── docs/         # SPEC.md: data model, API contract, acceptance criteria
    ├── src/          # App code (app, features, mocks, shared, test)
    └── tests/e2e/    # Playwright specs
```
