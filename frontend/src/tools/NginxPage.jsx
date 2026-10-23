// The nginx config generator page (/tools/nginx-config-generator): pick a site type and options,
// copy or download the server block, and follow the install commands.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { DEFAULTS, TYPES, buildNginx, installCommands } from './nginxTool.js'
import { downloadText } from '../export.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'nginx-config-generator')
const INPUT = 'min-h-[44px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[16px] text-zinc-200 sm:min-h-[36px] sm:text-sm'

const TOGGLES = [
  ['https', 'HTTPS with Let’s Encrypt + HTTP→HTTPS redirect'],
  ['http2', 'HTTP/2', (o) => o.https],
  ['gzip', 'gzip compression'],
  ['cache', 'Long cache for static assets', (o) => o.type !== 'proxy'],
  ['security', 'Security headers (HSTS, nosniff, frame, referrer)'],
  ['websocket', 'WebSocket support', (o) => o.type === 'proxy'],
  ['rateLimit', 'Rate limiting'],
  ['logs', 'Per-site access and error logs'],
]

export default function NginxPage() {
  const [o, setO] = useState(DEFAULTS)
  const set = (k, v) => setO((prev) => ({ ...prev, [k]: v }))
  const config = buildNginx(o)
  const commands = installCommands(o)
  const file = `${o.domain || 'site'}.conf`

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-col gap-3 text-sm text-zinc-300 lg:w-[22rem] lg:shrink-0">
          <div role="group" aria-label="Site type" className="grid grid-cols-2 gap-1">
            {TYPES.map(([t, label]) => (
              <button key={t} type="button" data-testid={`nginx-type-${t}`} aria-pressed={o.type === t} className={`${BUTTON} ${o.type === t ? 'bg-zinc-800 text-zinc-100' : ''}`} onClick={() => set('type', t)}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            Domain
            <input data-testid="nginx-domain" value={o.domain} onChange={(e) => set('domain', e.target.value.trim())} spellCheck={false} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">
            www
            <select data-testid="nginx-www" value={o.www} onChange={(e) => set('www', e.target.value)} className={INPUT}>
              <option value="to-apex">Redirect www → bare domain</option>
              <option value="to-www">Redirect bare domain → www</option>
              <option value="none">Only this exact host</option>
            </select>
          </label>
          {o.type === 'proxy' ? (
            <label className="flex flex-col gap-1">
              Upstream (your app)
              <input data-testid="nginx-upstream" value={o.upstream} onChange={(e) => set('upstream', e.target.value)} spellCheck={false} className={INPUT} />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              Root directory
              <input data-testid="nginx-root" value={o.root} onChange={(e) => set('root', e.target.value)} spellCheck={false} className={INPUT} />
            </label>
          )}
          {o.type === 'php' && (
            <label className="flex flex-col gap-1">
              PHP-FPM socket
              <input value={o.phpSocket} onChange={(e) => set('phpSocket', e.target.value)} spellCheck={false} className={INPUT} />
            </label>
          )}
          <div className="flex flex-col gap-2">
            {TOGGLES.filter(([, , show]) => !show || show(o)).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" data-testid={`nginx-${k}`} checked={o[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-sky-500" />
                {label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              Max upload size
              <input value={o.bodySize} onChange={(e) => set('bodySize', e.target.value.trim())} spellCheck={false} className={INPUT} />
            </label>
            {o.rateLimit && (
              <label className="flex flex-col gap-1">
                Requests / second per IP
                <input type="number" min={1} value={o.rate} onChange={(e) => set('rate', Math.max(1, Number(e.target.value) || 1))} className={INPUT} />
              </label>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span className="font-mono">{file}</span>
            <div className="flex gap-1">
              <CopyButton text={config} label="Copy config" testid="nginx-copy" />
              <button type="button" className={BUTTON} onClick={() => downloadText(file, config, 'text/plain')}>
                Download
              </button>
            </div>
          </div>
          <pre data-testid="nginx-out" className="max-h-[40rem] overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-emerald-200 sm:text-[13px]">
            {config}
          </pre>
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>Install on Ubuntu / Debian</span>
            <CopyButton text={commands} label="Copy commands" />
          </div>
          <pre data-testid="nginx-commands" className="overflow-auto whitespace-pre rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {commands}
          </pre>
        </div>
      </div>
    </ToolShell>
  )
}
