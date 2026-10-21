import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  checkToken,
  clearSession,
  createAgentToken,
  downloadInstaller,
  fetchConfig,
  googleLogin,
  loadSession,
  localLogin,
  refreshSession,
  saveSession,
  setupStatus,
} from './api.js'
import Composer from './components/Composer.jsx'
import { CodeViewer, FileTree } from './components/Files.jsx'
import LaptopBanner from './components/LaptopBanner.jsx'
import { ModelPicker, NoModelsBanner } from './components/Models.jsx'
import MessageList from './components/MessageList.jsx'
import SetupPage from './components/SetupPage.jsx'
import SignIn from './components/SignIn.jsx'
import TopBar from './components/TopBar.jsx'
import { connect } from './socket.js'
import { statusColor, useChat } from './store.js'

const DESKTOP_QUERY = '(min-width: 768px)'
const FILES_KEY = 'doaide-code-files-open'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia?.(DESKTOP_QUERY).matches ?? true)
  useEffect(() => {
    const query = window.matchMedia?.(DESKTOP_QUERY)
    if (!query) return
    const onChange = (e) => setDesktop(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return desktop
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

function useStoredFlag(key) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const toggle = useCallback(() => {
    setValue((v) => {
      try {
        localStorage.setItem(key, v ? '0' : '1')
      } catch {
        // Per-device convenience only.
      }
      return !v
    })
  }, [key])
  return [value, toggle]
}

export default function App() {
  const desktop = useIsDesktop()
  const { token, needsSignIn, clientId, error, onCredential, renew } = useAuth()
  const {
    messages,
    project,
    serverStatus,
    mode,
    agentOnline,
    models,
    modelPref,
    connection,
    apply,
    setConnection,
    sessionId,
    title,
    source,
  } = useChat()
  const socket = useRef(null)
  const [filesOpen, toggleFiles] = useStoredFlag(FILES_KEY)
  const [openFile, setOpenFile] = useState(null)
  const [setupOpen, setSetupOpen] = useState(false)

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

  // Re-read the tree and open file after each finished answer, so edits show up.
  const filesVersion = useMemo(
    () => messages.filter((m) => m.role !== 'user' && m.status !== 'streaming' && m.status !== 'queued').length,
    [messages],
  )

  if (needsSignIn) return <SignIn clientId={clientId} onCredential={onCredential} error={error} />

  const busy = serverStatus === 'busy'
  const send = (text) => socket.current?.send({ type: 'send', text }) ?? false
  // The file panel is desktop-only; phones show just the conversation.
  const showFiles = desktop && filesOpen && token
  const showViewer = showFiles && openFile
  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar
        project={project}
        color={statusColor(connection, serverStatus, mode, agentOnline)}
        busy={busy}
        filesOpen={filesOpen}
        onToggleFiles={desktop ? toggleFiles : null}
        laptop={mode === 'hub' && connection === 'open' ? agentOnline : null}
        onLaptop={() => setSetupOpen(true)}
        models={connection === 'open' ? models : null}
        sessions={
          token && {
            token,
            title,
            source,
            sessionId,
            onOpen: (id) => socket.current?.send({ type: 'open', session_id: id }),
            onNew: () => send('/new'),
          }
        }
      />
      {setupOpen && token ? (
        <SetupPage
          agentOnline={agentOnline}
          onDownload={(platform) => downloadInstaller(token, platform)}
          onCreateToken={() => createAgentToken(token)}
          onClose={() => setSetupOpen(false)}
        />
      ) : (
        <>
          {mode === 'hub' && connection === 'open' && !agentOnline && (
            <LaptopBanner onSetup={() => setSetupOpen(true)} />
          )}
          {connection === 'open' && <NoModelsBanner models={models} />}
          <div className="flex min-h-0 flex-1">
            {showFiles && <FileTree token={token} version={filesVersion} selected={openFile} onOpen={setOpenFile} />}
            {showViewer && (
              <CodeViewer token={token} path={openFile} version={filesVersion} onClose={() => setOpenFile(null)} />
            )}
            <section className={`flex min-w-0 flex-col ${showViewer ? 'w-[26rem] shrink-0 lg:w-[34rem]' : 'flex-1'}`}>
              <MessageList messages={messages} onSend={send} />
              <Composer
                busy={busy}
                disabled={connection !== 'open'}
                onSend={send}
                onStop={() => socket.current?.send({ type: 'stop' })}
                toolbar={
                  connection === 'open' && (models || modelPref) ? (
                    <ModelPicker
                      models={models}
                      pref={modelPref}
                      disabled={busy}
                      onChange={(model) => socket.current?.send({ type: 'set_model', model })}
                    />
                  ) : null
                }
              />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
