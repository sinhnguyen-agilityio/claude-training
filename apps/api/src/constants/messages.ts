/** The message of the 404 for a user that does not exist (SPEC §4). One text for every endpoint that has an id. */
export const USER_NOT_FOUND = 'User not found'

/** The message of the 409 for an email that another user already has, and of its `fieldErrors.email` (SPEC §4). */
export const EMAIL_IN_USE = 'Email is already in use'

/** The message of the 400 for a PATCH that holds no field to change (SPEC §4). */
export const NOTHING_TO_UPDATE = 'Nothing to update'
