/**
 * Escapes the characters that LIKE and ILIKE treat as wildcards (`%`, `_`) and the escape character
 * itself (`\`), so a search for `100%` finds the text "100%" and not every row starting with 100.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&')
}
