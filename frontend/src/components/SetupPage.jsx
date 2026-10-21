import { useState } from 'react'
import { PLATFORM_NAMES, detectPlatform } from '../platform.js'

// What to do with the download, in plain words, per OS.
const STEPS = {
  macos: [
    'Open DoAide-Code-Setup.zip from your Downloads (Safari may already have opened it).',
    'Double-click DoAide-Code-Setup.command.',
    'If macOS says it can’t check the file: open System Settings → Privacy & Security, scroll down and click “Open Anyway”.',
    'A window shows the progress and closes itself when your laptop is connected.',
  ],
  windows: [
    'Open DoAide-Code-Setup.bat from your Downloads.',
    'If “Windows protected your PC” appears, click “More info”, then “Run anyway”.',
    'A window shows the progress and closes itself when your PC is connected.',
  ],
  linux: [
    'In your Downloads, right-click doaide-code-setup.sh → Properties → allow it to run as a program.',
    'Double-click it and choose “Run” (or “Run in Terminal”).',
    'It shows the progress and tells you when this computer is connected.',
  ],
}

// Hub only. First-run page (and reachable from the offline banner): one download that
// installs the laptop agent and makes it start at login. No terminal needed.
export default function SetupPage({ agentOnline, onDownload, onCreateToken, onClose }) {
  const detected = detectPlatform()
  const [platform, setPlatform] = useState(detected)
  const [state, setState] = useState('idle') // idle | downloading | downloaded | error
  const [manual, setManual] = useState(null)

  const download = async (target) => {
    setPlatform(target)
    setState('downloading')
    try {
      await onDownload(target)
      setState('downloaded')
    } catch {
      setState('error')
    }
  }

  const showManual = async () => {
    try {
      setManual(await onCreateToken())
    } catch {
      setManual({ error: true })
    }
  }

  const others = Object.keys(PLATFORM_NAMES).filter((p) => p !== platform)
  return (
    <div data-testid="setup-page" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Set up your laptop</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            DoAide Code does its work on your own computer. Install the small helper once and it starts by
            itself whenever you turn your computer on. This page and your phone then talk to it from anywhere.
          </p>
        </div>

        <div
          data-testid="setup-agent-status"
          data-online={agentOnline ? 'true' : 'false'}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${agentOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-zinc-300">
            {agentOnline ? 'Your laptop is connected.' : 'Your laptop is not connected yet.'}
          </span>
        </div>

        {agentOnline ? (
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
          >
            Start coding
          </button>
        ) : platform ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              data-testid="setup-download"
              disabled={state === 'downloading'}
              onClick={() => download(platform)}
              className="self-start rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-60"
            >
              {state === 'downloading' ? 'Preparing…' : `Download for ${PLATFORM_NAMES[platform]}`}
            </button>
            {state === 'error' && (
              <span className="text-sm text-red-300">The download did not work. Please try again.</span>
            )}
            {state === 'downloaded' && (
              <ol data-testid="setup-steps" className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-300">
                {STEPS[platform].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {state === 'downloaded' && (
              <p className="text-xs text-zinc-500">
                This page turns green as soon as your laptop connects. Each download holds its own private key, so
                please don’t share the file.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Not on {PLATFORM_NAMES[platform]}?{' '}
              {others.map((p, i) => (
                <span key={p}>
                  {i > 0 && ' or '}
                  <button type="button" className="underline hover:text-zinc-300" onClick={() => download(p)}>
                    {PLATFORM_NAMES[p]}
                  </button>
                </span>
              ))}
            </p>
          </div>
        ) : (
          <div data-testid="setup-other-device" className="flex flex-col gap-3 text-sm text-zinc-400">
            <p>Open code.doaide.com on the computer you code on (Mac, Windows or Linux) to set it up.</p>
            <p className="text-xs text-zinc-500">
              Or download for{' '}
              {Object.entries(PLATFORM_NAMES).map(([p, name], i) => (
                <span key={p}>
                  {i > 0 && ', '}
                  <button type="button" className="underline hover:text-zinc-300" onClick={() => download(p)}>
                    {name}
                  </button>
                </span>
              ))}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
          {!manual && (
            <button type="button" onClick={showManual} className="self-start underline hover:text-zinc-300">
              Prefer the terminal? Show the command instead
            </button>
          )}
          {manual?.error && <span className="text-red-300">Could not create a laptop token.</span>}
          {manual && !manual.error && (
            <>
              <span>Run this in the Doaide Code backend environment on your laptop:</span>
              <code
                data-testid="agent-command"
                className="block select-all overflow-x-auto whitespace-pre rounded-md border border-zinc-800 bg-black/40 p-2 font-mono text-[11px] text-zinc-300"
              >
                {`DOAIDE_HUB_URL=${manual.hub_url} DOAIDE_HUB_TOKEN=${manual.token} doaide-code agent`}
              </code>
            </>
          )}
          {!agentOnline && (
            <button type="button" onClick={onClose} className="self-start hover:text-zinc-300">
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
