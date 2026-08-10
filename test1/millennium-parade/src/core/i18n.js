const strings = {
  ja: {
    'nav.logo':        'ミレニアム・パレード',
    'nav.top':         'トップ',
    'nav.works':       '作品',
    'nav.newtown':     'ニュータウン',
    'nav.join':        '参加する',

    'top.label':       'MILLENNIUM PARADE',
    'top.heading':     '新しい\n世界へ',
    'top.sub':         '音楽と映像が交差する場所',

    'works.label':     'DISCOGRAPHY / WORKS',
    'works.heading':   '作品集',
    'works.sub':       '2019 – 2024',
    'works.scroll':    'スクロールで切り替え',

    'newtown.label':   'NEW TOWN',
    'newtown.heading': 'ニュー\nタウン',
    'newtown.sub':     '郊外の記憶と、未来の廃墟',
    'newtown.body':    '千葉ニュータウン——バブル期に建設され、いま静かに朽ちていく都市の夢。\nミレニアムパレードはその廃墟から音楽を掘り起こす。',

    'join.label':      'JOIN US',
    'join.heading':    '共に\n作ろう',
    'join.sub':        '次世代のクリエイターへ',
    'join.body':       'ミレニアムパレードは常に新しい才能を求めている。\nあなたの言語で、あなたの声で。',
    'join.cta':        '応募する',
  },
  en: {
    'nav.logo':        'MILLENNIUM PARADE',
    'nav.top':         'TOP',
    'nav.works':       'WORKS',
    'nav.newtown':     'NEW TOWN',
    'nav.join':        'JOIN US',

    'top.label':       'MILLENNIUM PARADE',
    'top.heading':     'Into a\nNew World',
    'top.sub':         'Where music and image collide',

    'works.label':     'DISCOGRAPHY / WORKS',
    'works.heading':   'Works',
    'works.sub':       '2019 – 2024',
    'works.scroll':    'Scroll to browse',

    'newtown.label':   'NEW TOWN',
    'newtown.heading': 'New\nTown',
    'newtown.sub':     'The memory of suburbs, the ruin of futures',
    'newtown.body':    'Chiba New Town — a city dream built in the bubble era, now quietly decaying.\nMillennium Parade excavates music from its ruins.',

    'join.label':      'JOIN US',
    'join.heading':    'Create\nTogether',
    'join.sub':        'For next-generation creators',
    'join.body':       'Millennium Parade is always searching for new talent.\nIn your language, in your voice.',
    'join.cta':        'Apply',
  },
}

let lang = 'ja'

export function initI18n() {
  applyStrings()

  document.getElementById('lang-toggle').addEventListener('click', () => {
    lang = lang === 'ja' ? 'en' : 'ja'
    document.getElementById('lang-toggle').textContent = lang === 'ja' ? 'EN' : 'JP'
    document.documentElement.lang = lang
    applyStrings()
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }))
  })
}

function applyStrings() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n
    const val = strings[lang][key]
    if (val !== undefined) el.innerHTML = val.replace(/\n/g, '<br>')
  })
}

export function t(key) {
  return strings[lang][key] ?? key
}

export function getLang() {
  return lang
}
