import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { applyTheme } from './theme.js'

applyTheme()

// The free code tools (/tools/…) need no sign-in and load on their own.
const CodeToolsPage = lazy(() => import('./tools/CodeToolsPage.jsx'))
const page = window.location.pathname.startsWith('/tools') ? (
  <Suspense fallback={null}>
    <CodeToolsPage />
  </Suspense>
) : (
  <App />
)

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
