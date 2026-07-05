// Locale-prefixed routing helpers shared by pages/layouts.

import { defaultLocale, locales, type Locale, type Translator } from './i18n';

/** Prefixes a locale-less path (e.g. "/products/foo") with the locale segment. */
export function localePath(locale: Locale, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

export interface Breadcrumb {
  label: string;
  href: string;
}

/**
 * Builds a breadcrumb trail starting with the localized "Home" entry
 * (via t('nav.home')), followed by the given items in order.
 */
export function breadcrumbTrail(
  locale: Locale,
  t: Translator,
  items: Array<{ label: string; path: string }>,
): Breadcrumb[] {
  const home: Breadcrumb = { label: t('nav.home'), href: localePath(locale, '/') };
  const rest: Breadcrumb[] = items.map((item) => ({
    label: item.label,
    href: localePath(locale, item.path),
  }));
  return [home, ...rest];
}

export interface HreflangLink {
  locale: Locale | 'x-default';
  href: string;
}

function getSiteBase(): string {
  const env = import.meta.env as unknown as { SITE?: string; PUBLIC_SITE_URL?: string };
  const site = env.SITE ?? env.PUBLIC_SITE_URL ?? 'https://jp2fr.example.com';
  return site.replace(/\/$/, '');
}

/**
 * Builds the full set of hreflang alternate links (fr/en/ja + x-default)
 * for a given locale-less path. `currentPath` must NOT include the
 * locale prefix (e.g. "/products/foo", not "/fr/products/foo").
 */
export function hreflangLinks(currentPath: string): HreflangLink[] {
  const base = getSiteBase();
  const normalized = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

  const links: HreflangLink[] = locales.map((locale) => ({
    locale,
    href: `${base}${localePath(locale, normalized)}`,
  }));

  links.push({
    locale: 'x-default',
    href: `${base}${localePath(defaultLocale, normalized)}`,
  });

  return links;
}
