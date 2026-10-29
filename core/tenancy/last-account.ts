/**
 * Cookie with the slug of the account opened last. /accounts sends the user
 * back there after sign-in; a slug the user no longer belongs to is ignored.
 * Not a security boundary: access is checked on every request.
 */
export const LAST_ACCOUNT_COOKIE = "last_account";

export const LAST_ACCOUNT_MAX_AGE = 60 * 60 * 24 * 365;
