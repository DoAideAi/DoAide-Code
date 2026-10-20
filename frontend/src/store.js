import { create } from 'zustand'

export const initialChat = {
  sessionId: null,
  project: null,
  messages: [],
  serverStatus: 'idle', // idle | busy | error
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
          m.id === event.id ? { ...m, content: event.content, status: event.status } : m,
        ),
      }
    case 'status':
      return { ...state, serverStatus: event.state }
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

// green: connected and healthy; red: last run failed; gray: offline.
export function statusColor(connection, serverStatus) {
  if (connection !== 'open') return 'gray'
  return serverStatus === 'error' ? 'red' : 'green'
}
