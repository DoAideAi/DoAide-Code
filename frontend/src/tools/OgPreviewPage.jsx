// The Open Graph preview page (/tools/og-preview): paste a page's HTML (or type the fields) and
// see the link card on Google, Facebook, X, LinkedIn, WhatsApp, Slack and Discord, with checks
// and the meta tags to copy.

import { useState } from 'react'
import ToolShell, { BUTTON, CopyButton } from './ToolShell.jsx'
import { checkTags, clip, metaTags, parseMeta, resolveCard } from './ogTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'og-preview')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200 sm:min-h-[36px]'

const SAMPLE = `<head>
  <title>Free Online Code Tools | DoAide Code</title>
  <meta name="description" content="Format, diff, convert and explain code in your browser. 60+ free developer tools, no sign-up.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://code.doaide.com/all-tools">
  <meta property="og:title" content="60+ free developer tools — DoAide Code">
  <meta property="og:description" content="Format, diff, convert and explain code in your browser. No sign-up, nothing uploaded.">
  <meta property="og:image" content="https://code.doaide.com/og-image.png">
  <meta property="og:site_name" content="DoAide Code">
  <meta name="twitter:card" content="summary_large_image">
</head>`

const FIELDS = [
  ['og:title', 'Title'],
  ['og:description', 'Description'],
  ['og:image', 'Image URL'],
  ['og:url', 'Page URL'],
  ['og:site_name', 'Site name'],
]

function Img({ src, className, alt = '' }) {
  const [failed, setFailed] = useState(null)
  if (!src || !/^https?:\/\//i.test(src) || failed === src)
    return <div className={`flex items-center justify-center bg-zinc-800 text-xs text-zinc-500 ${className}`}>{src ? 'Image not loadable' : 'No image'}</div>
  return <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(src)} className={`object-cover ${className}`} />
}

function Frame({ name, children }) {
  return (
    <section aria-label={`${name} preview`} className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{name}</h2>
      {children}
    </section>
  )
}

