// Locale-aware number/date formatting. Kept separate from i18n.ts so
// pages that only need price/date formatting don't pull in the catalog
// loader (and its static JSON imports).

import type { Locale } from './i18n';

/** BCP-47 tags used for Intl formatting — euro-native English via en-IE. */
const localeMap: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-IE',
  ja: 'ja-JP',
};

/** Formats an integer EUR-cents amount (e.g. Stripe's price.amount) as currency. */
export function formatPrice(cents: number, locale: Locale): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/** Formats a date in the Europe/Paris timezone regardless of runtime TZ. */
export function formatDate(date: Date | string | number, locale: Locale): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(localeMap[locale], {
    timeZone: 'Europe/Paris',
    dateStyle: 'long',
  }).format(d);
}
