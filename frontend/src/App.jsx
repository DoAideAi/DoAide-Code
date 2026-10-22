import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
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
  findFiles,
  fetchProjects,
  searchConversations,
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
import GettingStarted from './components/GettingStarted.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import { paletteItems } from './palette.js'
import { saveTheme } from './theme.js'
import { exportConversation } from './export.js'
import { clearUnsent, echoed, recordUnsent, unsent } from './drafts.js'
import LaptopBanner from './components/LaptopBanner.jsx'
import { NoModelsBanner } from './components/Models.jsx'
import MessageList, { oldestServerId } from './components/MessageList.jsx'
import SearchBar, { jumpTo } from './components/SearchBar.jsx'
import Landing from './components/Landing.jsx'
import TopBar from './components/TopBar.jsx'
import useNotificationSound from './hooks/useNotificationSound.js'
import useShortcuts, { loadKeys, shortcutLabel } from './hooks/useShortcuts.js'
import useTabTitle from './hooks/useTabTitle.js'
import { connect } from './socket.js'
import { statusColor, useChat } from './store.js'

// Pages away from the chat load on first use, keeping them out of the first download.
const FileViewer = lazy(() => import('./components/FileViewer.jsx'))
const HowItWorksPage = lazy(() => import('./components/HowItWorksPage.jsx'))
const ModelsPage = lazy(() => import('./components/ModelsPage.jsx'))
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'))
const SetupPage = lazy(() => import('./components/SetupPage.jsx'))
const UsagePage = lazy(() => import('./components/UsagePage.jsx'))