export default function OgPreviewPage() {
  const [html, setHtml] = useState(SAMPLE)
  const [tags, setTags] = useState(() => parseMeta(SAMPLE))
  const card = resolveCard(tags)
  const checks = checkTags(tags)
  const large = card.twitterCard !== 'summary'
  const host = card.host || 'example.com'

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            Paste the page’s HTML (or just its &lt;head&gt;)
            <textarea
              data-testid="og-html"
              value={html}
              onChange={(e) => {
                setHtml(e.target.value)
                setTags(parseMeta(e.target.value))
              }}
              rows={10}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-shade/40 p-3 font-mono text-[13px] text-zinc-200"
            />
          </label>
          <p className="text-xs text-zinc-500">Tip: open the page, press Ctrl+U (View Source), copy everything and paste it here.</p>
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-3">
            <p className="text-sm text-zinc-300">…or edit the fields</p>
            {FIELDS.map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-xs text-zinc-400">
                {label} <span className="font-mono text-zinc-600">{key}</span>
                <input
                  data-testid={`og-field-${key.slice(3)}`}
                  value={tags[key] ?? ''}
                  onChange={(e) => setTags((t) => ({ ...t, [key]: e.target.value }))}
                  className={INPUT}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              twitter:card
              <select value={tags['twitter:card'] ?? ''} onChange={(e) => setTags((t) => ({ ...t, 'twitter:card': e.target.value }))} className={INPUT}>
                <option value="">(not set)</option>
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </label>
          </div>
          <ul data-testid="og-checks" className="flex flex-col gap-1 text-sm">
            {checks.map((c) => (
              <li key={c.text} className={c.level === 'error' ? 'text-rose-300' : c.level === 'warn' ? 'text-amber-200' : 'text-emerald-300'}>
                {c.level === 'error' ? '✕' : c.level === 'warn' ? '!' : '✓'} {c.text}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Meta tags</span>
            <CopyButton text={metaTags({ ...card, type: tags['og:type'] || 'website', twitterCard: card.twitterCard || 'summary_large_image' })} label="Copy tags" testid="og-copy" />
          </div>
          <pre className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-emerald-200">
            {metaTags({ ...card, type: tags['og:type'] || 'website', twitterCard: card.twitterCard || 'summary_large_image' })}
          </pre>
          <a href="/tools/meta-tag-generator" className={`${BUTTON} flex items-center self-start`}>
            Generate a full set of meta tags →
          </a>
        </div>

        <div className="flex flex-col gap-5">
          <Frame name="Google">
            <div className="rounded-lg bg-white p-4 font-sans">
              <p className="text-xs text-[#202124]">{host}</p>
              <p data-testid="og-google-title" className="text-lg leading-snug text-[#1a0dab]">
                {clip(tags.title || card.title || 'Untitled page', 60)}
              </p>
              <p className="text-sm text-[#4d5156]">{clip(tags.description || card.description || 'No description — Google will pick text from the page.', 158)}</p>
            </div>
          </Frame>

          <Frame name="Facebook">
            <div className="overflow-hidden rounded-lg border border-zinc-700 bg-[#f0f2f5] font-sans">
              <Img src={card.image} alt={card.imageAlt} className="aspect-[1.91/1] w-full" />
              <div className="px-3 py-2">
                <p className="text-xs uppercase text-[#65676b]">{host}</p>
                <p data-testid="og-fb-title" className="font-semibold leading-snug text-[#050505]">
                  {clip(card.title || host, 88)}
                </p>
                <p className="text-sm text-[#65676b]">{clip(card.description, 110)}</p>
              </div>
            </div>
          </Frame>

          <Frame name={`X / Twitter (${large ? 'large image' : 'summary'})`}>
            {large ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-700 font-sans">
                <Img src={card.twitterImage} alt={card.imageAlt} className="aspect-[1.91/1] w-full" />
                <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 text-xs text-white">{clip(card.twitterTitle, 70)}</span>
              </div>
            ) : (
              <div className="flex overflow-hidden rounded-2xl border border-zinc-700 font-sans">
                <Img src={card.twitterImage} alt={card.imageAlt} className="h-28 w-28 shrink-0" />
                <div className="min-w-0 px-3 py-2 text-sm">
                  <p className="text-zinc-500">{host}</p>
                  <p className="text-zinc-100">{clip(card.twitterTitle, 70)}</p>
                  <p className="text-zinc-500">{clip(card.twitterDescription, 100)}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-500">From {host}</p>
          </Frame>

          <Frame name="LinkedIn">
            <div className="overflow-hidden rounded-lg border border-zinc-700 bg-white font-sans">
              <Img src={card.image} alt={card.imageAlt} className="aspect-[1.91/1] w-full" />
              <div className="px-3 py-2">
                <p className="font-semibold text-[#000000e6]">{clip(card.title || host, 70)}</p>
                <p className="text-xs text-[#00000099]">{host}</p>
              </div>
            </div>
          </Frame>

          <Frame name="WhatsApp">
            <div className="max-w-sm rounded-lg bg-[#005c4b] p-1 font-sans">
              <div className="flex overflow-hidden rounded-md bg-[#025144]">
                <Img src={card.image} alt={card.imageAlt} className="h-20 w-20 shrink-0" />
                <div className="min-w-0 px-2 py-1 text-sm">
                  <p className="font-medium text-white">{clip(card.title, 60)}</p>
                  <p className="text-xs text-[#d1d7db]">{clip(card.description, 80)}</p>
                  <p className="text-xs text-[#8696a0]">{host}</p>
                </div>
              </div>
              <p className="px-1 pt-1 text-sm text-[#53bdeb]">{card.url || `https://${host}`}</p>
            </div>
          </Frame>

          <Frame name="Slack">
            <div className="border-l-4 border-zinc-600 pl-3 font-sans text-sm">
              <p className="font-bold text-zinc-200">{card.siteName}</p>
              <p className="font-bold text-sky-400">{clip(card.title, 80)}</p>
              <p className="text-zinc-300">{clip(card.description, 200)}</p>
              <Img src={card.image} alt={card.imageAlt} className="mt-2 aspect-[1.91/1] w-72 rounded" />
            </div>
          </Frame>

          <Frame name="Discord">
            <div className="max-w-md rounded border-l-4 border-[#5865f2] bg-[#2b2d31] p-3 font-sans text-sm">
              <p className="text-xs text-[#dbdee1]">{card.siteName}</p>
              <p className="font-semibold text-[#00a8fc]">{clip(card.title, 80)}</p>
              <p className="text-[#dbdee1]">{clip(card.description, 200)}</p>
              <Img src={card.image} alt={card.imageAlt} className="mt-2 aspect-[1.91/1] w-full rounded" />
            </div>
          </Frame>
        </div>
      </div>
    </ToolShell>
  )
}
