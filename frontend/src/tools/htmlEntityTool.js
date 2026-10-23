// The HTML entity encoder/decoder (/tools/html-entities): escape text for HTML with named or
// numeric references, and turn any named, decimal or hex reference back into characters.

// Named references for the characters people actually meet; decoding also falls back to the
// browser's own table for the rest of the ~2,000 HTML5 names.
export const NAMED = {
  '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos',
  ' ': 'nbsp', '¡': 'iexcl', '¢': 'cent', '£': 'pound', '¤': 'curren', '¥': 'yen', '¦': 'brvbar', '§': 'sect',
  '¨': 'uml', '©': 'copy', 'ª': 'ordf', '«': 'laquo', '¬': 'not', '­': 'shy', '®': 'reg', '¯': 'macr', '°': 'deg',
  '±': 'plusmn', '²': 'sup2', '³': 'sup3', '´': 'acute', 'µ': 'micro', '¶': 'para', '·': 'middot', '¸': 'cedil',
  '¹': 'sup1', 'º': 'ordm', '»': 'raquo', '¼': 'frac14', '½': 'frac12', '¾': 'frac34', '¿': 'iquest',
  'À': 'Agrave', 'Á': 'Aacute', 'Â': 'Acirc', 'Ã': 'Atilde', 'Ä': 'Auml', 'Å': 'Aring', 'Æ': 'AElig', 'Ç': 'Ccedil',
  'È': 'Egrave', 'É': 'Eacute', 'Ê': 'Ecirc', 'Ë': 'Euml', 'Ì': 'Igrave', 'Í': 'Iacute', 'Î': 'Icirc', 'Ï': 'Iuml',
  'Ñ': 'Ntilde', 'Ò': 'Ograve', 'Ó': 'Oacute', 'Ô': 'Ocirc', 'Õ': 'Otilde', 'Ö': 'Ouml', '×': 'times', 'Ø': 'Oslash',
  'Ù': 'Ugrave', 'Ú': 'Uacute', 'Û': 'Ucirc', 'Ü': 'Uuml', 'Ý': 'Yacute', 'ß': 'szlig',
  'à': 'agrave', 'á': 'aacute', 'â': 'acirc', 'ã': 'atilde', 'ä': 'auml', 'å': 'aring', 'æ': 'aelig', 'ç': 'ccedil',
  'è': 'egrave', 'é': 'eacute', 'ê': 'ecirc', 'ë': 'euml', 'ì': 'igrave', 'í': 'iacute', 'î': 'icirc', 'ï': 'iuml',
  'ñ': 'ntilde', 'ò': 'ograve', 'ó': 'oacute', 'ô': 'ocirc', 'õ': 'otilde', 'ö': 'ouml', '÷': 'divide', 'ø': 'oslash',
  'ù': 'ugrave', 'ú': 'uacute', 'û': 'ucirc', 'ü': 'uuml', 'ý': 'yacute', 'ÿ': 'yuml',
  'Œ': 'OElig', 'œ': 'oelig', 'Š': 'Scaron', 'š': 'scaron', 'Ÿ': 'Yuml', 'ƒ': 'fnof', 'ˆ': 'circ', '˜': 'tilde',
  'Α': 'Alpha', 'Β': 'Beta', 'Γ': 'Gamma', 'Δ': 'Delta', 'Θ': 'Theta', 'Λ': 'Lambda', 'Π': 'Pi', 'Σ': 'Sigma', 'Φ': 'Phi', 'Ψ': 'Psi', 'Ω': 'Omega',
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'θ': 'theta', 'λ': 'lambda', 'μ': 'mu', 'π': 'pi', 'σ': 'sigma', 'τ': 'tau', 'φ': 'phi', 'ψ': 'psi', 'ω': 'omega',
  ' ': 'ensp', ' ': 'emsp', ' ': 'thinsp', '‌': 'zwnj', '‍': 'zwj',
  '–': 'ndash', '—': 'mdash', '‘': 'lsquo', '’': 'rsquo', '‚': 'sbquo', '“': 'ldquo', '”': 'rdquo', '„': 'bdquo',
  '†': 'dagger', '‡': 'Dagger', '•': 'bull', '…': 'hellip', '‰': 'permil', '′': 'prime', '″': 'Prime', '‹': 'lsaquo', '›': 'rsaquo',
  '€': 'euro', '™': 'trade', '←': 'larr', '↑': 'uarr', '→': 'rarr', '↓': 'darr', '↔': 'harr', '⇒': 'rArr', '⇔': 'hArr',
  '∀': 'forall', '∂': 'part', '∃': 'exist', '∅': 'empty', '∇': 'nabla', '∈': 'isin', '∉': 'notin', '∏': 'prod', '∑': 'sum',
  '−': 'minus', '√': 'radic', '∞': 'infin', '∧': 'and', '∨': 'or', '∩': 'cap', '∪': 'cup', '∫': 'int', '≈': 'asymp',
  '≠': 'ne', '≡': 'equiv', '≤': 'le', '≥': 'ge', '⊂': 'sub', '⊃': 'sup', '◊': 'loz', '♠': 'spades', '♣': 'clubs', '♥': 'hearts', '♦': 'diams',
}

