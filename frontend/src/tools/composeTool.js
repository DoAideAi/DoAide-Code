// The Docker Compose validator (/tools/docker-compose-validator): parses with the `yaml` package
// (keeping node positions) and checks the file against the Compose Specification's common rules.

import { LineCounter, isMap, isScalar, isSeq, parseDocument } from 'yaml'

const TOP_KEYS = ['services', 'networks', 'volumes', 'configs', 'secrets', 'name', 'include', 'version', 'models']
export const SERVICE_KEYS = [
  'annotations', 'attach', 'blkio_config', 'build', 'cap_add', 'cap_drop', 'cgroup', 'cgroup_parent', 'command', 'configs',
  'container_name', 'cpu_count', 'cpu_percent', 'cpu_period', 'cpu_quota', 'cpu_rt_period', 'cpu_rt_runtime', 'cpu_shares',
  'cpus', 'cpuset', 'credential_spec', 'depends_on', 'deploy', 'develop', 'device_cgroup_rules', 'devices', 'dns', 'dns_opt',
  'dns_search', 'domainname', 'driver_opts', 'entrypoint', 'env_file', 'environment', 'expose', 'extends', 'external_links',
  'extra_hosts', 'gpus', 'group_add', 'healthcheck', 'hostname', 'image', 'init', 'ipc', 'isolation', 'label_file', 'labels',
  'links', 'logging', 'mac_address', 'mem_limit', 'mem_reservation', 'mem_swappiness', 'memswap_limit', 'models',
  'network_mode', 'networks', 'oom_kill_disable', 'oom_score_adj', 'pid', 'pids_limit', 'platform', 'ports', 'post_start',
  'pre_stop', 'privileged', 'profiles', 'provider', 'pull_policy', 'read_only', 'restart', 'runtime', 'scale', 'secrets',
  'security_opt', 'shm_size', 'stdin_open', 'stop_grace_period', 'stop_signal', 'storage_opt', 'sysctls', 'tmpfs', 'tty',
  'ulimits', 'use_api_socket', 'user', 'userns_mode', 'uts', 'volumes', 'volumes_from', 'working_dir',
]
const RESTART = /^(no|always|unless-stopped|on-failure(:\d+)?)$/
const CONDITIONS = ['service_started', 'service_healthy', 'service_completed_successfully']
const VOLUME_MODES = new Set(['ro', 'rw', 'z', 'Z', 'cached', 'delegated', 'consistent', 'nocopy', 'shared', 'slave', 'private', 'rshared', 'rslave', 'rprivate'])

// Edit distance, for "did you mean" suggestions.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

function suggest(word, options) {
  let best = null
  let bestD = 3
  for (const o of options) {
    const dd = distance(word.toLowerCase(), o)
    if (dd < bestD) {
      best = o
      bestD = dd
    }
  }
  return best
}

const validPort = (s) => /^\d+(-\d+)?$/.test(s) && s.split('-').every((n) => Number(n) >= 1 && Number(n) <= 65535) && (s.split('-').length === 1 || Number(s.split('-')[0]) <= Number(s.split('-')[1]))

