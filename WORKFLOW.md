# Workflow

The team workflow for every project in this repository. It is linked from the READMEs and imported
into [user-management/CLAUDE.md](user-management/CLAUDE.md), so Claude follows the same rules.

1. Start every piece of work from a GitHub issue, using the **Feature** or **Bug** template
   (`.github/issue_templates/`).
2. Branch from `main`: `feat/<issue>-<slug>` or `fix/<issue>-<slug>`. Never commit to `main` directly.
3. Use conventional commit prefixes (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). In
   `user-management/`, tag the SPEC feature where relevant, e.g. `feat: add edit user page ... (F4)`.
4. Open a pull request that references the issue (`Closes #<n>`).
5. Before asking for review, run the checks for the project you changed:
   - `user-management/`: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` and `pnpm e2e`.
   - `.claude/`: `node --test .claude/hooks/*.test.mjs` (needs `pnpm install` in `user-management/`
     first, because the Prettier hook tests use its Prettier).
6. A bug fix starts with a failing test that reproduces the bug.

A Husky pre-commit hook (`user-management/.husky/pre-commit`) runs the checks for each project that
has staged files: lint-staged for `user-management/` and the hook tests for `.claude/`. It is
installed by `pnpm install` in `user-management/`, so run that once after cloning. Don't skip it
with `--no-verify`.

The same Husky setup enforces rule 2: the pre-commit hook refuses a commit while `main` or `master`
is checked out, and `user-management/.husky/pre-push` refuses a push whose target is `main` or
`master`. Git runs them in the checkout or worktree you are working in, so a feature branch (or a
worktree on one) is never blocked.
