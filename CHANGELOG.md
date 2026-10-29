# Changelog

All notable changes to this project are listed here, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Longer notes for a feature are in
[docs/releases/](docs/releases/).

## [Unreleased]

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