// '127.0.0.1:8080:80/tcp' → null when valid, else the reason.
export function checkPortString(spec) {
  let s = spec
  const proto = /\/(tcp|udp|sctp)$/i.exec(s)
  if (proto) s = s.slice(0, proto.index)
  else if (s.includes('/')) return `unknown protocol in “${spec}” — use /tcp or /udp`
  let ip = null
  const v6 = /^\[([0-9a-f:]+)\]:(.*)$/i.exec(s)
  if (v6) {
    ip = v6[1]
    s = v6[2]
  }
  const parts = s.split(':')
  if (!v6 && parts.length === 3) ip = parts.shift()
  if (parts.length > 2 || (v6 && parts.length !== 2)) return `“${spec}” is not HOST:CONTAINER or IP:HOST:CONTAINER`
  if (ip !== null && !v6 && !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return `“${ip}” is not an IP address`
  const [host, container] = parts.length === 2 ? parts : [null, parts[0]]
  if (host !== null && host !== '' && !validPort(host)) return `host port “${host}” must be 1–65535 (or a range like 8000-8010)`
  if (!validPort(container)) return `container port “${container}” must be 1–65535`
  return null
}

// Runs every check: { issues: [{ level: 'error' | 'warning' | 'info', line, text }], services }.
export function validateCompose(text) {
  const lc = new LineCounter()
  const doc = parseDocument(text, { lineCounter: lc, prettyErrors: true, uniqueKeys: true })
  const issues = []
  const lineOf = (node) => (node?.range ? lc.linePos(node.range[0]).line : null)
  const add = (level, node, msg) => issues.push({ level, line: typeof node === 'number' ? node : lineOf(node), text: msg })

  for (const e of doc.errors) issues.push({ level: 'error', line: e.linePos?.[0]?.line ?? null, text: e.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '') })
  if (doc.errors.length) return { issues, services: [] }
  const root = doc.contents
  if (!isMap(root)) {
    add('error', 1, 'The file must be a mapping with a top-level services: key.')
    return { issues, services: [] }
  }

  const pairs = (map) => (isMap(map) ? map.items.filter((p) => isScalar(p.key)) : [])
  const top = Object.fromEntries(pairs(root).map((p) => [String(p.key.value), p]))
  for (const p of pairs(root)) {
    const k = String(p.key.value)
    if (k === 'version') add('warning', p.key, 'version is obsolete in the Compose Specification and ignored — remove it.')
    else if (!TOP_KEYS.includes(k) && !k.startsWith('x-')) {
      const s = suggest(k, TOP_KEYS)
      add('error', p.key, `Unknown top-level key “${k}”${s ? ` — did you mean “${s}”?` : ''}`)
    }
  }
  const declared = (key) => new Set(pairs(top[key]?.value).map((p) => String(p.key.value)))
  const volumes = declared('volumes')
  const networks = declared('networks')
  const usedVolumes = new Set()
  const usedNetworks = new Set()

  const servicesNode = top.services?.value
  if (!top.services) add('error', 1, 'No services: key — a compose file needs at least one service.')
  else if (!isMap(servicesNode) || !servicesNode.items.length) add('error', top.services.key, 'services must be a mapping of service names to definitions.')
  const serviceNames = new Set(pairs(servicesNode).map((p) => String(p.key.value)))
  const deps = new Map()
  const summary = []

  for (const sp of pairs(servicesNode)) {
    const name = String(sp.key.value)
    const svc = sp.value
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) add('error', sp.key, `Service name “${name}” may only use letters, digits, _ . and -.`)
    if (!isMap(svc)) {
      add('error', sp.key, `Service ${name} must be a mapping.`)
      continue
    }
    const f = Object.fromEntries(pairs(svc).map((p) => [String(p.key.value), p]))
    const val = (k) => f[k]?.value
    const js = (k) => val(k)?.toJSON?.() ?? (isScalar(val(k)) ? val(k).value : undefined)

    for (const p of pairs(svc)) {
      const k = String(p.key.value)
      if (!SERVICE_KEYS.includes(k) && !k.startsWith('x-')) {
        const s = suggest(k, SERVICE_KEYS)
        add('error', p.key, `${name}: unknown key “${k}”${s ? ` — did you mean “${s}”?` : ''}`)
      }
    }
    if (!f.image && !f.build && !f.extends) add('error', sp.key, `${name}: needs an image or a build section.`)

    const image = js('image')
    if (typeof image === 'string') {
      const tag = /:([\w][\w.-]*)$/.exec(image.split('/').pop())?.[1]
      if (!image.includes('@') && (!tag || tag === 'latest')) add('info', f.image.value, `${name}: image “${image}” has no pinned tag — builds may change under you. Pin a version like ${image.split(':')[0]}:1.2.3.`)
    }

    const restart = js('restart')
    if (restart !== undefined && !RESTART.test(String(restart))) add('error', f.restart.value, `${name}: restart must be no, always, on-failure[:N] or unless-stopped.`)

    // ports
    const ports = val('ports')
    if (ports && !isSeq(ports)) add('error', ports, `${name}: ports must be a list.`)
    const portList = []
    for (const item of isSeq(ports) ? ports.items : []) {
      if (isScalar(item)) {
        const spec = String(item.value)
        portList.push(spec)
        const err = checkPortString(spec)
        if (err) add('error', item, `${name}: ${err}`)
        else if (item.type === 'PLAIN' && /^\d+:\d+$/.test(spec) && spec.split(':').every((n) => Number(n) < 60))
          add('warning', item, `${name}: quote “${spec}” — YAML 1.1 parsers read unquoted xx:yy under 60 as a base-60 number.`)
      } else if (isMap(item)) {
        const o = item.toJSON()
        if (o.target === undefined) add('error', item, `${name}: long-syntax port needs target.`)
        else if (!validPort(String(o.target))) add('error', item, `${name}: port target ${o.target} must be 1–65535.`)
        if (o.published !== undefined && !validPort(String(o.published))) add('error', item, `${name}: published port ${o.published} must be 1–65535.`)
        portList.push(`${o.published ?? ''}${o.published !== undefined ? ':' : ''}${o.target}`)
      }
    }

    // volumes
    const vols = val('volumes')
    if (vols && !isSeq(vols)) add('error', vols, `${name}: volumes must be a list.`)
    for (const item of isSeq(vols) ? vols.items : []) {
      if (isScalar(item)) {
        const parts = String(item.value).split(':')
        if (/^[A-Za-z]$/.test(parts[0]) && parts.length > 1) parts.splice(0, 2, `${parts[0]}:${parts[1]}`) // C:\path
        if (parts.length > 3) {
          add('error', item, `${name}: volume “${item.value}” has too many colons.`)
          continue
        }
        const [src, dst, mode] = parts.length === 1 ? [null, parts[0]] : parts
        if (!dst || !(dst.startsWith('/') || /^[A-Za-z]:\\/.test(dst))) add('error', item, `${name}: volume target “${dst ?? ''}” must be an absolute path in the container.`)
        if (mode && !mode.split(',').every((m) => VOLUME_MODES.has(m))) add('error', item, `${name}: unknown volume mode “${mode}” — use ro, rw, z or Z.`)
        if (src && !/^[./~$]/.test(src) && !src.includes('/') && !/^[A-Za-z]:/.test(src)) {
          usedVolumes.add(src)
          if (!volumes.has(src)) add('error', item, `${name}: named volume “${src}” is not declared under the top-level volumes: key.`)
        }
        if (src && /docker\.sock$/.test(src)) add('warning', item, `${name}: mounting the Docker socket gives this container root control of the host.`)
      } else if (isMap(item)) {
        const o = item.toJSON()
        if (!o.target) add('error', item, `${name}: long-syntax volume needs target.`)
        if (o.type && !['volume', 'bind', 'tmpfs', 'npipe', 'cluster', 'image'].includes(o.type)) add('error', item, `${name}: volume type must be volume, bind, tmpfs or npipe.`)
        if ((o.type ?? 'volume') === 'volume' && o.source) {
          usedVolumes.add(o.source)
          if (!volumes.has(o.source)) add('error', item, `${name}: named volume “${o.source}” is not declared under the top-level volumes: key.`)
        }
        if (typeof o.source === 'string' && /docker\.sock$/.test(o.source)) add('warning', item, `${name}: mounting the Docker socket gives this container root control of the host.`)
      }
    }

    // networks
    const nets = val('networks')
    const netNames = isSeq(nets) ? nets.items.filter(isScalar).map((n) => [String(n.value), n]) : pairs(nets).map((p) => [String(p.key.value), p.key])
    if (nets && !isSeq(nets) && !isMap(nets)) add('error', nets, `${name}: networks must be a list or a mapping.`)
    for (const [n, node] of netNames) {
      usedNetworks.add(n)
      if (n !== 'default' && !networks.has(n)) add('error', node, `${name}: network “${n}” is not declared under the top-level networks: key.`)
    }
    if (f.network_mode && nets) add('error', f.network_mode.key, `${name}: network_mode can’t be combined with networks.`)
    const netMode = js('network_mode')
    if (netMode === 'host') add('warning', f.network_mode.value, `${name}: network_mode: host shares the host’s network stack — ports: is ignored and isolation is lost.`)

    // depends_on
    const dep = val('depends_on')
    const depList = isSeq(dep) ? dep.items.filter(isScalar).map((n) => [String(n.value), n]) : pairs(dep).map((p) => [String(p.key.value), p.key])
    if (dep && !isSeq(dep) && !isMap(dep)) add('error', dep, `${name}: depends_on must be a list or a mapping.`)
    for (const [d, node] of depList) {
      if (d === name) add('error', node, `${name}: a service can’t depend on itself.`)
      else if (!serviceNames.has(d)) add('error', node, `${name}: depends_on “${d}”, which is not a service in this file.`)
    }
    for (const p of isMap(dep) ? pairs(dep) : []) {
      const cond = isMap(p.value) ? p.value.toJSON().condition : undefined
      if (cond !== undefined && !CONDITIONS.includes(cond)) add('error', p.value, `${name}: depends_on condition must be ${CONDITIONS.join(', ')}.`)
      if (cond === 'service_healthy') {
        const target = servicesNode.get(String(p.key.value))
        if (isMap(target) && !target.has('healthcheck')) add('warning', p.key, `${name}: waits for ${p.key.value} to be healthy, but ${p.key.value} has no healthcheck (unless its image defines one).`)
      }
    }
    deps.set(name, depList.map(([d]) => d))

    // environment
    const env = val('environment')
    if (isSeq(env)) {
      for (const item of env.items) if (!isScalar(item) || !/^[^=\s]+(=.*)?$/s.test(String(item.value))) add('error', item, `${name}: environment list entries must look like KEY=value.`)
    } else if (isMap(env)) {
      for (const p of env.items) if (p.value && !isScalar(p.value)) add('error', p.value, `${name}: environment value for ${p.key?.value} must be a string, number or boolean.`)
    } else if (env) add('error', env, `${name}: environment must be a list or a mapping.`)

    if (js('privileged') === true) add('warning', f.privileged.value, `${name}: privileged: true gives the container full access to the host’s devices.`)
    const caps = js('cap_add')
    if (Array.isArray(caps) && caps.some((c) => String(c).toUpperCase() === 'ALL')) add('warning', f.cap_add.value, `${name}: cap_add: ALL grants every Linux capability.`)

    summary.push({ name, image: typeof image === 'string' ? image : f.build ? '(build)' : '', ports: portList })
  }

  // depends_on cycles
  const state = new Map()
  const cycle = (n, path) => {
    if (state.get(n) === 1) return [...path.slice(path.indexOf(n)), n]
    if (state.get(n) === 2) return null
    state.set(n, 1)
    for (const d of deps.get(n) ?? []) {
      const c = cycle(d, [...path, n])
      if (c) return c
    }
    state.set(n, 2)
    return null
  }
  for (const n of deps.keys()) {
    const c = cycle(n, [])
    if (c) {
      add('error', pairs(servicesNode).find((p) => String(p.key.value) === n).key, `depends_on cycle: ${c.join(' → ')}`)
      break
    }
  }

  for (const v of volumes) if (!usedVolumes.has(v)) add('info', pairs(top.volumes.value).find((p) => String(p.key.value) === v).key, `Volume “${v}” is declared but no service uses it.`)
  for (const n of networks) if (!usedNetworks.has(n)) add('info', pairs(top.networks.value).find((p) => String(p.key.value) === n).key, `Network “${n}” is declared but no service uses it.`)

  issues.sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
  return { issues, services: summary }
}
