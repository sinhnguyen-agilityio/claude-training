# User Management Dashboard

A small React + TypeScript CRUD app for managing users. It is also a training repository for
learning to build software with [Claude Code](https://claude.com/claude-code): the app is the
subject, and the Claude Code configuration (hooks, skills, subagents) is what the training is
about. There is no backend; data comes from a mock REST API ([MSW](https://mswjs.io)) persisted in
`localStorage`.

The full spec and acceptance criteria are in [docs/SPEC.md](docs/SPEC.md).

## Tech stack

React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · React Hook Form + Zod ·
Tailwind CSS · MSW · Vitest + Testing Library · Playwright · oxlint + Prettier

## Training goals

- Work the way a team would: issue → branch → pull request → review.
- Drive a feature from a written spec ([docs/SPEC.md](docs/SPEC.md)) with clear acceptance
  criteria.
- Write tests first for bugs, and keep unit, component and E2E coverage healthy (80% threshold).
- Teach Claude Code the project's rules through `CLAUDE.md`, hooks, skills and subagents instead of
  repeating them in every prompt.

## Run it from scratch

Prerequisites: **Node.js 22+** and **pnpm**. Run `corepack enable` to install the pinned pnpm
version (on Node 25+, which no longer bundles Corepack, run `npm i -g corepack` first).

```bash
git clone https://github.com/sinhnguyen-agilityio/claude-training.git claude
cd claude
pnpm install   # also installs the Husky git hooks
pnpm dev
```

Open <http://localhost:5173>. For E2E tests, install the browser once:

```bash
pnpm exec playwright install chromium
```

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Start the dev server                          |
| `pnpm build`         | Type-check and build for production           |
| `pnpm preview`       | Serve the production build                    |
| `pnpm typecheck`     | Run the TypeScript compiler                   |
| `pnpm lint`          | Lint with oxlint                              |
| `pnpm format`        | Format with Prettier                          |
| `pnpm test`          | Run unit/component tests once                 |
| `pnpm test:watch`    | Run tests in watch mode                       |
| `pnpm test:coverage` | Run tests with a coverage report              |
| `pnpm e2e`           | Build, serve and run the Playwright E2E tests |

## Working with Claude Code

Run `claude` from the repository root. It picks up the configuration below automatically.

### Project instructions

- [CLAUDE.md](CLAUDE.md): commands, conventions and the "never do" list. It imports
  [WORKFLOW.md](WORKFLOW.md).
- [docs/architecture.md](docs/architecture.md) and [docs/testing.md](docs/testing.md): read on
  demand, not loaded into every session.

### Hooks

Configured in [.claude/settings.json](.claude/settings.json), with scripts in [.claude/hooks/](.claude/hooks/):

| Hook                                                       | Event         | What it does                                                                                               |
| ---------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| [block-forbidden.mjs](.claude/hooks/block-forbidden.mjs)   | `PreToolUse`  | Blocks risky git commands run through Bash/PowerShell (force push, hard reset, work on protected branches) |
| [format-on-edit.mjs](.claude/hooks/format-on-edit.mjs)     | `PostToolUse` | Runs Prettier on files Claude edits or writes                                                              |
| [notify-on-finish.mjs](.claude/hooks/notify-on-finish.mjs) | `Stop`        | Shows a Windows toast and plays a sound when Claude finishes a turn                                        |

If the guard script cannot be loaded, the `PreToolUse` hook blocks the command (fails closed); the
other two only report an error.

### Skills

Defined in [.claude/skills/](.claude/skills/). Each one is also a slash command.

| Skill                                                          | Use it to                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [ticket-pack](.claude/skills/ticket-pack/SKILL.md)             | Turn a requirement into a ticket pack (`/ticket-pack`)     |
| [bug-report](.claude/skills/bug-report/SKILL.md)               | Turn a rough description into a bug report (`/bug-report`) |
| [pr-description](.claude/skills/pr-description/SKILL.md)       | Draft a PR/MR description (`/pr-description`)              |
| [review-checklist](.claude/skills/review-checklist/SKILL.md)   | Review a PR or branch (`/review-checklist 2`)              |
| [release-checklist](.claude/skills/release-checklist/SKILL.md) | Run a final check before shipping (`/release-checklist`)   |

### Subagents

Defined in [.claude/agents/](.claude/agents/):

| Subagent                                               | Use it to                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| [code-explorer](.claude/agents/code-explorer.md)       | Explore an unfamiliar area without filling the main session      |
| [test-spec-writer](.claude/agents/test-spec-writer.md) | Turn acceptance criteria into a test matrix and Playwright specs |

### Hook and template tests

```bash
node --test .claude/hooks/*.test.mjs   # needs `pnpm install` first
```

## Workflow

Issue, branch naming, commit prefixes, pull request, pre-review checks and test-first bug fixes
are defined in [WORKFLOW.md](WORKFLOW.md), together with the Husky hooks that enforce them. The
change history is in [CHANGELOG.md](CHANGELOG.md); longer notes per feature are in
[docs/releases/](docs/releases/).

## Repository layout

```text
.
├── .claude/          # Claude Code settings, hooks, skills and subagents
├── .github/          # CI, Dependabot, CODEOWNERS, issue and PR templates (GitHub)
├── .gitlab/          # Issue and MR templates (GitLab copy)
├── .husky/           # Git hooks: pre-commit and pre-push
├── docs/             # SPEC.md, architecture, testing, release notes
├── src/              # App code (app, features, mocks, shared, test)
├── tests/e2e/        # Playwright specs
├── CHANGELOG.md
├── CLAUDE.md
└── WORKFLOW.md
```
