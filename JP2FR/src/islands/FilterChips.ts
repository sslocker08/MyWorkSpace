// critique: P4 H4 E4 S4 R4 V3
//
// Binds `[data-filter-root]` sections: a chip row that filters sibling grid
// cards by a data-* facet attribute (category or craft — both draw from the
// same 5-value enum in src/content.config.ts), announces the live result
// count, and reveals an empty-state block with a "clear filters" affordance
// when nothing matches. Used by both /founders/ (facet="craft") and
// /products/ (facet="category").
//
// DOM contract (everything below lives inside one `[data-filter-root]`):
//   data-filter-attr            "category" | "craft" — which data-* attribute
//                               on grid children this root filters by
//   [data-filter-chips]         the chip button row
//     [data-filter-chip]        each chip; data-filter-value="all"|<enum>
//                               (omitted/"all" = the reset chip)
//   [data-filter-grid]          the card grid; every direct child is a
//                               filterable item carrying data-category or
//                               data-craft matching data-filter-attr (see
//                               FounderCard.astro / ProductCard.astro,
//                               which always emit both attributes)
//   [data-filter-count]         aria-live="polite" text node; reads its
//                               data-template-one / data-template-other
//                               attributes (server-precomputed ICU clauses
//                               with '#' left as the count placeholder — see
//                               pluralTemplates() in the two index pages)
//                               and Intl.PluralRules-selects between them
//   [data-filter-empty]         empty-state block; `hidden` toggled
//     [data-filter-clear]       button inside it that resets to "all"
//
// URL: reads `?cat=` on init to preselect a chip (falls back to "all" if the
// value doesn't match any known chip), and replaces it via
// history.replaceState (no new history entry) whenever the user picks a
// different chip — so the LP category cards' `?cat=` links preselect a
// filter on arrival, and the current filter survives reload/share.
//
// Visibility is toggled via the native `hidden` attribute/property, which
// global.css enforces with `[hidden] { display: none !important }` (see
// header comment there) — this module never touches `display` itself.

const ROOT_SELECTOR = '[data-filter-root]';
const PARAM = 'cat';
const ALL = 'all';

function pluralPick(count: number, locale: string, one: string, other: string): string {
  let category: string;
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = count === 1 ? 'one' : 'other';
  }
  const template = category === 'one' ? one : other;
  return template.replace(/#/g, String(count));
}

function bindRoot(root: HTMLElement): void {
  const facetAttr = root.dataset.filterAttr === 'category' ? 'category' : 'craft';
  const chipsWrap = root.querySelector('[data-filter-chips]');
  const gridCandidate = root.querySelector('[data-filter-grid]');
  if (!chipsWrap || !(gridCandidate instanceof HTMLElement)) return;
  const grid: HTMLElement = gridCandidate;

  const countEl = root.querySelector('[data-filter-count]');
  const emptyEl = root.querySelector('[data-filter-empty]');
  const clearBtn = root.querySelector('[data-filter-clear]');

  const chips = Array.from(chipsWrap.querySelectorAll('[data-filter-chip]')).filter(
    (el): el is HTMLButtonElement => el instanceof HTMLButtonElement,
  );
  const items = Array.from(grid.children).filter((el): el is HTMLElement => el instanceof HTMLElement);
  const locale = document.documentElement.lang || 'fr';

  function applyFilter(rawValue: string, opts: { updateUrl: boolean }): void {
    const active = rawValue || ALL;

    chips.forEach((chip) => {
      const isActive = (chip.dataset.filterValue || ALL) === active;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });

    let visibleCount = 0;
    items.forEach((item) => {
      const matches = active === ALL || item.dataset[facetAttr] === active;
      item.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (countEl instanceof HTMLElement) {
      const one = countEl.dataset.templateOne ?? '';
      const other = countEl.dataset.templateOther ?? '';
      countEl.textContent = pluralPick(visibleCount, locale, one, other);
    }

    if (emptyEl instanceof HTMLElement) emptyEl.hidden = visibleCount > 0;
    grid.hidden = visibleCount === 0;

    if (opts.updateUrl) {
      const url = new URL(window.location.href);
      if (active === ALL) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, active);
      window.history.replaceState(window.history.state, '', url);
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      applyFilter(chip.dataset.filterValue || ALL, { updateUrl: true });
    });
  });

  if (clearBtn instanceof HTMLElement) {
    clearBtn.addEventListener('click', () => applyFilter(ALL, { updateUrl: true }));
  }

  const fromUrl = new URL(window.location.href).searchParams.get(PARAM);
  const initial = fromUrl && chips.some((chip) => chip.dataset.filterValue === fromUrl) ? fromUrl : ALL;
  applyFilter(initial, { updateUrl: false });
}

function init(): void {
  document.querySelectorAll(ROOT_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) bindRoot(el);
  });
}

init();
