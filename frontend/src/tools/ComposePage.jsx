// The Docker Compose validator page (/tools/docker-compose-validator): paste a compose file and
// get its YAML and structural problems by line, plus a summary of the services. Runs in the page.

import { useMemo, useState } from 'react'
import ToolShell, { BUTTON } from './ToolShell.jsx'
import { validateCompose } from './composeTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'docker-compose-validator')
const MONO = 'font-mono text-[16px] leading-relaxed sm:text-[13px]'
const LEVEL = {
  error: ['Error', 'border-rose-900/60 bg-rose-950/20 text-rose-200'],
  warning: ['Warning', 'border-amber-900/60 bg-amber-950/20 text-amber-200'],
  info: ['Info', 'border-zinc-800 text-zinc-400'],
}

const SAMPLE = `version: "3.8"
services:
  web:
    image: node:20-alpine
    command: npm start
    ports:
      - "3000:3000"
    enviroment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy
    networks: [backend]
  db:
    image: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
networks:
  backend:
`

export default function ComposePage() {
  const [text, setText] = useState(SAMPLE)
  const { issues, services } = useMemo(() => validateCompose(text), [text])
  const counts = Object.fromEntries(Object.keys(LEVEL).map((l) => [l, issues.filter((i) => i.level === l).length]))

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm text-zinc-300">
          <div className="flex items-center justify-between">
            <label htmlFor="compose-in">docker-compose.yml / compose.yaml</label>
            <button type="button" className={BUTTON} onClick={() => setText(SAMPLE)}>
              Load sample
            </button>
          </div>
          <textarea
            id="compose-in"
            data-testid="compose-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={26}
            spellCheck={false}
            className={`w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 text-zinc-200 ${MONO}`}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p
            data-testid="compose-summary"
            className={`rounded-lg border p-3 text-sm font-medium ${counts.error ? LEVEL.error[1] : 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200'}`}
          >
            {counts.error ? `✕ ${counts.error} error${counts.error > 1 ? 's' : ''}` : '✓ Valid compose file'}
            {counts.warning > 0 && ` · ${counts.warning} warning${counts.warning > 1 ? 's' : ''}`}
            {counts.info > 0 && ` · ${counts.info} note${counts.info > 1 ? 's' : ''}`}
          </p>
          <ul data-testid="compose-issues" className="flex flex-col gap-1">
            {issues.map((i, n) => (
              <li key={`${i.line}-${n}`} className={`rounded border px-3 py-2 text-sm ${LEVEL[i.level][1]}`}>
                <span className="mr-2 text-xs uppercase">{LEVEL[i.level][0]}</span>
                {i.line && <span className="mr-2 font-mono text-xs">line {i.line}</span>}
                {i.text}
              </li>
            ))}
          </ul>
          {services.length > 0 && (
            <div className="overflow-x-auto">
              <table data-testid="compose-services" className="w-full text-left text-sm">
                <thead className="text-zinc-500">
                  <tr>
                    <th className="py-1 pr-3 font-normal">Service</th>
                    <th className="py-1 pr-3 font-normal">Image</th>
                    <th className="py-1 font-normal">Ports</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.name} className="border-t border-zinc-800">
                      <td className="py-1 pr-3 font-mono text-zinc-200">{s.name}</td>
                      <td className="py-1 pr-3 font-mono text-zinc-400">{s.image}</td>
                      <td className="py-1 font-mono text-zinc-400">{s.ports.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-zinc-500">Checks the Compose Specification’s common rules without Docker. Run docker compose config for the final word — it also resolves .env files.</p>
        </div>
      </div>
    </ToolShell>
  )
}