const BY_NAME = Object.fromEntries(Object.entries(NAMED).map(([ch, name]) => [name, ch]))

export const MODES = {
  minimal: 'Only & < > " \'',
  named: 'Named where possible',
  numeric: 'Numeric (decimal)',
  hex: 'Numeric (hex)',
}

const SPECIAL = /[&<>"']/

// mode: minimal escapes only HTML-significant characters; the others also escape every non-ASCII
// character (named first for 'named', else numeric). `everything` escapes printable ASCII too.
export function encode(text, mode = 'named', { everything = false } = {}) {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    const needs = SPECIAL.test(ch) || (mode !== 'minimal' && cp > 126) || (everything && cp > 32 && !/[a-zA-Z0-9]/.test(ch))
    if (!needs) out += ch
    else if ((mode === 'named' || mode === 'minimal') && NAMED[ch]) out += `&${NAMED[ch]};`
    else if (mode === 'hex') out += `&#x${cp.toString(16).toUpperCase()};`
    else out += `&#${cp};`
  }
  return out
}

// Names not in NAMED, resolved by the browser's parser (a detached <textarea> never runs scripts).
function browserLookup(name) {
  if (typeof document === 'undefined') return null
  const el = document.createElement('textarea')
  el.innerHTML = `&${name};`
  // Legacy names decode as prefixes (&notit; → ¬it;), so only accept a fully consumed reference.
  return el.value.includes(';') || [...el.value].length > 2 ? null : el.value
}

// Decodes &name; &#123; &#x7B; references; unknown names and invalid code points are left as written.
export function decode(text) {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, ref) => {
    if (ref[0] === '#') {
      const cp = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10)
      if (!cp || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return whole
      return String.fromCodePoint(cp)
    }
    return BY_NAME[ref] ?? browserLookup(ref) ?? whole
  })
}

// Reference rows for the cheat sheet: [char, name, decimal, description].
export const REFERENCE = [
  ['&', 'amp', 'Ampersand'], ['<', 'lt', 'Less than'], ['>', 'gt', 'Greater than'], ['"', 'quot', 'Double quote'], ["'", 'apos', 'Apostrophe'],
  [' ', 'nbsp', 'Non-breaking space'], ['©', 'copy', 'Copyright'], ['®', 'reg', 'Registered'], ['™', 'trade', 'Trademark'],
  ['€', 'euro', 'Euro'], ['£', 'pound', 'Pound'], ['¥', 'yen', 'Yen'], ['¢', 'cent', 'Cent'], ['°', 'deg', 'Degree'],
  ['±', 'plusmn', 'Plus-minus'], ['×', 'times', 'Multiply'], ['÷', 'divide', 'Divide'], ['≠', 'ne', 'Not equal'], ['≤', 'le', 'Less or equal'], ['≥', 'ge', 'Greater or equal'],
  ['–', 'ndash', 'En dash'], ['—', 'mdash', 'Em dash'], ['…', 'hellip', 'Ellipsis'], ['•', 'bull', 'Bullet'], ['·', 'middot', 'Middle dot'],
  ['‘', 'lsquo', 'Left single quote'], ['’', 'rsquo', 'Right single quote'], ['“', 'ldquo', 'Left double quote'], ['”', 'rdquo', 'Right double quote'],
  ['«', 'laquo', 'Left guillemet'], ['»', 'raquo', 'Right guillemet'], ['←', 'larr', 'Left arrow'], ['→', 'rarr', 'Right arrow'], ['↑', 'uarr', 'Up arrow'], ['↓', 'darr', 'Down arrow'],
  ['§', 'sect', 'Section'], ['¶', 'para', 'Pilcrow'], ['½', 'frac12', 'One half'], ['∞', 'infin', 'Infinity'], ['♥', 'hearts', 'Heart'],
].map(([ch, name, desc]) => [ch, name, ch.codePointAt(0), desc])
