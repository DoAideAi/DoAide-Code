// The string utilities (/tools/string-utilities): case conversions, slug, reverse and counts,
// all computed in the page as you type.

export const MAX_STRING_CHARS = 100_000

// The words of an identifier or phrase, whatever its current style: splits on whitespace,
// punctuation, underscores/hyphens and camelCase boundaries (keeping acronyms like "HTTPServer").
export function splitWords(text) {
  return (
    text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .match(/[A-Za-z0-9]+/g) ?? []
  )
}

const lower = (w) => w.toLowerCase()
const title = (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()

// Every case conversion offered, keyed by what the page shows.
export const CASES = [
  ['camelCase', (t) => splitWords(t).map((w, i) => (i ? title(w) : lower(w))).join('')],
  ['PascalCase', (t) => splitWords(t).map(title).join('')],
  ['snake_case', (t) => splitWords(t).map(lower).join('_')],
  ['SCREAMING_SNAKE', (t) => splitWords(t).map((w) => w.toUpperCase()).join('_')],
  ['kebab-case', (t) => splitWords(t).map(lower).join('-')],
  ['Title Case', (t) => splitWords(t).map(title).join(' ')],
  ['Sentence case', (t) => {
    const words = splitWords(t).map(lower)
    return words.length ? [title(words[0]), ...words.slice(1)].join(' ') : ''
  }],
  ['UPPERCASE', (t) => t.toUpperCase()],
  ['lowercase', (t) => t.toLowerCase()],
]

// A URL slug: lowercase ASCII words joined by hyphens, accents folded away.
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// The text reversed by user-perceived characters, so emoji and accents survive.
export function reverseString(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...seg.segment(text)].map((s) => s.segment).reverse().join('')
  }
  return [...text].reverse().join('')
}

// Characters (user-perceived and raw), words, lines and UTF-8 bytes.
export function countString(text) {
  const words = (text.match(/\S+/g) ?? []).length
  const lines = text ? text.split('\n').length : 0
  let chars = [...text].length
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    chars = [...seg.segment(text)].length
  }
  return { chars, words, lines, bytes: new TextEncoder().encode(text).length }
}
