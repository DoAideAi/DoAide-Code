// The nginx config generator (/tools/nginx-config-generator): options → a server block for a
// static site, SPA, reverse proxy or PHP-FPM, with HTTPS, redirects, caching and headers.

export const TYPES = [
  ['static', 'Static site'],
  ['spa', 'Single-page app'],
  ['proxy', 'Reverse proxy'],
  ['php', 'PHP-FPM'],
]

export const DEFAULTS = {
  type: 'spa',
  domain: 'example.com',
  www: 'to-apex', // 'none' | 'to-apex' | 'to-www'
  root: '/var/www/example.com/dist',
  upstream: 'http://127.0.0.1:3000',
  phpSocket: 'unix:/run/php/php8.3-fpm.sock',
  https: true,
  http2: true,
  gzip: true,
  cache: true,
  security: true,
  websocket: false,
  bodySize: '10m',
  rateLimit: false,
  rate: 10,
  logs: true,
}

const INDENT = '    '
const block = (head, body) => [`${head} {`, ...body.map((l) => (l ? INDENT + l : l)), '}']
const zoneName = (domain) => domain.replace(/[^a-z0-9]+/gi, '_')

// The headers every response should carry; repeated inside any location that sets its own
// add_header, because nginx drops inherited add_header directives there.
function securityHeaders(o) {
  if (!o.security) return []
  return [
    ...(o.https ? ['add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;'] : []),
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header X-Frame-Options "SAMEORIGIN" always;',
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
  ]
}

function listen(o) {
  if (!o.https) return ['listen 80;', 'listen [::]:80;']
  const h2 = o.http2 ? ' http2' : ''
  return [`listen 443 ssl${h2};`, `listen [::]:443 ssl${h2};`]
}

function tls(o) {
  if (!o.https) return []
  return [
    `ssl_certificate /etc/letsencrypt/live/${o.certName}/fullchain.pem;`,
    `ssl_certificate_key /etc/letsencrypt/live/${o.certName}/privkey.pem;`,
    'ssl_protocols TLSv1.2 TLSv1.3;',
    'ssl_session_cache shared:SSL:10m;',
    'ssl_session_timeout 1d;',
  ]
}

const ASSETS = 'location ~* \\.(?:css|js|mjs|woff2?|ttf|otf|eot|svg|ico|png|jpe?g|gif|webp|avif|mp4|webm)$'

function locations(o) {
  const limit = o.rateLimit ? [`limit_req zone=${zoneName(o.domain)} burst=${o.rate * 2} nodelay;`] : []
  const out = []
  const cacheBlock = () =>
    o.cache ? ['', ...block(ASSETS, ['expires 1y;', 'add_header Cache-Control "public, immutable";', ...securityHeaders(o), 'access_log off;', 'try_files $uri =404;'])] : []

  if (o.type === 'proxy') {
    out.push(
      ...block('location /', [
        ...limit,
        `proxy_pass ${o.upstream};`,
        'proxy_http_version 1.1;',
        'proxy_set_header Host $host;',
        'proxy_set_header X-Real-IP $remote_addr;',
        'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
        'proxy_set_header X-Forwarded-Proto $scheme;',
        ...(o.websocket ? ['proxy_set_header Upgrade $http_upgrade;', 'proxy_set_header Connection $connection_upgrade;', 'proxy_read_timeout 3600s;'] : ['proxy_read_timeout 60s;']),
        'proxy_connect_timeout 10s;',
      ]),
    )
  } else if (o.type === 'php') {
    out.push(...block('location /', [...limit, 'try_files $uri $uri/ /index.php?$query_string;']))
    out.push('', ...block('location ~ \\.php$', ['include snippets/fastcgi-php.conf;', `fastcgi_pass ${o.phpSocket};`]))
    out.push(...cacheBlock())
  } else if (o.type === 'spa') {
    out.push(...block('location /', [...limit, 'try_files $uri $uri/ /index.html;']))
    out.push('', '# Always revalidate the HTML so new deploys show up; hashed assets are cached below.')
    out.push(...block('location = /index.html', ['add_header Cache-Control "no-cache";', ...securityHeaders(o)]))
    out.push(...cacheBlock())
  } else {
    out.push(...block('location /', [...limit, 'try_files $uri $uri/ =404;']))
    out.push(...cacheBlock())
  }
  if (o.type !== 'proxy') out.push('', '# Hide dotfiles (.git, .env) but keep ACME challenges working.', ...block('location ~ /\\.(?!well-known)', ['deny all;']))
  return out
}

