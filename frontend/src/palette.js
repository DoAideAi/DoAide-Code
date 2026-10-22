// What the command palette offers, from the app's current state. `act` holds the callbacks; a
// null one (offline, busy, nothing to export) leaves its items out rather than showing dead ones.
import { shortcutLabel } from './hooks/useShortcuts.js'
import { modelLabel } from './components/ModelPicker.jsx'

const COMMANDS = [
  ['/help', 'Show all commands'],
  ['/undo', 'Undo the last file changes'],
  ['/usage', 'Show tokens and cost'],
  ['/models', 'Check which models can run'],
  ['/projects', 'List projects'],
]

export function paletteItems({ keys, models = null, projects = [], project = null, sessions = [], sessionId = null, muted = true, act }) {
  const items = []
  const add = (group, id, label, run, hint = null) => run && items.push({ group, id, label, run, hint })

  add('Actions', 'new-chat', 'New chat', act.newChat, shortcutLabel(keys, 'newChat'))
  add('Actions', 'search', 'Search all conversations', act.search)
  add('Actions', 'clear', 'Clear the chat from view', act.clear, shortcutLabel(keys, 'clear'))
  add('Actions', 'sidebar', 'Show conversations and files', act.sidebar)
  add('Actions', 'export', 'Export chat as Markdown', act.exportChat)
  add('Actions', 'settings', 'Settings', act.settings)
  add('Actions', 'models', 'Models and benchmarks', act.models)
  add('Actions', 'usage', 'Usage and cost', act.usage)
  add('Actions', 'how', 'How it works', act.how)
  add('Actions', 'mute', muted ? 'Unmute notifications' : 'Mute notifications', act.toggleMute)
  for (const [choice, label] of [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]) {
    add('Theme', `theme-${choice}`, `Theme: ${label}`, act.setTheme && (() => act.setTheme(choice)))
  }

  if (act.chooseModel && models?.executors?.length) {
    const pinned = models.pinned ?? null
    const choices = [{ name: null, usable: true }, ...models.executors].filter((e) => e.usable && e.name !== pinned)
    for (const e of choices) {
      add('Model', `model-${e.name ?? 'auto'}`, `Use model: ${modelLabel(e.name)}`, () => act.chooseModel(e.name ?? 'auto'))
    }
  }

  if (act.switchProject) {
    for (const name of projects.filter((p) => p !== project)) {
      add('Project', `project-${name}`, `Switch to project: ${name}`, () => act.switchProject(name))
    }
  }

  if (act.openSession) {
    for (const s of sessions.filter((s) => s.id !== sessionId).slice(0, 15)) {
      add('Conversation', `session-${s.id}`, s.title || 'Untitled conversation', () => act.openSession(s.id))
    }
  }

  if (act.send) {
    for (const [command, label] of COMMANDS) add('Command', `cmd-${command}`, `${label} (${command})`, () => act.send(command))
  }
  return items
}
