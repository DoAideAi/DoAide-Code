// The ASCII art generator (/tools/ascii-art): text rendered with FIGlet fonts. Each font is its own
// chunk, imported the first time it is picked, so the page only downloads what is used.

import figlet from 'figlet'

export const FONTS = {
  Standard: () => import('figlet/importable-fonts/Standard.js'),
  'ANSI Shadow': () => import('figlet/importable-fonts/ANSI Shadow.js'),
  Slant: () => import('figlet/importable-fonts/Slant.js'),
  Big: () => import('figlet/importable-fonts/Big.js'),
  Small: () => import('figlet/importable-fonts/Small.js'),
  Doom: () => import('figlet/importable-fonts/Doom.js'),
  Banner: () => import('figlet/importable-fonts/Banner.js'),
  Block: () => import('figlet/importable-fonts/Block.js'),
  Shadow: () => import('figlet/importable-fonts/Shadow.js'),
  'Star Wars': () => import('figlet/importable-fonts/Star Wars.js'),
  '3-D': () => import('figlet/importable-fonts/3-D.js'),
  Graffiti: () => import('figlet/importable-fonts/Graffiti.js'),
  Lean: () => import('figlet/importable-fonts/Lean.js'),
  Script: () => import('figlet/importable-fonts/Script.js'),
  Bubble: () => import('figlet/importable-fonts/Bubble.js'),
  Digital: () => import('figlet/importable-fonts/Digital.js'),
  Mini: () => import('figlet/importable-fonts/Mini.js'),
  Isometric1: () => import('figlet/importable-fonts/Isometric1.js'),
}

export const LAYOUTS = ['default', 'fitted', 'full']

export const COMMENTS = {
  none: 'Plain',
  slash: '// JS, C, Go',
  hash: '# Python, shell',
  block: '/* CSS, C */',
  html: '<!-- HTML -->',
  dash: '-- SQL, Lua',
}

const loaded = new Set()

export async function loadFont(name) {
  if (!FONTS[name]) throw new Error(`Unknown font: ${name}`)
  if (!loaded.has(name)) {
    const mod = await FONTS[name]()
    figlet.parseFont(name, mod.default)
    loaded.add(name)
  }
}

// The art for `text` (one figlet block per input line); trailing blank rows and spaces trimmed.
export async function renderAscii(text, font = 'Standard', { layout = 'default', width = 0 } = {}) {
  await loadFont(font)
  const opts = { font, horizontalLayout: layout }
  if (width > 0) Object.assign(opts, { width, whitespaceBreak: true })
  return text
    .split(/\r?\n/)
    .map((line) => (line.trim() ? figlet.textSync(line, opts) : ''))
    .join('\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n+$/, '')
}

// Wraps art in a source-code comment so it can sit at the top of a file.
export function wrapComment(art, style) {
  const lines = art.split('\n')
  if (style === 'slash') return lines.map((l) => `// ${l}`.trimEnd()).join('\n')
  if (style === 'hash') return lines.map((l) => `# ${l}`.trimEnd()).join('\n')
  if (style === 'dash') return lines.map((l) => `-- ${l}`.trimEnd()).join('\n')
  // Block and HTML comments break if the art itself contains the closing token.
  if (style === 'block') return `/*\n${art.replaceAll('*/', '* /')}\n*/`
  if (style === 'html') return `<!--\n${art.replaceAll('-->', '- ->').replaceAll('--', '- -')}\n-->`
  return art
}
