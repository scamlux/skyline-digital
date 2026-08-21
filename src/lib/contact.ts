/**
 * Single source of truth for direct contact details.
 * Not translated — the same across all locales.
 */
export const CONTACTS = {
  email: "pm.umarrr@gmail.com",
  /** E.164, used for tel: links */
  phone: "+998771260322",
  /** Human-readable phone for display */
  phoneDisplay: "+998 77 126 03 22",
  telegram: "nmmumar",
} as const;

export const CONTACT_LINKS = {
  email: `mailto:${CONTACTS.email}`,
  phone: `tel:${CONTACTS.phone}`,
  telegram: `https://t.me/${CONTACTS.telegram}`,
} as const;

export const telegramHandle = `@${CONTACTS.telegram}`;
