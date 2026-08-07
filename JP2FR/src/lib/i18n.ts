// Locale-aware translation catalog loader + lookup helper.
//
// Catalogs are the 3 JSON files under src/i18n/{fr,en,ja}.json, generated
// by the content pipeline with identical key sets (validated by
// scripts/validate-content.mjs). This module is dependency-free: no
// intl-messageformat / i18next, just dot-path lookup, {param}
// interpolation, and a minimal ICU-lite `{x, plural, ...}` resolver
// backed by the platform's Intl.PluralRules.

import frCatalog from '../i18n/fr.json';
import enCatalog from '../i18n/en.json';
import jaCatalog from '../i18n/ja.json';

export const locales = ['fr', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export type CatalogValue =
  | string
  | number
  | boolean
  | null
  | CatalogValue[]
  | { [key: string]: CatalogValue };

export type Catalog = Record<string, CatalogValue>;

export type TranslateParams = Record<string, string | number>;
export type Translator = (key: string, params?: TranslateParams) => string;

const catalogs: Record<Locale, Catalog> = {
  fr: frCatalog as Catalog,
  en: enCatalog as Catalog,
  ja: jaCatalog as Catalog,
};

/** Returns the raw catalog object for a locale (falls back to defaultLocale). */
export function loadCatalog(locale: Locale): Catalog {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

function getPath(obj: Catalog, path: string): CatalogValue | undefined {
  const parts = path.split('.');
  let current: CatalogValue | undefined = obj;
  for (const part of parts) {
    if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function resolveRaw(key: string, locale: Locale): string {
  const primary = getPath(loadCatalog(locale), key);
  if (typeof primary === 'string') return primary;

  if (locale !== defaultLocale) {
    const fallback = getPath(loadCatalog(defaultLocale), key);
    if (typeof fallback === 'string') return fallback;
  }

  return key;
}

const PLURAL_HEAD_RE = /\{(\w+),\s*plural,\s*/;

/**
 * Resolves a minimal ICU-lite plural block:
 *   "{count, plural, one {# produit} other {# produits}}"
 * Supports `=N` exact-match selectors (checked before the category
 * selector) and the standard CLDR categories via Intl.PluralRules. `#`
 * inside the chosen clause is replaced with the numeric count.
 */
function resolvePluralBlock(str: string, locale: Locale, params: TranslateParams): string {
  const match = PLURAL_HEAD_RE.exec(str);
  if (!match) return str;

  const blockStart = match.index;
  const paramName = match[1] ?? 'count';
  let i = blockStart + match[0].length;

  const clauses: Record<string, string> = {};

  while (i < str.length) {
    while (i < str.length && /\s/.test(str.charAt(i))) i++;
    if (str.charAt(i) === '}') {
      i++; // consume the plural block's own closing brace
      break;
    }

    const selectorMatch = /^(=\d+|\w+)/.exec(str.slice(i));
    if (!selectorMatch) break; // malformed input — bail out gracefully

    const selector = selectorMatch[0];
    i += selector.length;
    while (i < str.length && /\s/.test(str.charAt(i))) i++;
    if (str.charAt(i) !== '{') break; // malformed input — bail out gracefully

    i++; // consume clause's opening brace
    const contentStart = i;
    let depth = 1;
    while (i < str.length && depth > 0) {
      if (str.charAt(i) === '{') depth++;
      else if (str.charAt(i) === '}') depth--;
      if (depth > 0) i++;
    }
    clauses[selector] = str.slice(contentStart, i);
    i++; // consume clause's closing brace
  }

  const blockEnd = i;
  const rawCount = params[paramName];
  const count = typeof rawCount === 'number' ? rawCount : Number(rawCount ?? 0);
  const category = new Intl.PluralRules(locale).select(count);
  const chosen = (clauses[`=${count}`] ?? clauses[category] ?? clauses.other ?? '').replace(
    /#/g,
    String(count),
  );

  return str.slice(0, blockStart) + chosen + str.slice(blockEnd);
}

function interpolate(str: string, params: TranslateParams): string {
  return str.replace(/\{(\w+)\}/g, (full, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : full;
  });
}

/**
 * Builds a `t(key, params?)` function bound to a locale. Lookup is a
 * dot-path into the locale's catalog with a locale -> fr -> key fallback
 * chain, then plural resolution, then {param} interpolation.
 */
export function useT(locale: Locale): Translator {
  return function t(key: string, params?: TranslateParams): string {
    const raw = resolveRaw(key, locale);
    const p = params ?? {};
    const withPlural = PLURAL_HEAD_RE.test(raw) ? resolvePluralBlock(raw, locale, p) : raw;
    return interpolate(withPlural, p);
  };
}
