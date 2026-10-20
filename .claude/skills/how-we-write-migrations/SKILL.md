---
name: how-we-write-migrations
description: Create and review safe database migrations. Use when changing schemas, migrating data, or troubleshooting migration failures.
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

# How We Write Migrations

Make database changes predictable, safe, and boring.

## Workflow

1. Inspect

- Identify the database engine, migration framework, and existing project conventions.
- Inspect the current schema, migration history, and affected application code.
- Check existing data, constraints, indexes, and dependencies.
- Identify deployment and backward-compatibility requirements.

2. Plan

- Choose the smallest safe change.
- Identify potential data loss, locking, performance, and deployment risks.
- Determine whether rollback is genuinely possible.
- Ask for clarification before making ambiguous decisions that could cause data loss.

3. Implement

- Follow the project's existing migration framework and naming conventions.
- Preserve existing data unless the requirements explicitly require otherwise.
- Never modify migrations already applied to shared environments; create a new corrective migration instead.
- Make data backfills restartable where practical and use batching for large datasets.
- Consider database-specific transaction, locking, and index behavior.
- For breaking schema changes, use expand–migrate–contract when old and new application versions must coexist.

4. Verify

- Apply the migration against a representative test database.
- Verify the resulting schema and expected data changes.
- Run relevant tests and integrity checks.
- Test rollback when supported and safe.
- For large or high-risk changes, assess execution time, locks, resource usage, and recovery options.
- Never claim a check passed unless it was actually performed.

5. Handle Failures

- Inspect the error, actual database state, and migration history before retrying.
- Determine whether the migration partially applied and whether retrying is safe.
- Prefer a minimal corrective migration or documented recovery procedure.
- Never blindly rerun a failed migration or manipulate migration history to conceal a failure.

## Safety Rules

- Never execute destructive production operations without explicit authorization and an appropriate recovery plan.
- Never assume a rollback restores data that has been discarded or overwritten.
- Never disable integrity constraints merely to force a migration to succeed.
- Avoid unnecessary abstractions, dependencies, and unrelated refactoring
- State assumptions and unresolved risks explicitly.

## Completion Report

- Summarize only relevant items:
- Changes: Migration and affected files.
- Safety: Compatibility and data integrity risks.
- Validation: Checks performed and actual results.
- Deployment: Required ordering, backfills, or operational steps.
- Recovery: Rollback limitations and unresolved risks.
- Keep the report concise. Clearly distinguish completed work from recommended but unperformed actions.