// Options → the full config text.
export function buildNginx(opts) {
  const o = { ...DEFAULTS, ...opts }
  const apex = o.domain.replace(/^www\./, '')
  const www = `www.${apex}`
  const canonical = o.www === 'to-www' ? www : o.www === 'to-apex' ? apex : o.domain
  const other = o.www === 'to-www' ? apex : o.www === 'to-apex' ? www : null
  const names = o.www === 'none' ? [o.domain] : [canonical]
  const scheme = o.https ? 'https' : 'http'
  // certbot names the certificate after its first -d, which installCommands makes the apex.
  const cfg = { ...o, domain: canonical, certName: o.www === 'none' ? o.domain : apex }
  const out = []

  if (o.rateLimit || (o.type === 'proxy' && o.websocket)) {
    out.push('# Put these in the http { } block, e.g. /etc/nginx/conf.d/' + zoneName(canonical) + '.conf')
    if (o.rateLimit) out.push(`limit_req_zone $binary_remote_addr zone=${zoneName(canonical)}:10m rate=${o.rate}r/s;`, 'limit_req_status 429;')
    if (o.type === 'proxy' && o.websocket) out.push(...block('map $http_upgrade $connection_upgrade', ["default upgrade;", "''      close;"]))
    out.push('')
  }

  if (o.https) {
    out.push('# Redirect all plain HTTP to HTTPS')
    out.push(...block('server', ['listen 80;', 'listen [::]:80;', `server_name ${[canonical, other].filter(Boolean).join(' ')};`, `return 301 https://${canonical}$request_uri;`]), '')
  }
  if (other) {
    out.push(`# Redirect ${other} to ${canonical}`)
    out.push(...block('server', [...listen(o), `server_name ${other};`, ...tls(cfg), `return 301 ${scheme}://${canonical}$request_uri;`]), '')
  }

  const body = [
    ...listen(o),
    `server_name ${names.join(' ')};`,
    ...(o.type !== 'proxy' ? [`root ${o.root};`, `index ${o.type === 'php' ? 'index.php index.html' : 'index.html'};`] : []),
    ...(o.https ? ['', ...tls(cfg)] : []),
    '',
    'server_tokens off;',
    `client_max_body_size ${o.bodySize || '1m'};`,
    ...(o.logs ? [`access_log /var/log/nginx/${canonical}.access.log;`, `error_log /var/log/nginx/${canonical}.error.log;`] : []),
    ...(o.security ? ['', ...securityHeaders(o)] : []),
    ...(o.gzip
      ? [
          '',
          'gzip on;',
          'gzip_vary on;',
          'gzip_proxied any;',
          'gzip_comp_level 5;',
          'gzip_min_length 256;',
          'gzip_types text/plain text/css text/xml application/json application/javascript application/xml application/rss+xml image/svg+xml;',
        ]
      : []),
    '',
    ...locations(cfg),
  ]
  out.push(...block('server', body))
  return out.join('\n') + '\n'
}

// The shell steps to install it on Debian/Ubuntu.
export function installCommands(opts) {
  const o = { ...DEFAULTS, ...opts }
  const apex = o.domain.replace(/^www\./, '')
  const file = `/etc/nginx/sites-available/${o.www === 'to-www' ? `www.${apex}` : o.www === 'to-apex' ? apex : o.domain}`
  const domains = o.www === 'none' ? [o.domain] : [apex, `www.${apex}`]
  return [
    ...(o.https ? [`# Get the certificate first — nginx -t fails while the files are missing`, `sudo certbot certonly --nginx ${domains.map((d) => `-d ${d}`).join(' ')}`] : []),
    `sudo nano ${file}   # paste the config`,
    `sudo ln -s ${file} /etc/nginx/sites-enabled/`,
    'sudo nginx -t && sudo systemctl reload nginx',
  ].join('\n')
}
