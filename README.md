# Claude Code Training

A training repository for learning to build software with [Claude Code](https://claude.com/claude-code).
It holds one small project plus the Claude Code configuration (hooks and skills) used while
working on it.

| Folder                               | What it is                                                             |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [user-management/](user-management/) | Main project: a React + TypeScript CRUD app for managing users         |
| [.claude/](.claude/)                 | Shared Claude Code settings, hooks and skills for the whole repository |
| [.github/](.github/)                 | CI workflow and issue templates (Feature, Bug)                         |

## Training goals

- Work the way a team would: GitHub issue → branch → pull request → review.
- Drive a feature from a written spec ([user-management/docs/SPEC.md](user-management/docs/SPEC.md))
  with clear acceptance criteria.
- Write tests first for bugs, and keep unit, component and E2E coverage healthy (80% threshold).
- Teach Claude Code the project's rules through `CLAUDE.md`, hooks and skills instead of repeating
  them in every prompt.

## Getting started

### User Management Dashboard

Prerequisites: **Node.js 22+** and **pnpm**. Run `corepack enable` to install the pinned pnpm
version (on Node 25+, which no longer bundles Corepack, run `npm i -g corepack` first).

```bash
git clone https://github.com/sinhnguyen-agilityio/claude-training.git claude
cd claude/user-management
pnpm install   # also installs the Husky pre-commit hook for the whole repo
pnpm dev
```

Open <http://localhost:5173>. There is no backend: a mock REST API (MSW) runs in the browser and
stores data in `localStorage`. See [user-management/README.md](user-management/README.md) for the
scripts, project structure and workflow.

## Working with Claude Code

Run `claude` from the repository root. It picks up the configuration below automatically. The
hooks also load when you start it inside `user-management/` (see [Hooks](#hooks)); the skills are
only registered at the root.

### Project instructions

- [user-management/CLAUDE.md](user-management/CLAUDE.md): commands, architecture, testing rules and
  the "never do" list for the app. Claude loads it when working under `user-management/`.

### Hooks

Configured in [.claude/settings.json](.claude/settings.json), with scripts in [.claude/hooks/](.claude/hooks/):

| Hook                                                                       | Event         | What it does                                                                                               |
| -------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| [block-forbidden.mjs](.claude/hooks/block-forbidden.mjs)                   | `PreToolUse`  | Blocks risky git commands run through Bash/PowerShell (force push, hard reset, work on protected branches) |
| [notify-on-finish.mjs](.claude/hooks/notify-on-finish.mjs)                 | `Stop`        | Shows a Windows toast and plays a sound when Claude finishes a turn                                        |
| [prettier-user-management.mjs](.claude/hooks/prettier-user-management.mjs) | `PostToolUse` | Runs Prettier on files Claude edits or writes under `user-management/`                                     |

[user-management/.claude/settings.json](user-management/.claude/settings.json) registers the same
three hooks for sessions started in `user-management/`; `settings.test.mjs` keeps the two files in
step. If the guard script cannot be loaded, the `PreToolUse` hook blocks the command (fails closed);
the other two only report an error.

### Skills

Defined in [.claude/skills/](.claude/skills/):

| Skill                                                                      | Use it to                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| [how-we-write-migrations](.claude/skills/how-we-write-migrations/SKILL.md) | Create and review safe database migrations               |
| [ticket-pack](.claude/skills/ticket-pack/SKILL.md)                         | Turn a requirement into a ticket pack (`/ticket-pack`)   |
| [release-checklist](.claude/skills/release-checklist/SKILL.md)             | Run a final check before shipping (`/release-checklist`) |
| [review-checklist](.claude/skills/review-checklist/SKILL.md)               | Review a PR or branch (`/review-checklist 2`)            |

### Hook tests

Run the hook tests with Node's built-in runner. The Prettier hook tests need `pnpm install` in
`user-management/` first:

```bash
node --test .claude/hooks/*.test.mjs
```

## Workflow

Issue, branch naming, commit prefixes, pull request, pre-review checks and test-first bug fixes
are defined in [WORKFLOW.md](WORKFLOW.md), together with the Husky pre-commit hook that runs the
checks.

## Repository layout

```text
.
├── .claude/          # Claude Code settings, hooks and skills
├── .github/          # CI workflow and issue templates
├── WORKFLOW.md       # Team workflow: issue, branch, commit, PR, checks
└── user-management/  # User Management Dashboard (React + TypeScript)
    ├── docs/         # SPEC.md: data model, API contract, acceptance criteria
    ├── src/          # App code (app, features, mocks, shared, test)
    └── tests/e2e/    # Playwright specs
```
