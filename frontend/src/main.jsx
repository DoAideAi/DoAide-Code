import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { applyTheme } from './theme.js'
import { registerServiceWorker } from './pwa.js'

applyTheme()
registerServiceWorker()

// Both pages load on demand, so a /tools visitor never downloads the chat app (and the other
// way round). The entry keeps only React and the shared styles.
const App = lazy(() => import('./App.jsx'))
const ToolsRouter = lazy(() => import('./tools/ToolsRouter.jsx'))
const page = (
  <Suspense fallback={null}>{window.location.pathname.startsWith('/tools') ? <ToolsRouter /> : <App />}</Suspense>
)

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
