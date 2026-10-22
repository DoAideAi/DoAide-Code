// The code screenshot generator (/tools/code-screenshot): turn a snippet into a shareable
// PNG — gradient backdrop, editor window chrome, syntax colors from our own tokenizer. The
// image is built as an SVG string here (pure and testable); the page rasterizes it to PNG on a
// canvas, all in the browser.

import { highlight } from '../highlight.js'

export const MAX_SHOT_CHARS = 10_000
export const MAX_SHOT_LINES = 80

export const SHOT_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    backdrop: ['#2b2d42', '#0f1020'],
    window: '#16171f',
    text: '#e4e4e7',
    colors: { comment: '#6c7086', string: '#a6e3a1', number: '#fab387', keyword: '#cba6f7', added: '#a6e3a1', removed: '#f38ba8' },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    backdrop: ['#ff0080', '#ff8c00'],
    window: '#1d1226',
    text: '#f4e8ff',
    colors: { comment: '#9a7fb8', string: '#ffd166', number: '#ff9e64', keyword: '#ff7edb', added: '#9ece6a', removed: '#ff5370' },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    backdrop: ['#2e3192', '#1bffff'],
    window: '#0b1e2d',
    text: '#d6f3ff',
    colors: { comment: '#5f7e97', string: '#7fdbca', number: '#f78c6c', keyword: '#82aaff', added: '#addb67', removed: '#ef5350' },
  },
  {
    id: 'forest',
    name: 'Forest',
    backdrop: ['#134e5e', '#71b280'],
    window: '#10231c',
    text: '#e8f5e9',
    colors: { comment: '#6b8f71', string: '#b9f6ca', number: '#ffcc80', keyword: '#80cbc4', added: '#b9f6ca', removed: '#ef9a9a' },
  },
  {
    id: 'mono',
    name: 'Mono',
    backdrop: ['#232526', '#414345'],
    window: '#0a0a0a',
    text: '#fafafa',
    colors: { comment: '#737373', string: '#d4d4d4', number: '#a3a3a3', keyword: '#ffffff', added: '#d4d4d4', removed: '#a3a3a3' },
  },
]

export function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Tokenize and split into lines: [[{ text, kind }, …], …] — multi-line tokens (block comments,
// template strings) are cut at each newline so every line renders on its own <text> row.
export function tokenLines(code, lang) {
  const lines = [[]]
  for (const token of highlight(code, lang)) {
    const parts = token.text.split('\n')
    parts.forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines.at(-1).push({ text: part, kind: token.kind })
    })
  }
  return lines
}

const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const FONT_SIZE = 14
const CHAR_W = 8.43 // measured monospace advance at 14px
const LINE_H = 22

// The screenshot as a complete SVG document string, plus its pixel size.
export function buildShot({ code, lang = '', themeId = 'midnight', title = '', padding = 48, window: chrome = true }) {
  const theme = SHOT_THEMES.find((t) => t.id === themeId) ?? SHOT_THEMES[0]
  const lines = tokenLines(code.replace(/\t/g, '  '), lang).slice(0, MAX_SHOT_LINES)
  const maxChars = Math.max(...lines.map((l) => l.reduce((n, t) => n + t.text.length, 0)), title.length + 6, 24)
  const codePad = 20
  const headerH = chrome ? 40 : 0
  const winW = Math.ceil(maxChars * CHAR_W) + codePad * 2
  const winH = headerH + lines.length * LINE_H + codePad * 2
  const width = winW + padding * 2
  const height = winH + padding * 2

  const rows = lines
    .map((line, i) => {
      const y = padding + headerH + codePad + (i + 1) * LINE_H - 7
      const spans = line
        .map((t) => {
          const fill = theme.colors[t.kind]
          const style = t.kind === 'comment' ? ' font-style="italic"' : ''
          return `<tspan${fill ? ` fill="${fill}"` : ''}${style}>${escapeXml(t.text)}</tspan>`
        })
        .join('')
      return `<text x="${padding + codePad}" y="${y}" xml:space="preserve" font-family="${FONT}" font-size="${FONT_SIZE}" fill="${theme.text}">${spans}</text>`
    })
    .join('\n    ')

  const dots = chrome
    ? `<circle cx="${padding + 22}" cy="${padding + 20}" r="6" fill="#ff5f57"/>` +
      `<circle cx="${padding + 42}" cy="${padding + 20}" r="6" fill="#febc2e"/>` +
      `<circle cx="${padding + 62}" cy="${padding + 20}" r="6" fill="#28c840"/>` +
      (title
        ? `<text x="${width / 2}" y="${padding + 25}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${theme.text}" opacity="0.6">${escapeXml(title)}</text>`
        : '')
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.backdrop[0]}"/>
      <stop offset="100%" stop-color="${theme.backdrop[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="${padding}" y="${padding}" width="${winW}" height="${winH}" rx="12" fill="${theme.window}" opacity="0.96"/>
  ${dots}
    ${rows}
</svg>`
  return { svg, width, height, truncated: code.split('\n').length > MAX_SHOT_LINES }
}
