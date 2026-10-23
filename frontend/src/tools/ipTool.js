// IPv4 subnet maths on unsigned 32-bit integers: parse "192.168.1.10/24" (or an address plus a
// dotted netmask), and work out the network, broadcast, host range, masks and address type.

export const MAX_SPLIT_ROWS = 256

export function ipToInt(text) {
  const parts = text.trim().split('.')
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null
  return parts.reduce((n, p) => n * 256 + Number(p), 0)
}

export function intToIp(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

export const prefixToMask = (prefix) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0)

// The prefix length of a dotted netmask like 255.255.255.0, or null if it isn't contiguous.
export function maskToPrefix(text) {
  const n = ipToInt(text)
  if (n === null) return null
  for (let p = 0; p <= 32; p++) if (prefixToMask(p) === n) return p
  return null
}

export const toBinary = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map((o) => o.toString(2).padStart(8, '0')).join('.')

// { ip, prefix } from "10.0.0.1/8", "10.0.0.1 255.0.0.0" or a bare address (/32); or { error }.
export function parseCidr(text, fallbackPrefix = 32) {
  const t = text.trim()
  const m = /^([\d.]+)\s*(?:\/\s*(\d{1,2})|\s+([\d.]+))?$/.exec(t)
  if (!m) return { error: 'Enter an IPv4 address like 192.168.1.10/24.' }
  const ip = ipToInt(m[1])
  if (ip === null) return { error: `${m[1]} is not a valid IPv4 address — four numbers from 0 to 255.` }
  let prefix = fallbackPrefix
  if (m[2] !== undefined) {
    prefix = Number(m[2])
    if (prefix > 32) return { error: 'The prefix length must be between /0 and /32.' }
  } else if (m[3] !== undefined) {
    prefix = maskToPrefix(m[3])
    if (prefix === null) return { error: `${m[3]} is not a valid netmask — its 1 bits must be contiguous.` }
  }
  return { ip, prefix }
}

const RANGES = [
  ['0.0.0.0/8', 'This network (unspecified)'],
  ['10.0.0.0/8', 'Private (RFC 1918)'],
  ['100.64.0.0/10', 'Carrier-grade NAT (RFC 6598)'],
  ['127.0.0.0/8', 'Loopback'],
  ['169.254.0.0/16', 'Link-local (APIPA)'],
  ['172.16.0.0/12', 'Private (RFC 1918)'],
  ['192.0.2.0/24', 'Documentation (TEST-NET-1)'],
  ['192.168.0.0/16', 'Private (RFC 1918)'],
  ['198.18.0.0/15', 'Benchmarking'],
  ['198.51.100.0/24', 'Documentation (TEST-NET-2)'],
  ['203.0.113.0/24', 'Documentation (TEST-NET-3)'],
  ['224.0.0.0/4', 'Multicast'],
  ['255.255.255.255/32', 'Limited broadcast'],
  ['240.0.0.0/4', 'Reserved'],
]

export function addressType(ip) {
  for (const [cidr, label] of RANGES) {
    const { ip: base, prefix } = parseCidr(cidr)
    const mask = prefixToMask(prefix)
    if (((ip & mask) >>> 0) === base) return label
  }
  return 'Public'
}

export function addressClass(ip) {
  const first = ip >>> 24
  if (first < 128) return 'A'
  if (first < 192) return 'B'
  if (first < 224) return 'C'
  if (first < 240) return 'D (multicast)'
  return 'E (reserved)'
}

// Everything about the subnet containing ip/prefix.
export function subnetInfo(ip, prefix) {
  const mask = prefixToMask(prefix)
  const network = (ip & mask) >>> 0
  const size = 2 ** (32 - prefix)
  const broadcast = network + size - 1
  // /31 point-to-point links (RFC 3021) and /32 single hosts have no network/broadcast to skip.
  const [first, last, usable] = prefix >= 31 ? [network, broadcast, size] : [network + 1, broadcast - 1, size - 2]
  return {
    ip: intToIp(ip),
    prefix,
    cidr: `${intToIp(network)}/${prefix}`,
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    netmask: intToIp(mask),
    wildcard: intToIp(~mask >>> 0),
    firstHost: intToIp(first),
    lastHost: intToIp(last),
    total: size,
    usable,
    type: addressType(ip),
    addressClass: addressClass(ip),
    binaryIp: toBinary(ip),
    binaryMask: toBinary(mask),
    hex: '0x' + ip.toString(16).padStart(8, '0').toUpperCase(),
    networkInt: network,
  }
}

// The subnets of the given size inside a network: { rows, total } (rows capped for display).
export function splitSubnets(network, prefix, newPrefix) {
  if (newPrefix < prefix || newPrefix > 32) return { rows: [], total: 0 }
  const total = 2 ** (newPrefix - prefix)
  const step = 2 ** (32 - newPrefix)
  const rows = []
  for (let i = 0; i < Math.min(total, MAX_SPLIT_ROWS); i++) {
    const info = subnetInfo(network + i * step, newPrefix)
    rows.push({ cidr: info.cidr, range: `${info.firstHost} – ${info.lastHost}`, broadcast: info.broadcast, usable: info.usable })
  }
  return { rows, total }
}

export function contains(network, prefix, ip) {
  return ((ip & prefixToMask(prefix)) >>> 0) === network
}
