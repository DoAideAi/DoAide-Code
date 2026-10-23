import { describe, expect, it } from 'vitest'
import { buildNginx, installCommands } from './nginxTool.js'

// Braces must balance, or nginx -t fails.
const balanced = (s) => s.split('{').length === s.split('}').length

describe('buildNginx', () => {
  it('writes an HTTPS SPA with redirects, headers and caching', () => {
    const c = buildNginx({ type: 'spa', domain: 'example.com' })
    expect(balanced(c)).toBe(true)
    expect(c).toContain('server_name example.com www.example.com;\n    return 301 https://example.com$request_uri;')
    expect(c).toContain('server_name www.example.com;')
    expect(c).toContain('listen 443 ssl http2;')
    expect(c).toContain('ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;')
    expect(c).toContain('try_files $uri $uri/ /index.html;')
    expect(c).toContain('add_header Strict-Transport-Security')
    // security headers repeated in locations with their own add_header
    const indexBlock = c.slice(c.indexOf('location = /index.html'))
    expect(indexBlock.slice(0, indexBlock.indexOf('}'))).toContain('X-Content-Type-Options')
    expect(c).toContain('expires 1y;')
    expect(c).toContain('gzip on;')
  })

  it('writes a reverse proxy with WebSocket and rate limiting', () => {
    const c = buildNginx({ type: 'proxy', domain: 'api.example.com', www: 'none', websocket: true, rateLimit: true, rate: 5, https: false })
    expect(balanced(c)).toBe(true)
    expect(c).toContain('limit_req_zone $binary_remote_addr zone=api_example_com:10m rate=5r/s;')
    expect(c).toContain('map $http_upgrade $connection_upgrade {')
    expect(c).toContain('limit_req zone=api_example_com burst=10 nodelay;')
    expect(c).toContain('proxy_pass http://127.0.0.1:3000;')
    expect(c).toContain('proxy_set_header Connection $connection_upgrade;')
    expect(c).toContain('listen 80;')
    expect(c).not.toContain('ssl')
    expect(c).not.toContain('Strict-Transport-Security')
    expect(c).not.toContain('root ')
  })

  it('writes PHP-FPM and static configs, with www as canonical', () => {
    const php = buildNginx({ type: 'php', domain: 'example.com', www: 'to-www', https: false, cache: false, gzip: false, security: false, logs: false })
    expect(balanced(php)).toBe(true)
    expect(php).toContain('fastcgi_pass unix:/run/php/php8.3-fpm.sock;')
    expect(php).toContain('return 301 http://www.example.com$request_uri;')
    expect(php).toContain('index index.php index.html;')
    expect(php).not.toContain('gzip')
    expect(buildNginx({ www: 'to-www' })).not.toContain('live/www.')
    const stat = buildNginx({ type: 'static', http2: false })
    expect(stat).toContain('try_files $uri $uri/ =404;')
    expect(stat).toContain('listen 443 ssl;')
  })
})

describe('installCommands', () => {
  it('lists certbot, symlink and reload', () => {
    const c = installCommands({ domain: 'example.com' })
    expect(c).toContain('sudo certbot certonly --nginx -d example.com -d www.example.com')
    expect(c).toContain('sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/')
    expect(c).toContain('sudo nginx -t && sudo systemctl reload nginx')
    expect(installCommands({ https: false })).not.toContain('certbot')
  })
})
