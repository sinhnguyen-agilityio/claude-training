const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether `value` has the shape of a UUID (the canonical 8-4-4-4-12 form, in any letter case). A
 * `uuid` column rejects anything else with an error, so a route checks this before it queries.
 * It does not look at the version: Postgres accepts every value of this shape.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}