function PageLoading() {
  return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-500">Loading…</div>
}

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
  const findProjectFiles = useCallback((query) => findFiles(token, query), [token])
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

  const handleExport = useCallback(async () => {
    if (!token || !sessionId) return
    try {
      const title = sessions.find((s) => s.id === sessionId)?.title
      await exportConversation(token, sessionId, { title, project })
    } catch (err) {
      apply({ type: 'notice', text: `Export failed: ${err.message}` })
    }
  }, [token, sessionId, sessions, project, apply])

  const searchAll = useCallback((query) => searchConversations(token, query), [token])

  // A search result: open its conversation (if another), load back until the message is there,
  // then scroll to it.
  const openSearchResult = useCallback(async (targetSession, messageId) => {
    if (!token) return
    try {
      let { messages: shown, hasMore: more } = useChat.getState()
      if (targetSession !== sessionId) {
        const snapshot = await switchSession(token, targetSession)
        apply(snapshot)
        shown = snapshot.messages ?? []
        more = snapshot.has_more
        loadSessions()
      }
      for (let i = 0; i < 20 && more && !shown.some((m) => m.id === messageId); i++) {
        const page = await fetchEarlierMessages(token, targetSession, oldestServerId(shown), 100)
        apply({ type: 'earlier', session_id: targetSession, ...page })
        shown = [...(page.messages ?? []), ...shown]
        more = page.has_more
      }
      // After the new messages are on screen.
      setTimeout(() => jumpTo(messageId), 80)
    } catch (err) {
      apply({ type: 'notice', text: `Couldn't open that conversation: ${err.message}` })
    }
  }, [token, sessionId, apply, loadSessions])

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
  // A sent message the server never echoed (the page closed, or the connection dropped first)
  // goes back in the message box, so it is never lost.
  const [prefill, setPrefill] = useState(null)
  const restoreUnsent = useCallback((why) => {
    const pending = unsent()
    if (!pending || echoed(useChat.getState().messages, pending)) return
    clearUnsent()
    setPrefill({ text: pending.text })
    apply({ type: 'notice', text: `${why} It's back in the message box: press Send to try again.` })
  }, [apply])
  // The first messages after a reconnect are the server's snapshot: did it get the message?
  const reconnected = useRef(false)
  const wasOpen = useRef(false)
  useEffect(() => {
    // A drop after being connected; the first connection is covered by the reload check below.
    if (connection === 'open') wasOpen.current = true
    else if (wasOpen.current) reconnected.current = true
  }, [connection])
  useEffect(() => {
    if (echoed(messages)) clearUnsent()
    else if (reconnected.current && connection === 'open') {
      reconnected.current = false
      restoreUnsent('Your last message was lost when the connection dropped.')
    }
    // Only when the messages change; the connection is read, not watched.
  }, [messages])
  // After a reload (or a switch back), for the conversation it was sent in.
  useEffect(() => {
    if (sessionId && unsent()?.sessionId === sessionId) restoreUnsent('Your last message did not reach DoAide before the page closed.')
  }, [sessionId, restoreUnsent])

  useEffect(() => {
    if (!awaiting) return undefined
    const timer = setTimeout(() => {
      setAwaiting(false)
      restoreUnsent('Your last message did not reach DoAide.')
    }, 20_000)
    return () => clearTimeout(timer)
  }, [awaiting, restoreUnsent])

  // Busy only while a reply is actually streaming or queued, so a stale status can never leave
  // Stop showing after the answer finished.
  const busy = serverStatus === 'busy' && messages.some((m) => m.status === 'streaming' || m.status === 'queued')
  useTabTitle(busy)
  // The command palette (Ctrl/Cmd+P): projects and conversations are fetched as it opens.
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteProjects, setPaletteProjects] = useState([])
  useEffect(() => {
    if (!paletteOpen) return
    loadSessions()
    Promise.resolve(loadProjects())
      .then((body) => setPaletteProjects((body?.projects ?? []).map((p) => p.name)))
      .catch(() => setPaletteProjects([]))
  }, [paletteOpen, loadSessions, loadProjects])

  useShortcuts({
    newChat: () => (token ? void handleNewChat() : false),
    clear: () => (token ? void apply({ type: 'clear-view' }) : false),
    palette: () => (token ? void setPaletteOpen((o) => !o) : false),
    // Escape belongs to the search box, the sidebar and the palette while they are open.
    stop: () => (busy && !searchOpen && !sidebarOpen && !paletteOpen ? void socket.current?.send({ type: 'stop' }) : false),
  })

  if (needsSignIn) return <Landing clientId={clientId} onCredential={onCredential} error={error} />
  // Until the saved session is checked: not the chat (it flashed with a dead "Connecting..." box
  // before the sign-in page).
  if (!token) return <div className="flex h-[100dvh] items-center justify-center text-sm text-zinc-500">Signing in…</div>

  const send = (text) => {
    const sent = socket.current?.send({ type: 'send', text }) ?? false
    if (sent) {
      setAwaiting(true)
      recordUnsent(sessionId, text)
    }
    return sent
  }
  const online = connection === 'open'
  const chooseModel = online && !busy ? (name) => send(`/model ${name}`) : null
  const show = (name) => () => {
    setOpenFile(null)
    setPage(name)
  }
  const palette = paletteOpen && (
    <CommandPalette
      onClose={() => setPaletteOpen(false)}
      items={paletteItems({
        keys: loadKeys(),
        models: online ? models : null,
        projects: paletteProjects,
        project,
        sessions,
        sessionId,
        muted,
        act: {
          newChat: handleNewChat,
          search: () => setSearchOpen(true),
          clear: () => apply({ type: 'clear-view' }),
          sidebar: () => setSidebarOpen(true),
          exportChat: sessionId ? handleExport : null,
          settings: show('settings'),
          models: show('models'),
          usage: show('usage'),
          how: show('how'),
          toggleMute,
          setTheme: saveTheme,
          chooseModel,
          switchProject: online && !busy ? (name) => send(`/switch-project ${name}`) : null,
          openSession: (id) => {
            setPage(null)
            setOpenFile(null)
            handleSelectSession(id)
          },
          send: online && !busy ? send : null,
        },
      })}
    />
  )
  return (
    <div className="flex h-[100dvh]">
      {palette}
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
        onExport={sessionId ? handleExport : null}
        onPalette={() => setPaletteOpen(true)}
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
        <SearchBar
          messages={messages}
          hasMore={hasMore}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          searchAll={searchAll}
          sessionId={sessionId}
          onOpen={(sid, id) => {
            setPage(null)
            setOpenFile(null)
            openSearchResult(sid, id)
          }}
        />
      )}
      <Suspense fallback={<PageLoading />}>
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
            welcome={
              <GettingStarted
                mode={mode}
                agentOnline={agentOnline}
                models={online ? models : null}
                project={project}
                onSetup={() => setSetupOpen(true)}
                onModels={() => setPage('models')}
                onSend={online ? send : null}
                loadProjects={loadProjects}
                onSwitchProject={online && !busy ? (name) => send(`/switch-project ${name}`) : null}
              />
            }
          />
          <Composer
            busy={busy}
            disabled={connection !== 'open'}
            onSend={send}
            onStop={() => socket.current?.send({ type: 'stop' })}
            sessionId={sessionId}
            prefill={prefill}
            findFiles={online ? findProjectFiles : null}
            models={online ? models : null}
            onChooseModel={chooseModel}
          />
        </>
      )}
      </Suspense>
      </div>
    </div>
  )
}
