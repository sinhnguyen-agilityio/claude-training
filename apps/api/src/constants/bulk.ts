// SPEC §4 (bulk). These two values are also declared in apps/web/src/features/users/bulkSchema.ts
// (MAX_BULK_IDS, MAX_BULK_ENTRIES). #44 moves that schema to @app/shared and removes the duplicate.

/** Most distinct ids one bulk request may hold, counted after removing duplicates. */
export const BULK_MAX_IDS = 50

/** Most entries `ids` may hold before duplicates are removed. */
export const BULK_MAX_ENTRIES = 500
