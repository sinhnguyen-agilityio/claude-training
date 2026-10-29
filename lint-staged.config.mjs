// oxlint takes no file list: lint-staged would pass every staged path, and a commit that moves
// many files overflows the Windows command-line limit. oxlint checks the whole project in well under
// a second, so it runs once whenever a TypeScript file is staged.
export default {
  '*.{ts,tsx}': ['prettier --write', () => 'oxlint --deny-warnings'],
  '*.{json,md,css,yml,html}': 'prettier --write',
}
