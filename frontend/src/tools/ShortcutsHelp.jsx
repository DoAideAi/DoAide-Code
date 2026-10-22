// The keyboard shortcuts panel on the tool pages: a small button, and a dialog that also opens
// on "?" (outside the inputs). The dialog takes focus, keeps Tab inside, closes on Escape and
// gives focus back to the button.

import { useEffect, useRef, useState } from 'react'
import { MOD_KEY } from '../hooks/useShortcuts.js'

// [keys, what it does]; MOD is replaced with ⌘ on a Mac and Ctrl elsewhere.
export const EDITOR_SHORTCUTS = [
  ['MOD+Enter', 'Run the tool'],
  ['Tab', 'Indent (in the code editor)'],
  ['Shift+Tab', 'Leave the code editor'],
  ['?', 'Open this panel'],
  ['Esc', 'Close this panel'],
]

const mod = (keys) => keys.replace('MOD+', MOD_KEY.endsWith('+') ? MOD_KEY : MOD_KEY + ' ')

export default function ShortcutsHelp({ shortcuts = EDITOR_SHORTCUTS }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const dialogRef = useRef(null)

  // "?" opens the panel when the keyboard is not in a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The dialog takes focus while open; Escape closes, Tab stays inside.
  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll('button')
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        data-testid="shortcuts-open"
        onClick={() => setOpen(true)}
        className="self-start rounded-md px-1 text-xs text-zinc-500 underline decoration-zinc-700 hover:text-zinc-300"
      >
        Keyboard shortcuts
      </button>
      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            data-testid="shortcuts-panel"
            ref={dialogRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-zinc-700 bg-surface p-4 shadow-xl focus:outline-none"
          >
            <h2 className="text-sm font-medium text-zinc-100">Keyboard shortcuts</h2>
            <dl className="mt-3 flex flex-col gap-2">
              {shortcuts.map(([keys, what]) => (
                <div key={keys} className="flex items-center justify-between gap-4">
                  <dt>
                    <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-zinc-200">{mod(keys)}</kbd>
                  </dt>
                  <dd className="text-sm text-zinc-400">{what}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              data-testid="shortcuts-close"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              className="mt-4 min-h-[44px] w-full rounded-md border border-zinc-800 px-3 text-sm text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
