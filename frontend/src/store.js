import { create } from 'zustand'

export const initialChat = {
  sessionId: null,
  project: null,
  messages: [],
  serverStatus: 'idle', // idle | busy | error
  mode: 'local', // local: this server runs the models | hub: prompts are relayed to the laptop
  agentOnline: false, // hub mode only: is the laptop agent connected?
}

// Pure reducer for server events, kept separate from the store so it is easy to test.
export function applyEvent(state, event) {
  switch (event.type) {
    case 'snapshot':
      return {
        ...state,
        sessionId: event.session_id,
        project: event.project,
        messages: event.messages,
        serverStatus: event.status,
        mode: event.mode ?? 'local',
        agentOnline: Boolean(event.agent_online),
      }
    case 'message': {
      const exists = state.messages.some((m) => m.id === event.message.id)
      const messages = exists
        ? state.messages.map((m) => (m.id === event.message.id ? event.message : m))
        : [...state.messages, event.message]
      return { ...state, messages }
    }
    case 'delta':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id ? { ...m, content: m.content + event.text } : m,
        ),
      }
    case 'done':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === event.id
            ? { ...m, content: event.content, status: event.status, role: event.role ?? m.role }
            : m,
        ),
      }
    case 'status':
      return { ...state, serverStatus: event.state }
    case 'agent':
      return { ...state, agentOnline: event.online }
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

// green: connected and healthy; red: last run failed; gray: offline (including, on the
// hub, when the laptop that runs the models is not connected).
export function statusColor(connection, serverStatus, mode = 'local', agentOnline = false) {
  if (connection !== 'open') return 'gray'
  if (mode === 'hub' && !agentOnline) return 'gray'
  return serverStatus === 'error' ? 'red' : 'green'
}
