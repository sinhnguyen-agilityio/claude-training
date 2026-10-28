# Users list: export to CSV

**Users page · 2026-10-28 · [PR #9](https://github.com/sinhnguyen-agilityio/claude-training/pull/9) · [Issue #5](https://github.com/sinhnguyen-agilityio/claude-training/issues/5)**

You can now download the users you are looking at as a spreadsheet file, to share with another department.

## Done

- **Download exactly what you filtered.** The new **Export CSV** button in the Users toolbar saves every user that matches your search, role, status and sort, not only the 10 on the current page. The file keeps the same order as the list.
- **Easy to find and open.** The file is named `users-YYYY-MM-DD.csv` with today's date. Names with accents or non-Latin characters display correctly in a spreadsheet.
- **Safe to open.** Values that start with `=`, `+`, `-` or `@` are marked so a spreadsheet cannot run them as formulas.
- **Clear feedback.** The button shows "Exporting…" while the file is prepared. If something goes wrong you see "Export failed", and no file is saved.
- **Explains itself when unavailable.** The button is greyed out while the list is loading, has no results, or could not load. Hover, tab to it or tap it to see "No users to export".
- **Works everywhere.** The button works with the keyboard and on narrow screens (down to 375 px).
- New endpoint `GET /api/users/export`

## In-Progress

- **Phone numbers made only of digits** (for example `0359023923`): a decision is needed on ticket #5 on whether to protect them. See Known Issues.

## Known Issues

- **Digit-only phone numbers lose their leading `0` in Google Sheets.** Sheets reads them as numbers, so `0359023923` shows as `359023923`. **Workaround:** before importing the file, format the Phone column as "Plain text". International numbers such as `+84 901 234 567` are not affected.

## Note

- **How the file behaves (agreed in the spec, not defects):**
  - A name or email that starts with `-`, `+`, `=` or `@` shows a leading `'` in the file. For example, `+sales@acme.com` appears as `'+sales@acme.com`.
  - The greyed-out button always says "No users to export", even while the list is still loading.
  - Only values starting with those characters are marked. A value with spaces in front of them is not.
- **Checked in Google Sheets only.** Desktop Excel was not tested, because no Excel is available, so phone numbers may display differently there.
- **Personal data.** The file contains email and phone. The app has no sign-in, and the client accepted this risk.
- **For the team:**
  - The new endpoint is `GET /api/users/export`, and the spec (SPEC F8) is updated.
  - Cleanup after the merge: delete the `evidence/pr-9` branch (the PR screenshots depend on it), the `feat/5-export-users-csv` branch and its worktree.
