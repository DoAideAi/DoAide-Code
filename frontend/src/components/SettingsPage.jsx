import { useEffect, useState } from 'react'
import { DEFAULT_KEYS, keyProblem, loadKeys, saveKeys, shortcutLabel } from '../hooks/useShortcuts.js'
import { onThemeChange, saveTheme, themeChoice } from '../theme.js'
import { modelLabel } from './ModelPicker.jsx'

const THEMES = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
]

const SHORTCUTS = [
  ['newChat', 'New chat'],
  ['clear', 'Clear the chat from view'],
  ['stop', 'Stop the reply'],
]

function Section({ title, hint = null, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </section>
  )
}

// Segmented buttons, e.g. System | Light | Dark.
function Choice({ name, options, value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map(([id, label, usable = true]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          data-testid={`${name}-${id}`}
          disabled={disabled || !usable}
          onClick={() => onChange(id)}
          className={`rounded-full border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
            value === id
              ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
              : 'border-line/[0.08] text-zinc-300 hover:bg-zinc-800/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Appearance() {
  const [choice, setChoice] = useState(themeChoice)
  // The header toggle saves too; keep the selection true to it.
  useEffect(() => onThemeChange(() => setChoice(themeChoice())), [])
  return (
    <Section title="Theme" hint="System follows your device's light or dark setting.">
      <Choice name="theme" options={THEMES} value={choice} onChange={(c) => saveTheme(c)} />
    </Section>
  )
}

function DefaultModel({ models, onChoose }) {
  const executors = models?.executors ?? []
  const options = [['auto', 'Auto'], ...executors.map((e) => [e.name, modelLabel(e.name), e.usable])]
  return (
    <Section
      title="Default model"
      hint="Tried first for every task, saved on your laptop. Auto picks the cheapest model that passes the checks; if a chosen model's answer fails them, the usual order takes over."
    >
      {executors.length ? (
        <Choice name="model" options={options} value={models.pinned ?? 'auto'} onChange={onChoose} disabled={!onChoose} />
      ) : (
        <p className="text-sm text-zinc-500">Shown once your laptop reports its models.</p>
      )}
      {executors.length > 0 && !onChoose && <p className="text-xs text-zinc-500">Can be changed while connected and idle.</p>}
    </Section>
  )
}

// One shortcut: on/off, and for the Ctrl/Cmd ones a key to press to change it.
function ShortcutRow({ action, label, keys, onChange }) {
  const [recording, setRecording] = useState(false)
  const [problem, setProblem] = useState(null)
  const on = keys[action] !== null
  const record = (e) => {
    if (['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      setRecording(false)
      return
    }
    const key = e.key.toLowerCase()
    const why = keyProblem(keys, action, key)
    setProblem(why)
    if (!why) {
      onChange({ ...keys, [action]: key })
      setRecording(false)
    }
  }
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2.5">
      <span className="min-w-0 flex-1 text-sm text-zinc-200">{label}</span>
      {action === 'stop' ? (
        <kbd className="rounded border border-line/[0.1] px-1.5 py-0.5 font-mono text-xs text-zinc-300">Esc</kbd>
      ) : (
        <button
          type="button"
          data-testid={`shortcut-${action}`}
          disabled={!on}
          onClick={() => {
            setProblem(null)
            setRecording(true)
          }}
          onKeyDown={recording ? record : undefined}
          onBlur={() => setRecording(false)}
          className={`min-w-[5.5rem] rounded border px-2 py-0.5 font-mono text-xs disabled:opacity-40 ${
            recording ? 'border-sky-500/60 text-sky-200' : 'border-line/[0.1] text-zinc-300 hover:bg-zinc-800/70'
          }`}
        >
          {recording ? 'Press a key…' : (shortcutLabel(keys, action) ?? shortcutLabel(DEFAULT_KEYS, action))}
        </button>
      )}
      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        <input
          type="checkbox"
          data-testid={`shortcut-${action}-on`}
          checked={on}
          onChange={(e) => onChange({ ...keys, [action]: e.target.checked ? DEFAULT_KEYS[action] : null })}
        />
        On
      </label>
      {problem && (
        <p role="alert" className="basis-full text-xs text-red-400">
          {problem}
        </p>
      )}
    </li>
  )
}

function Shortcuts() {
  const [keys, setKeys] = useState(loadKeys)
  const change = (next) => {
    // Turning one back on takes its default key; if another shortcut now has it, leave it off.
    for (const action of ['newChat', 'clear']) {
      if (next[action] && next[action] !== keys[action] && keyProblem(next, action, next[action])) next[action] = null
    }
    setKeys(saveKeys(next))
  }
  const changed = JSON.stringify(keys) !== JSON.stringify(DEFAULT_KEYS)
  return (
    <Section title="Keyboard shortcuts" hint="Click a shortcut, then press the new key. Saved in this browser.">
      <ul className="divide-y divide-line/[0.06] rounded-xl border border-line/[0.08]">
        {SHORTCUTS.map(([action, label]) => (
          <ShortcutRow key={action} action={action} label={label} keys={keys} onChange={change} />
        ))}
      </ul>
      {changed && (
        <button
          type="button"
          data-testid="shortcuts-reset"
          onClick={() => setKeys(saveKeys({ ...DEFAULT_KEYS }))}
          className="self-start text-xs text-zinc-400 underline hover:text-zinc-200"
        >
          Reset to defaults
        </button>
      )}
    </Section>
  )
}

export default function SettingsPage({ models = null, onChooseModel = null, onClose }) {
  return (
    <div data-testid="settings-page" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-zinc-100">Settings</h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>
        <Appearance />
        <DefaultModel models={models} onChoose={onChooseModel} />
        <Shortcuts />
      </div>
    </div>
  )
}
