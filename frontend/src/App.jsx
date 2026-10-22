import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkToken,
  clearSession,
  createAgentToken,
  createSession,
  downloadInstaller,
  fetchConfig,
  fetchBenchmarks,
  fetchEarlierMessages,
  fetchModelComparison,
  fetchFile,
  fetchFiles,
  fetchProjects,
  fetchSessions,
  fetchTaskHistory,
  fetchUsage,
  googleLogin,
  loadSession,
  localLogin,
  probeLocal,
  refreshSession,
  saveSession,
  setupStatus,
  switchSession,
} from './api.js'
import Composer from './components/Composer.jsx'
import ConnectionBanner from './components/ConnectionBanner.jsx'
import ConversationSidebar from './components/ConversationSidebar.jsx'
import FileViewer from './components/FileViewer.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import HowItWorksPage from './components/HowItWorksPage.jsx'
import LaptopBanner from './components/LaptopBanner.jsx'
import { NoModelsBanner } from './components/Models.jsx'
import ModelsPage from './components/ModelsPage.jsx'
import MessageList, { oldestServerId } from './components/MessageList.jsx'
import SearchBar from './components/SearchBar.jsx'
import SetupPage from './components/SetupPage.jsx'
import SignIn from './components/SignIn.jsx'
import TopBar from './components/TopBar.jsx'
import UsagePage from './components/UsagePage.jsx'
import useNotificationSound from './hooks/useNotificationSound.js'
import useShortcuts, { loadKeys, shortcutLabel } from './hooks/useShortcuts.js'
import useTabTitle from './hooks/useTabTitle.js'
import { connect } from './socket.js'
import { statusColor, useChat } from './store.js'

// Sign in once: a saved access token, else trade the saved refresh token for a new one,
// else loopback login, else Google. The refresh token never expires, so after the first
// sign-in this device stays signed in until it is revoked.
function useAuth() {
  const [token, setToken] = useState(null)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState(null)

  const signOut = useCallback(() => {
    clearSession()
    setToken(null)
    setNeedsSignIn(true)
  }, [])

  const begin = useCallback((session) => {
    saveSession({ token: session.token, refresh: session.refresh_token })
    setToken(session.token)
    setNeedsSignIn(false)
    setError(null)
  }, [])

  // Called when the server rejects the access token (expired or rotated secret).
  const renew = useCallback(async () => {
    const { refresh } = loadSession()
    if (refresh) {
      try {
        const { token: fresh } = await refreshSession(refresh)
        saveSession({ token: fresh })
        setToken(fresh)
        return
      } catch {
        // Revoked or unknown: fall through to a real sign-in.
      }
    }
    signOut()
  }, [signOut])

  useEffect(() => {
    let active = true
    ;(async () => {
      const config = await fetchConfig().catch(() => ({ google_client_id: '', local_login: false }))
      if (!active) return
      setClientId(config.google_client_id)
      const saved = loadSession()
      if (saved.token && (await checkToken(saved.token).catch(() => false))) {
        if (active) setToken(saved.token)
        return
      }
      if (saved.refresh) {
        try {
          const { token: fresh } = await refreshSession(saved.refresh)
          saveSession({ token: fresh })
          if (active) setToken(fresh)
          return
        } catch {
          // Fall through.
        }
      }
      if (config.local_login) {
        try {
          const session = await localLogin()
          if (active) begin(session)
          return
        } catch {
          // Not a loopback client; fall through to Google sign-in.
        }
      }
      if (active) setNeedsSignIn(true)
    })()
    return () => {
      active = false
    }
  }, [begin])

  const onCredential = useCallback(
    async (credential) => {
      try {
        begin(await googleLogin(credential))
      } catch {
        setError('Sign-in was rejected for this account.')
      }
    },
    [begin],
  )

  return { token, needsSignIn, clientId, error, onCredential, renew }
}

