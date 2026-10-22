import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { applyTheme } from './theme.js'
import { registerServiceWorker } from './pwa.js'
import { preloadToolPage } from './tools/pageLoaders.js'

applyTheme()
registerServiceWorker()
// On a tool URL, fetch that page's chunk in parallel with the router chunk instead of after it.
if (window.location.pathname.startsWith('/tools')) preloadToolPage(window.location.pathname)

// Both pages load on demand, so a /tools visitor never downloads the chat app (and the other
// way round). The entry keeps only React and the shared styles.
const App = lazy(() => import('./App.jsx'))
const ToolsRouter = lazy(() => import('./tools/ToolsRouter.jsx'))
const SnippetPage = lazy(() => import('./tools/SnippetPage.jsx'))
const path = window.location.pathname
const page = (
  <Suspense fallback={null}>
    {path.startsWith('/tools') ? <ToolsRouter /> : path.startsWith('/s/') ? <SnippetPage /> : <App />}
  </Suspense>
)

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
