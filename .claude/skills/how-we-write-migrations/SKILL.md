---
name: how-we-write-migrations
description: Create and review safe database migrations. Use when changing schemas, migrating data, or troubleshooting migration failures.
tools: Read, Grep, Glob, Bash
user-invocable: true
---

# How we write migrations

- Migrations are the riskiest change class: they touch production data and are hard to undo. Make them boring.

## Before writing

- Check the current schema and the latest existing migration. Never edit a migration that has already been applied or merged; add a new one.
- Decide whether the change is backward compatible with the code that is currently deployed. If not, split it using expand/contract (see below).

## Rules

- One concern per migration. Do not mix schema changes with data backfills.
- Expand, then contract. Ship in separate releases: (1) add the new column/table (nullable or with a default), (2) deploy code that writes/reads both, (3) backfill, (4) switch reads, (5) drop the old column in a later migration.
- Always reversible. Write a working down/rollback. If a change is truly irreversible (dropping data), say so explicitly in the PR.
- Avoid long locks. On large tables: create indexes concurrently/online, add columns without rewriting the table, add NOT NULL / foreign keys in a validated-later step.
- Backfill in batches. Never update an entire large table in one statement. Make backfills idempotent and resumable.
- No application code imports. Migrations must not depend on models or helpers that may change later; use raw SQL or frozen definitions.
- Name clearly. Use a timestamp prefix plus a descriptive name, e.g. 20261020_add_status_to_orders.

## Checklist before opening the PR

[ ] Runs cleanly on an empty database and on a production-like copy
[ ] down tested
[ ] Safe to deploy before the matching code (and after, if rolled back)
[ ] Large-table impact considered (locks, duration, batch size)
[ ] Rollback plan written in the PR description

## PR description format

- What: one sentence
- Why: context
- Risk: tables affected, expected duration, lock behavior
- Rollback: exact steps