export default function App() {
  const { token, needsSignIn, clientId, error, onCredential, renew } = useAuth()
  const {
    messages,
    sessionId,
    hasMore,
    project,
    serverStatus,
    mode,
    agentOnline,
    models,
    connection,
    apply,
    setConnection,
  } = useChat()
  const socket = useRef(null)
  const [setupOpen, setSetupOpen] = useState(false)
  // The page shown instead of the chat: 'models', 'usage', 'how', 'settings' or null.
  const [page, setPage] = useState(null)
  const toggle = (name) => () => setPage((p) => (p === name ? null : name))
  const loadUsage = useCallback((days) => fetchUsage(token, days), [token])
  const loadComparison = useCallback((days) => fetchModelComparison(token, days), [token])
  const loadBenchmarks = useCallback(() => fetchBenchmarks(token), [token])
  const loadHistory = useCallback(() => fetchTaskHistory(token), [token])

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  // The file open in the viewer (in place of the chat), from the sidebar's Files tab.
  const [openFile, setOpenFile] = useState(null)
  const loadFiles = useCallback((path) => fetchFiles(token, path), [token])
  const loadFile = useCallback((path) => fetchFile(token, path), [token])
  // Its path belongs to the old project.
  useEffect(() => setOpenFile(null), [project])

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)

  // Notification sound
  const { muted, toggleMute, checkAndPlay } = useNotificationSound()
  // Stable, so the project menu loads its list once per opening.
  const loadProjects = useCallback(() => fetchProjects(token), [token])

  // Check for notification sound on message changes
  useEffect(() => {
    checkAndPlay(messages)
  }, [messages, checkAndPlay])

  // Load sessions when sidebar opens
  const loadSessions = useCallback(async () => {
    if (!token) return
    setSessionsLoading(true)
    try {
      const data = await fetchSessions(token)
      setSessions(data.sessions ?? [])
    } catch {
      // Ignore errors loading sessions.
    } finally {
      setSessionsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (sidebarOpen) loadSessions()
  }, [sidebarOpen, loadSessions])

  const handleNewChat = useCallback(async () => {
    if (!token) return
    try {
      await createSession(token)
      // Reload the snapshot (the new session is now the latest)
      const snapshot = await switchSession(token, '')
      apply(snapshot)
      loadSessions()
    } catch {
      // Ignore errors creating session.
    }
  }, [token, apply, loadSessions])

  const loadEarlier = useCallback(async () => {
    // After Ctrl+L nothing is on screen: the latest page comes back first.
    const before = oldestServerId(messages)
    if (!token || !sessionId) return
    const page = await fetchEarlierMessages(token, sessionId, before)
    apply({ type: 'earlier', session_id: sessionId, ...page })
  }, [token, sessionId, messages, apply])

  const handleSelectSession = useCallback(async (sessionId) => {
    if (!token) return
    try {
      const snapshot = await switchSession(token, sessionId)
      apply(snapshot)
      // Switching moves the session to the top of the list.
      loadSessions()
    } catch {
      // Ignore errors switching session.
    }
  }, [token, apply, loadSessions])

  // Every device can read and send; on the hub, prompts are queued and run by the laptop.
  useEffect(() => {
    if (!token) return
    socket.current = connect({
      path: '/ws',
      token,
      onEvent: apply,
      onState: setConnection,
      onUnauthorized: renew,
    })
    return () => socket.current?.close()
  }, [token, apply, setConnection, renew])

  // The socket dropped (or never opened): the offline banner stays up through reconnect attempts,
  // but not during the first connect.
  const [lost, setLost] = useState(false)
  useEffect(() => {
    if (connection === 'closed') setLost(true)
    else if (connection === 'open') setLost(false)
  }, [connection])

  // Hub only: on the laptop itself, offer the local server (no server round trip).
  const [localUrl, setLocalUrl] = useState(null)
  useEffect(() => {
    if (mode !== 'hub' || connection !== 'open') return
    let active = true
    probeLocal().then((url) => active && setLocalUrl(url))
    return () => {
      active = false
    }
  }, [mode, connection])

  // Hub only: a user whose laptop has never connected lands on the setup page first.
  useEffect(() => {
    if (!token || mode !== 'hub') return
    let active = true
    setupStatus(token)
      .then((s) => active && !s.ever_connected && !s.agent_online && setSetupOpen(true))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [token, mode])

  // Sent, and not yet echoed by the server: shows "Sending…" until a message arrives (or the
  // connection drops, or 20 s pass with nothing, so it can never stick).
  const [awaiting, setAwaiting] = useState(false)
  const lastId = messages.at(-1)?.id
  useEffect(() => setAwaiting(false), [lastId, connection])
  useEffect(() => {
    if (!awaiting) return undefined
    const timer = setTimeout(() => setAwaiting(false), 20_000)
    return () => clearTimeout(timer)
  }, [awaiting])

  // Busy only while a reply is actually streaming or queued, so a stale status can never leave
  // Stop showing after the answer finished.
  const busy = serverStatus === 'busy' && messages.some((m) => m.status === 'streaming' || m.status === 'queued')
  useTabTitle(busy)
  useShortcuts({
    newChat: () => (token ? void handleNewChat() : false),
    clear: () => (token ? void apply({ type: 'clear-view' }) : false),
    // Escape belongs to the search box and the sidebar while they are open.
    stop: () => (busy && !searchOpen && !sidebarOpen ? void socket.current?.send({ type: 'stop' }) : false),
  })

  if (needsSignIn) return <SignIn clientId={clientId} onCredential={onCredential} error={error} />
  // Until the saved session is checked: not the chat (it flashed with a dead "Connecting..." box
  // before the sign-in page).
  if (!token) return <div className="flex h-[100dvh] items-center justify-center text-sm text-zinc-500">Signing in…</div>

  const send = (text) => {
    const sent = socket.current?.send({ type: 'send', text }) ?? false
    if (sent) setAwaiting(true)
    return sent
  }
  const online = connection === 'open'
  const chooseModel = online && !busy ? (name) => send(`/model ${name}`) : null
  return (
    <div className="flex h-[100dvh]">
      <ConversationSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onSelect={handleSelectSession}
        onNewChat={handleNewChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        loading={sessionsLoading}
        loadFiles={loadFiles}
        onOpenFile={(path) => {
          setPage(null)
          setOpenFile(path)
        }}
        openFilePath={openFile}
        project={project}
      />
      <div className="flex min-w-0 flex-1 flex-col">
      <TopBar
        project={project}
        color={statusColor(connection, serverStatus, mode, agentOnline)}
        busy={busy}
        models={connection === 'open' ? models : null}
        localUrl={mode === 'hub' ? localUrl : null}
        onUsage={token ? toggle('usage') : null}
        onModels={token ? toggle('models') : null}
        onHow={toggle('how')}
        onSettings={toggle('settings')}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        onNewChat={handleNewChat}
        newChatHint={shortcutLabel(loadKeys(), 'newChat')}
        onSearch={() => setSearchOpen((p) => !p)}
        muted={muted}
        onToggleMute={toggleMute}
        loadProjects={loadProjects}
        onSwitchProject={online && !busy ? (name) => send(`/switch-project ${name}`) : null}
      />
      {searchOpen && (
        <SearchBar messages={messages} hasMore={hasMore} open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
      {page === 'models' && token ? (
        <ModelsPage
          load={loadComparison}
          loadBenchmarks={loadBenchmarks}
          models={connection === 'open' ? models : null}
          onClose={() => setPage(null)}
        />
      ) : page === 'usage' && token ? (
        <UsagePage load={loadUsage} loadHistory={loadHistory} onClose={() => setPage(null)} />
      ) : page === 'how' ? (
        <HowItWorksPage onClose={() => setPage(null)} />
      ) : page === 'settings' ? (
        <SettingsPage models={online ? models : null} onChooseModel={chooseModel} onClose={() => setPage(null)} />
      ) : setupOpen && token ? (
        <SetupPage
          agentOnline={agentOnline}
          onDownload={(platform) => downloadInstaller(token, platform)}
          onCreateToken={() => createAgentToken(token)}
          onClose={() => setSetupOpen(false)}
        />
      ) : openFile ? (
        <FileViewer path={openFile} load={loadFile} onClose={() => setOpenFile(null)} />
      ) : (
        <>
          {mode === 'hub' && connection === 'open' && !agentOnline && (
            <LaptopBanner onSetup={() => setSetupOpen(true)} />
          )}
          {lost && !online && (
            <ConnectionBanner connecting={connection === 'connecting'} onRetry={() => socket.current?.retryNow()} />
          )}
          {online && <NoModelsBanner models={models} />}
          <MessageList
            messages={messages}
            onSend={online ? send : null}
            onRetry={online && !busy ? send : null}
            hasMore={hasMore}
            onLoadEarlier={loadEarlier}
            pending={awaiting}
          />
          <Composer
            busy={busy}
            disabled={connection !== 'open'}
            onSend={send}
            onStop={() => socket.current?.send({ type: 'stop' })}
            models={online ? models : null}
            onChooseModel={chooseModel}
          />
        </>
      )}
      </div>
    </div>
  )
}
