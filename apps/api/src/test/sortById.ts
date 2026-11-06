/**
 * Orders users by id in JavaScript. Tests sort both the rows from Postgres and the expected list
 * with this one function, so the comparison does not depend on how Postgres orders a uuid.
 */
export function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
