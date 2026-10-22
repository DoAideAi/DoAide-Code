import { create } from 'zustand'

export const initialChat = {
  project: null,
  sessionId: null,
  messages: [],
  // Older messages remain on the server (a snapshot carries only the latest few).
  hasMore: false,
  serverStatus: 'idle', // idle | busy | error
  mode: 'local', // local: this server runs the models | hub: prompts are relayed to the laptop
  agentOnline: false, // hub mode only: is the laptop agent connected?
  // What the laptop can run, detected from `ollama list` / `claude auth status` /
  // `codex login status`; null until the laptop (or local server) reports it.
  models: null,
}

// Messages kept from a snapshot (page load, session switch): the latest few, not the whole chat.
export const SNAPSHOT_MESSAGES = 10

// A message without its draft: the local model's unchecked attempt, replaced by the answer.
function withoutDraft(m) {
  if (!('draft' in m)) return m
  const { draft: _draft, ...rest } = m
  return rest
}

// Pure reducer for server events, kept separate from the store so it is easy to test.
export function applyEvent(state, event) {
  switch (event.type) {
    case 'snapshot':
      return {
        ...state,
        project: event.project,
        sessionId: event.session_id ?? null,
        messages: (event.messages ?? []).slice(-SNAPSHOT_MESSAGES),
        hasMore: Boolean(event.has_more) || (event.messages ?? []).length > SNAPSHOT_MESSAGES,
        serverStatus: event.status,
        mode: event.mode ?? 'local',
        agentOnline: Boolean(event.agent_online),
        // Local snapshots leave models to a separate event; keep what we have.
        models: 'models' in event ? event.models : state.models,
      }
    case 'message': {
      const exists = state.messages.some((m) => m.id === event.message.id)
      const messages = exists
        ? state.messages.map((m) => (m.id === event.message.id ? event.message : m))
        : [...state.messages, event.message]
      return { ...state, messages }
    }
    case 'earlier': {
      // An older page from "Load earlier messages"; ignored if the session changed meanwhile.
      if (event.session_id !== state.sessionId) return state
      const known = new Set(state.messages.map((m) => m.id))
      const older = event.messages.filter((m) => !known.has(m.id))
      return { ...state, messages: [...older, ...state.messages], hasMore: Boolean(event.has_more) }
    }
    case 'clear-view': {
      // Ctrl+L: an empty screen, as in a terminal. The conversation goes on (the models still see
      // it) and "Load earlier messages" brings it back. A reply still being written stays.
      const live = state.messages.filter((m) => m.status === 'streaming' || m.status === 'queued')
      return { ...state, messages: live, hasMore: state.hasMore || live.length < state.messages.length }
    }
    case 'delta':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id ? { ...withoutDraft(m), content: m.content + event.text } : m,
        ),
      }
    case 'draft':
      // The free local attempt streaming in while it is checked; `clear` when it was escalated.
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id ? (event.clear ? withoutDraft(m) : { ...m, draft: (m.draft ?? '') + event.text }) : m,
        ),
      }
    case 'done':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id
            ? {
                ...withoutDraft(m),
                content: event.content,
                status: event.status,
                role: event.role ?? m.role,
                meta: event.meta ?? m.meta,
              }
            : m,
        ),
      }
    case 'changes':
      // A proposed changeset was applied or discarded (possibly from another device).
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id ? { ...m, meta: { ...m.meta, changes: event.changes } } : m,
        ),
      }
    case 'status':
      return { ...state, serverStatus: event.state }
    case 'agent':
      // A disconnected laptop's report is stale: nothing runs until it reconnects.
      return { ...state, agentOnline: event.online, models: event.online ? state.models : null }
    case 'models':
      return { ...state, models: event.models ?? null }
    case 'project':
      return { ...state, project: event.project }
    case 'notice':
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: `notice-${Date.now()}`, role: 'system', content: event.text, status: 'done' },
        ],
      }
    default:
      return state
  }
}

export const useChat = create((set) => ({
  ...initialChat,
  connection: 'closed', // connecting | open | closed
  apply: (event) => set((state) => applyEvent(state, event)),
  setConnection: (connection) => set({ connection }),
}))

// Usable tools from a models report, e.g. for the top bar summary.
export function usableTools(models) {
  return (models?.tools ?? []).filter((t) => t.usable)
}

// green: connected and healthy; red: last run failed; gray: offline (including, on the
// hub, when the laptop that runs the models is not connected).
export function statusColor(connection, serverStatus, mode = 'local', agentOnline = false) {
  if (connection !== 'open') return 'gray'
  if (mode === 'hub' && !agentOnline) return 'gray'
  return serverStatus === 'error' ? 'red' : 'green'
}
