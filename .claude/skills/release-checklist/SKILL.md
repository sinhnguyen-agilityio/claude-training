---
name: release-checklist
description: Gate a release of this repo - check main, run every check, verify CHANGELOG, release notes and version, then (after asking at each step) open the release PR and push the vX.Y.Z tag. Use when asked to release, cut a version, tag a release or check whether main is ready to ship.
tools: Read, Grep, Glob, Bash, AskUserQuestion
user-invocable: true
---

# Release checklist

Pipeline step 10 in `WORKFLOW.md`. `/review-checklist` reviews one change; this skill checks a
whole version before it is tagged. Any failure blocks the release.

## Usage

```text
/release-checklist 1.1.0
```

Versions follow semver. Tags are `v<x.y.z>` (e.g. `v1.1.0`). The first tag, `v.1.0.0`, predates
this convention and is kept as it is.

## 1. Preconditions

Stop at the first one that fails, and name it:

1. `main` is checked out (`git branch --show-current`).
2. The working tree is clean (`git status --porcelain` prints nothing).
3. `main` matches GitHub: `git fetch github` and `git rev-parse HEAD` equals
   `git rev-parse github/main`.

## 2. Checks

Run each one and record pass or fail. Run them all, even after a failure:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm e2e
node --test .claude/hooks/*.test.mjs
pnpm audit --prod --audit-level=high
```

## 3. Content

- [ ] `CHANGELOG.md` has entries under `## [Unreleased]`.
- [ ] Every `F<n>` mentioned under `[Unreleased]` has a `docs/releases/f<n>-*.md`.
- [ ] `src/` has no `TODO`, `FIXME`, `console.log` or `debugger` outside test files:
      `git grep -nE "TODO|FIXME|console\.log|debugger" -- src ':!*.test.ts' ':!*.test.tsx'`
- [ ] The tag `v<x.y.z>` does not exist yet (`git tag -l v<x.y.z>`).
- [ ] `<x.y.z>` is higher than the latest released version: the highest tag matching `v<x.y.z>`
      or `v.<x.y.z>`, and the latest `## [x.y.z]` heading in `CHANGELOG.md`.
- [ ] `package.json` `version` equals the latest released version (it moves to `<x.y.z>` in step 5).

Treat these as warnings, not failures: a new dependency since the last tag (`git diff
<last tag>..HEAD -- package.json`) with no reason in the CHANGELOG, and README or SPEC not touched
although `[Unreleased]` lists a new feature.

## 4. Report

```markdown
## Release checklist: <x.y.z>

### Passed

- [x] ...

### Failed

- [ ] ... (with the command output or the file:line)

### Warnings

- [ ] ...

### Verdict

**READY** | **BLOCKED** - <one sentence>
```

BLOCKED stops here.

## 5. Release (READY only; ask before each step)

`main` takes no direct commits, so the release goes through a PR:

1. Create the release branch from `main`. It needs an issue number and no dots, to match the
   `WORKFLOW.md` rule 2 regex: `chore/<n>-release-<x>-<y>-<z>`, for example
   `chore/60-release-1-2-0` (open an issue for the release first).
2. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [<x.y.z>] - <YYYY-MM-DD>` and add an empty
   `## [Unreleased]` above it. Add the link reference at the bottom, above the older ones:
   `[<x.y.z>]: https://github.com/sinhnguyen-agilityio/claude-training/tree/v<x.y.z>`. Set
   `package.json` `version` to `<x.y.z>`.
3. Commit `chore: release <x.y.z>` (a valid rule 3 header, and use it as the PR title), push, and open the PR (`/ship` steps 4–5).
4. After the PR is merged, find the merge commit (`gh pr view <n> --json mergeCommit`), then:

   ```bash
   git fetch github
   git tag -a v<x.y.z> <merge commit sha> -m "Release <x.y.z>"
   git push github v<x.y.z>
   ```

   The pre-push hook blocks only branch pushes to `main`/`master`, so a tag push goes through.

No GitHub Release page: the CHANGELOG and `docs/releases/` are the release notes.

## Rules

- Never tag a commit that is not on `github/main`.
- Never edit or delete an existing tag.
- Never commit, push or tag without a yes for that step.
