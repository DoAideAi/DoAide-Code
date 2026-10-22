// The code box on the free tools page: line numbers, live syntax colors (highlight.js, the same
// tokenizer as chat code blocks), a choice of color themes, and auto-indent on Enter and Tab.
// A transparent textarea sits over the highlighted <pre>, so typing and selection stay native.

import { useMemo, useRef } from 'react'
import { highlight } from '../highlight.js'

const THEME_KEY = 'doaide-editor-theme'

// Token colors per theme; comments stay muted everywhere.
export const EDITOR_THEMES = {
  Classic: { comment: 'text-zinc-500 italic', string: 'text-emerald-300', number: 'text-amber-300', keyword: 'text-violet-300' },
  Ocean: { comment: 'text-zinc-500 italic', string: 'text-sky-300', number: 'text-sky-200', keyword: 'text-emerald-300' },
  Plain: { comment: 'text-zinc-500 italic', string: 'text-zinc-300', number: 'text-zinc-300', keyword: 'font-semibold text-zinc-100' },
}

export function savedEditorTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return EDITOR_THEMES[value] ? value : 'Classic'
  } catch {
    return 'Classic'
  }
}

export function saveEditorTheme(name) {
  try {
    localStorage.setItem(THEME_KEY, name)
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
}

// What Enter should insert at `start`: a newline plus the current line's indentation, deeper by
// one step when the line opens a block ({, (, [ or a trailing colon).
export function autoIndent(value, start) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const line = value.slice(lineStart, start)
  const indent = /^[ \t]*/.exec(line)[0]
  return '\n' + indent + (/[{([:]\s*$/.test(line) ? '  ' : '')
}

const FONT = 'whitespace-pre font-mono text-[13px] leading-relaxed'

export default function CodeEditor({ id, testid, value, onChange, onRun, placeholder, language = '', theme: themeName }) {
  const taRef = useRef(null)
  const preRef = useRef(null)
  const gutterRef = useRef(null)
  const lang = language && language !== 'Auto-detect' ? language.toLowerCase() : ''
  const theme = EDITOR_THEMES[themeName] ?? EDITOR_THEMES[savedEditorTheme()]
  const tokens = useMemo(() => highlight(value, lang), [value, lang])

  // Inserted through execCommand where it exists (keeps native undo), else by hand.
  const insert = (text) => {
    const ta = taRef.current
    ta.focus()
    let done = false
    try {
      done = document.execCommand('insertText', false, text)
    } catch {
      done = false
    }
    if (!done) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end')
      onChange(ta.value)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onRun?.()
    } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      insert(autoIndent(e.target.value, e.target.selectionStart))
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // Tab indents; Shift+Tab still leaves the editor, so keyboards are never trapped.
      e.preventDefault()
      insert('  ')
    }
  }

  const onScroll = () => {
    const ta = taRef.current
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop
      preRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
  }

  const lineCount = value.split('\n').length
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-800 bg-shade/40 focus-within:border-zinc-600">
      <pre
        ref={gutterRef}
        aria-hidden
        data-testid={testid ? `${testid}-lines` : undefined}
        className={`select-none overflow-hidden py-3 pl-3 pr-2 text-right text-zinc-600 ${FONT}`}
      >
        {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
      </pre>
      <div className="relative min-w-0 flex-1">
        <pre ref={preRef} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden py-3 pl-1 pr-3 text-zinc-200 ${FONT}`}>
          {tokens.map((t, i) =>
            t.kind && theme[t.kind] ? (
              <span key={i} className={theme[t.kind]}>
                {t.text}
              </span>
            ) : (
              t.text
            ),
          )}
          {'\n'}
        </pre>
        <textarea
          ref={taRef}
          id={id}
          data-testid={testid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={12}
          wrap="off"
          className={`relative block w-full resize-y bg-transparent py-3 pl-1 pr-3 text-transparent caret-zinc-100 placeholder:text-zinc-600 focus:outline-none ${FONT}`}
        />
      </div>
    </div>
  )
}
