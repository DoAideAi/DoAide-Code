// The IP subnet calculator page (/tools/ip-subnet-calculator): type an IPv4 address with a CIDR
// prefix or netmask and see the network, host range, masks in binary, a split into smaller
// subnets, and whether another address falls inside.

import { useState } from 'react'
import ToolShell, { CopyButton } from './ToolShell.jsx'
import { MAX_SPLIT_ROWS, contains, intToIp, ipToInt, parseCidr, prefixToMask, splitSubnets, subnetInfo } from './ipTool.js'
import { UTIL_TOOLS } from './utilTools.js'

const TOOL = UTIL_TOOLS.find((t) => t.slug === 'ip-subnet-calculator')

const INPUT = 'min-h-[44px] rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-sm text-zinc-200 sm:min-h-[36px]'
const PREFIXES = Array.from({ length: 33 }, (_, p) => p)

export default function IpCalcPage() {
  const [text, setText] = useState('192.168.1.10/24')
  const [splitTo, setSplitTo] = useState(26)
  const [probe, setProbe] = useState('')

  const parsed = parseCidr(text, 24)
  const info = parsed.error ? null : subnetInfo(parsed.ip, parsed.prefix)
  // A remembered split size that no longer fits the prefix falls back to four subnets.
  const splitAt = info && (splitTo > info.prefix ? splitTo : Math.min(32, info.prefix + 2))
  const split = info && splitAt > info.prefix ? splitSubnets(info.networkInt, info.prefix, splitAt) : null
  const probeIp = probe.trim() ? ipToInt(probe) : null

  const setPrefix = (p) => {
    const ip = parsed.error ? text.split(/[\s/]/)[0] : info.ip
    setText(`${ip}/${p}`)
  }

  const rows = info && [
    ['CIDR notation', info.cidr],
    ['Network address', info.network],
    ['Broadcast address', info.broadcast],
    ['Usable host range', `${info.firstHost} – ${info.lastHost}`],
    ['Usable hosts', info.usable.toLocaleString()],
    ['Total addresses', info.total.toLocaleString()],
    ['Subnet mask', info.netmask],
    ['Wildcard mask', info.wildcard],
    ['Address type', info.type],
    ['Class', info.addressClass],
    ['IP in hex', info.hex],
  ]

  return (
    <ToolShell tool={TOOL}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-zinc-300">
          IPv4 address with prefix or netmask
          <input
            data-testid="ip-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="10.0.0.1/16 or 10.0.0.1 255.255.0.0"
            className={`${INPUT} ${parsed.error ? 'border-rose-800' : ''}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          Prefix
          <select aria-label="Prefix length" data-testid="ip-prefix" value={info?.prefix ?? 24} onChange={(e) => setPrefix(Number(e.target.value))} className={INPUT}>
            {PREFIXES.map((p) => (
              <option key={p} value={p}>
                /{p} — {intToIp(prefixToMask(p))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-zinc-500">An address without a prefix is treated as /24.</p>

      {parsed.error && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {parsed.error}
        </p>
      )}

      {info && (
        <>
          <dl data-testid="ip-result" className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border border-zinc-800 p-4 text-sm sm:grid-cols-[auto_1fr]">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-zinc-500">{label}</dt>
                <dd data-testid={`ip-${label.toLowerCase().replace(/\W+/g, '-')}`} className="break-all font-mono text-zinc-200">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-1">
            <CopyButton text={rows.map(([l, v]) => `${l}: ${v}`).join('\n')} label="Copy all" />
            <CopyButton text={info.cidr} label="Copy CIDR" />
          </div>

          <section aria-label="Binary" className="overflow-x-auto rounded-lg border border-zinc-800 p-4">
            <h2 className="mb-2 text-sm font-medium text-zinc-200">In binary</h2>
            <pre className="font-mono text-xs leading-relaxed text-zinc-300">
              {`Address  ${info.binaryIp}\nMask     ${info.binaryMask}\n`}
              <span className="text-zinc-500">{'         ' + info.binaryMask.replace(/1/g, 'n').replace(/0/g, 'h')}</span>
              {'\n'}
              <span className="text-zinc-500">n = network bits ({info.prefix}), h = host bits ({32 - info.prefix})</span>
            </pre>
          </section>

          <section aria-label="Split into subnets" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Split {info.cidr} into</h2>
              <select aria-label="Subnet size" data-testid="ip-split" value={splitAt} onChange={(e) => setSplitTo(Number(e.target.value))} className={INPUT}>
                {PREFIXES.filter((p) => p > info.prefix).map((p) => (
                  <option key={p} value={p}>
                    /{p} ({(2 ** (p - info.prefix)).toLocaleString()} subnets)
                  </option>
                ))}
              </select>
            </div>
            {split ? (
              <div className="max-h-80 overflow-auto">
                <table data-testid="ip-split-table" className="w-full text-left font-mono text-xs">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-1 pr-4 font-normal">Subnet</th>
                      <th className="py-1 pr-4 font-normal">Host range</th>
                      <th className="py-1 pr-4 font-normal">Broadcast</th>
                      <th className="py-1 font-normal">Hosts</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    {split.rows.map((r) => (
                      <tr key={r.cidr} className="border-t border-zinc-800/60">
                        <td className="py-1 pr-4">{r.cidr}</td>
                        <td className="py-1 pr-4">{r.range}</td>
                        <td className="py-1 pr-4">{r.broadcast}</td>
                        <td className="py-1">{r.usable.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {split.total > MAX_SPLIT_ROWS && (
                  <p className="pt-2 text-xs text-zinc-500">
                    Showing the first {MAX_SPLIT_ROWS} of {split.total.toLocaleString()} subnets.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">A /32 can’t be split further.</p>
            )}
          </section>

          <section aria-label="Check an address" className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-4">
            <h2 className="text-sm font-medium text-zinc-200">Is an address in {info.cidr}?</h2>
            <input aria-label="Address to check" data-testid="ip-probe" value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="192.168.1.77" className={`${INPUT} max-w-xs`} />
            {probe.trim() && (
              <p data-testid="ip-probe-result" className={`text-sm ${probeIp !== null && contains(info.networkInt, info.prefix, probeIp) ? 'text-emerald-300' : 'text-amber-300'}`}>
                {probeIp === null
                  ? 'Not a valid IPv4 address.'
                  : contains(info.networkInt, info.prefix, probeIp)
                    ? `Yes — ${probe.trim()} is inside ${info.cidr}.`
                    : `No — ${probe.trim()} is outside ${info.cidr}.`}
              </p>
            )}
          </section>
        </>
      )}
    </ToolShell>
  )
}
