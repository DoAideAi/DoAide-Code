import { useEffect, useRef, useState } from 'react'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Google Sign-In'))
    document.head.appendChild(script)
  })
}

// embedded: just the button and errors, inside the landing page.
export default function SignIn({ clientId, onCredential, error, embedded = false }) {
  const button = useRef(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!clientId) return
    let active = true
    loadGis()
      .then(() => {
        if (!active || !button.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => onCredential(resp.credential),
        })
        window.google.accounts.id.renderButton(button.current, { theme: 'filled_black', size: 'large' })
      })
      .catch((e) => active && setLoadError(e.message))
    return () => {
      active = false
    }
  }, [clientId, onCredential])

  return (
    <div className={embedded ? 'flex min-h-[44px] flex-col items-center gap-2' : 'flex h-full flex-col items-center justify-center gap-4 px-6 text-center'}>
      {!embedded && <h1 className="text-lg font-medium text-zinc-200">DoAide Code</h1>}
      {clientId ? (
        <div ref={button} />
      ) : (
        <p className="max-w-sm text-sm text-zinc-500">
          Google sign-in is not configured on this server. Open DoAide Code on the machine running it.
        </p>
      )}
      {(error || loadError) && <p className="text-sm text-red-400">{error || loadError}</p>}
    </div>
  )
}
