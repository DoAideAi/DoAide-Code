import { useEffect, useState } from 'react'
import { langFor } from '../highlight.js'
import { CodeBlock } from './CodeBlock.jsx'
import { copyText } from '../copy.js'

export { langFor }

function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// One file, read-only and highlighted. `load(path)` resolves to { content, size, binary, truncated }.
export default function FileViewer({ path, load, onClose }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    setFile(null)
    setError(null)
    load(path).then(
      (result) => active && setFile(result),
      (err) => active && setError(err.message || 'Could not open the file'),
    )
    return () => {
      active = false
    }
  }, [path, load])

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div data-testid="file-viewer" className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line/[0.06] px-4 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-200" title={path}>
          {path}
        </span>
        {file && <span className="shrink-0 text-[11px] text-zinc-500">{formatSize(file.size)}</span>}
        <button
          type="button"
          data-testid="copy-path"
          onClick={async () => setCopied(await copyText(path))}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
        >
          {copied ? 'Copied' : 'Copy path'}
        </button>
        <button
          type="button"
          data-testid="close-file"
          onClick={onClose}
          title="Back to chat"
          className="shrink-0 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {error ? (
          <div role="alert" className="py-8 text-center text-sm text-red-400">
            {error}
          </div>
        ) : !file ? (
          <div className="py-8 text-center text-sm text-zinc-500">Loading…</div>
        ) : file.binary ? (
          <div className="py-8 text-center text-sm text-zinc-500">Binary file, not shown</div>
        ) : (
          <>
            {file.truncated && (
              <div className="pt-1 text-xs text-amber-400">Large file: only the first {formatSize(file.content.length)} is shown.</div>
            )}
            <CodeBlock value={file.content} lang={langFor(path)} />
          </>
        )}
      </div>
    </div>
  )
}
