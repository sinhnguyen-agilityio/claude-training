# Changelog

All notable changes to this project are listed here, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Longer notes for a feature are in
[docs/releases/](docs/releases/).

## [Unreleased]

### Added

- Claude Code hooks `protect-files` (blocks edits to `pnpm-lock.yaml`, the seed users and the
  coverage thresholds) and `typecheck-on-edit` (runs `tsc -b` after a `.ts`/`.tsx` edit), the
  skills `check-all` and `new-feature-scaffold`, and a `.mcp.json` with the context7 MCP server.
- Workflow skills `start-ticket`, `ship`, `pr-walkthrough` and `triage-review`, and `loop.md` for
  watching an open PR with `/loop` (#22).
- `skills.test.mjs`: checks every skill's frontmatter, its README row, and the headings of the
  issue and PR formats (#22).
- Deploy to GitHub Pages after CI passes on `main` (`.github/workflows/deploy.yml`). The app is
  live at <https://sinhnguyen-agilityio.github.io/claude-training/> (#23).
- `E2E_PORT` sets the E2E port, so two worktrees can run E2E at once; `BASE_PATH` sets the build's
  base path (#23).
- A smoke E2E (`tests/e2e/subpath.spec.ts`) on a `BASE_PATH=/claude-training/` build, run in CI
  after `pnpm e2e`, so a base-path bug in the build, the router or the mock service worker fails
  the PR before it reaches GitHub Pages (#26).

### Changed

- Fixes to the workflow skills found while running #26: `triage-review` also reads conversation
  comments and reviews (the CI review is one), `start-ticket` skips the questions for an issue that
  has none open, `ship` reports a check that fails once and then passes as possibly flaky,
  `pr-walkthrough` shows the head commit and asks for a rerun after new commits, and
  `review-checklist` and `pr-description` match `WORKFLOW.md` (#28).
- Commit messages carry no `Co-Authored-By` or "Generated with Claude Code" line, like PR
  descriptions (#28).
- The issue (Feature, Bug) and PR formats live in the `ticket-pack`, `bug-report` and
  `pr-description` skills. They add Assumptions and Definition of done, and the PR format adds
  Assumptions, an AC → test table and Risk. `ticket-pack` runs a readiness check (#22).
- `WORKFLOW.md` describes the full pipeline from issue to merge, and branches may also start with
  `chore/` or `docs/` (#22).
- The Claude Code review in CI runs once per PR, when it is opened or marked ready, and skips
  drafts. Ask for another with an `@claude review this PR` comment (#24).
- `release-checklist` is written for this repo: CHANGELOG, release notes, version and a `vX.Y.Z`
  tag, released through a PR (#24).

### Removed

- The issue and PR/MR template files in `.github/` and `.gitlab/`, and `templates.test.mjs` (#22).

## [1.0.0] - 2026-10-30

### Added

- Bulk actions on the users list: select rows, then delete or set status in one step (F7).
  See [docs/releases/f7-bulk-actions.md](docs/releases/f7-bulk-actions.md).
- Export the users list to a CSV file (F8).
  See [docs/releases/f8-export-users-csv.md](docs/releases/f8-export-users-csv.md).
- Skills `ticket-pack`, `bug-report` and `pr-description`, and subagents `code-explorer` and
  `test-spec-writer`.
- Pull request and merge request templates, and issue templates for both GitHub and GitLab.
- Security checks in CI (`pnpm audit`) and Dependabot updates.

### Changed

- The app now lives at the repository root instead of `user-management/`.
- The Prettier hook is now `format-on-edit` and formats files across the repository.
- Claude Code guidance is split: `CLAUDE.md` holds the rules; architecture and testing notes are in
  `docs/`.

### Removed

- The `mcp/` demo and the `how-we-write-migrations` skill.

[1.0.0]: https://github.com/sinhnguyen-agilityio/claude-training/tree/v.1.0.0
