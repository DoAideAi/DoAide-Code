import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkToken,
  clearSession,
  createAgentToken,
  downloadInstaller,
  fetchConfig,
  fetchModelComparison,
  fetchUsage,
  googleLogin,
  loadSession,
  localLogin,
  probeLocal,
  refreshSession,
  saveSession,
  setupStatus,
} from './api.js'
import Composer from './components/Composer.jsx'
import LaptopBanner from './components/LaptopBanner.jsx'
import { NoModelsBanner } from './components/Models.jsx'
import ModelsPage from './components/ModelsPage.jsx'
import MessageList from './components/MessageList.jsx'
import SetupPage from './components/SetupPage.jsx'
import SignIn from './components/SignIn.jsx'
import TopBar from './components/TopBar.jsx'
import UsagePage from './components/UsagePage.jsx'
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
  const [usageOpen, setUsageOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const loadUsage = useCallback((days) => fetchUsage(token, days), [token])
  const loadComparison = useCallback((days) => fetchModelComparison(token, days), [token])

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

  if (needsSignIn) return <SignIn clientId={clientId} onCredential={onCredential} error={error} />

  // Busy only while a reply is actually streaming or queued, so a stale status can never leave
  // Stop showing after the answer finished.
  const busy = serverStatus === 'busy' && messages.some((m) => m.status === 'streaming' || m.status === 'queued')
  const send = (text) => socket.current?.send({ type: 'send', text }) ?? false
  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar
        project={project}
        color={statusColor(connection, serverStatus, mode, agentOnline)}
        busy={busy}
        models={connection === 'open' ? models : null}
        localUrl={mode === 'hub' ? localUrl : null}
        onUsage={
          token
            ? () => {
                setModelsOpen(false)
                setUsageOpen((v) => !v)
              }
            : null
        }
        onModels={
          token
            ? () => {
                setUsageOpen(false)
                setModelsOpen((v) => !v)
              }
            : null
        }
      />
      {modelsOpen && token ? (
        <ModelsPage
          load={loadComparison}
          models={connection === 'open' ? models : null}
          onClose={() => setModelsOpen(false)}
        />
      ) : usageOpen && token ? (
        <UsagePage load={loadUsage} onClose={() => setUsageOpen(false)} />
      ) : setupOpen && token ? (
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
          <MessageList messages={messages} onSend={send} />
          <Composer
            busy={busy}
            disabled={connection !== 'open'}
            onSend={send}
            onStop={() => socket.current?.send({ type: 'stop' })}
          />
        </>
      )}
    </div>
  )
}
