# Workflow

The team workflow for every project in this repository. It is linked from the READMEs and imported
into [user-management/CLAUDE.md](user-management/CLAUDE.md), so Claude follows the same rules.

1. Start every piece of work from a GitLab issue, using the **Feature** or **Bug** template
   (`.gitlab/issue_templates/`).
2. Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`. Never commit to `main` directly.
3. Use conventional commit prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). In
   `user-management/`, tag the SPEC feature where relevant, e.g. `feat: add edit user page ... (F4)`.
4. Open a merge request that references the issue (`Closes #<n>`).
5. Before asking for review, run the checks for the project you changed:
   - `user-management/`: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e`.
   - `mcp/`: `python -m ruff check .` and `python -m ruff format --check .`.
   - `.claude/`: `node --test .claude/hooks/*.test.mjs`.
6. A bug fix starts with a failing test that reproduces the bug.

A Husky pre-commit hook (`user-management/.husky/pre-commit`) runs the checks for each project that
has staged files: lint-staged for `user-management/`, ruff for `mcp/`, and the hook tests for
`.claude/`. It is installed by `pnpm install` in `user-management/`, so run that once even if you
only work in `mcp/`. Don't skip it with `--no-verify`.
