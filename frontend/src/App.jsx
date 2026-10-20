import { useCallback, useEffect, useRef, useState } from 'react'
import { checkToken, fetchConfig, googleLogin, loadToken, localLogin, saveToken } from './api.js'
import Composer from './components/Composer.jsx'
import MessageList from './components/MessageList.jsx'
import SignIn from './components/SignIn.jsx'
import TopBar from './components/TopBar.jsx'
import { connect } from './socket.js'
import { statusColor, useChat } from './store.js'

const DESKTOP_QUERY = '(min-width: 768px)'

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

// Resolve a session token: saved token, else loopback login, else Google sign-in.
function useAuth() {
  const [token, setToken] = useState(null)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState(null)

  const signOut = useCallback(() => {
    saveToken(null)
    setToken(null)
    setNeedsSignIn(true)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const config = await fetchConfig().catch(() => ({ google_client_id: '', local_login: false }))
      if (!active) return
      setClientId(config.google_client_id)
      const saved = loadToken()
      if (saved && (await checkToken(saved).catch(() => false))) {
        if (active) setToken(saved)
        return
      }
      if (config.local_login) {
        try {
          const { token: fresh } = await localLogin()
          saveToken(fresh)
          if (active) setToken(fresh)
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
  }, [])

  const onCredential = useCallback(async (credential) => {
    try {
      const { token: fresh } = await googleLogin(credential)
      saveToken(fresh)
      setToken(fresh)
      setNeedsSignIn(false)
      setError(null)
    } catch {
      setError('Sign-in was rejected for this account.')
    }
  }, [])

  return { token, needsSignIn, clientId, error, onCredential, signOut }
}

export default function App() {
  const desktop = useIsDesktop()
  const { token, needsSignIn, clientId, error, onCredential, signOut } = useAuth()
  const { messages, project, serverStatus, connection, apply, setConnection } = useChat()
  const socket = useRef(null)

  useEffect(() => {
    if (!token) return
    socket.current = connect({
      path: desktop ? '/ws' : '/sync',
      token,
      onEvent: apply,
      onState: setConnection,
      onUnauthorized: signOut,
    })
    return () => socket.current?.close()
  }, [token, desktop, apply, setConnection, signOut])

  if (needsSignIn) return <SignIn clientId={clientId} onCredential={onCredential} error={error} />

  const busy = serverStatus === 'busy'
  return (
    <div className="flex h-full flex-col">
      <TopBar project={project} color={statusColor(connection, serverStatus)} busy={busy} />
      <MessageList messages={messages} />
      {desktop && (
        <Composer
          busy={busy}
          disabled={connection !== 'open'}
          onSend={(text) => socket.current?.send({ type: 'send', text }) ?? false}
          onStop={() => socket.current?.send({ type: 'stop' })}
        />
      )}
    </div>
  )
}
