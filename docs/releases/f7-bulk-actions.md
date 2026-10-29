# Users list: act on several users at once

**Users page · 2026-10-28 · [PR #6](https://github.com/sinhnguyen-agilityio/claude-training/pull/6) · [Issue #4](https://github.com/sinhnguyen-agilityio/claude-training/issues/4)**

You can now select several users on the list and delete them, or change their status, in one action. A clean-up of dozens of users no longer takes one click-through per user.

## Done

- **Select users on the page.** Every row has a checkbox, and the table header has a "Select all users on this page" box. The header box shows a dash when only some rows are selected.
- **One bar for the actions.** As soon as one row is selected, a bar appears above the table with "N selected", **Set active**, **Set inactive**, **Delete** and **Clear selection**. It disappears when nothing is selected.
- **Delete with a safety check.** **Delete** asks first ("Delete 3 users?"). **Cancel** keeps your selection and changes nothing.
- **Change status in one click.** **Set active** and **Set inactive** apply straight away, without a confirmation.
- **Clear results.** A toast tells you what happened: "3 users deleted" or "10 users updated". If some users could not be changed, you get a warning such as "2 of 3 deleted, 1 failed". If everything fails, you get an error such as "Could not delete 3 users".
- **Failed rows stay selected,** so you can try again. Rows that no longer exist drop out of the selection.
- **The list keeps up.** After an action the list refreshes. If the page you were on is now empty, you go back one page.
- **Works with the keyboard and screen readers.** "N selected" is announced, and when the bar disappears after an action, focus moves to the "Users" heading.
- **Works on small screens.** At 375 px the bar wraps onto two rows and the table header stays visible.
- New endpoint `POST /api/users/bulk`;

## In-Progress

- **Export selected users** ("Export selected (N)") is planned as a follow-up now that both bulk actions (F7) and CSV export (F8) are on `main`. It needs its own ticket.

## Known Issues

- None reported for users.

## Note

- **How it behaves (agreed in the spec, not defects):**
  - Selection is per page. Changing the page, a filter, the sort or the search clears it, and it is not kept in the URL or after a reload.
  - Set active / Set inactive give every selected user a new "Updated" time, including users who already had that status.
  - You cannot select users across pages, undo an action, or edit other fields (such as role) in bulk.
  - While an action runs, the action buttons and checkboxes are disabled. Paging and filters still work, and the result toast still appears if you move on.
- **For the team:**
  - The request is checked by a schema shared by the UI and the mock API (`bulkSchema.ts`). It removes duplicate ids, reports an unknown id as `not_found`, and returns 400 for an empty list, more than 50 ids or a bad status. A partial failure is still a 200.
  - One test, `UsersListFilters` ("follows the URL when it changes from outside"), is sensitive to machine load. It can fail in a full parallel run and passes when run alone.
