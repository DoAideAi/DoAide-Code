import { describe, expect, it } from 'vitest'
import { checkPortString, distance, validateCompose } from './composeTool.js'

const texts = (r) => r.issues.map((i) => `${i.level}@${i.line}: ${i.text}`)

describe('checkPortString', () => {
  it('accepts the short syntax forms', () => {
    for (const s of ['80', '8080:80', '127.0.0.1:8080:80', '8000-8010:8000-8010', '53:53/udp', '[::1]:8080:80', ':80']) expect(checkPortString(s), s).toBeNull()
  })
  it('explains bad ports', () => {
    expect(checkPortString('70000:80')).toMatch(/host port/)
    expect(checkPortString('80:0')).toMatch(/container port/)
    expect(checkPortString('80/http')).toMatch(/protocol/)
    expect(checkPortString('a.b:80:80')).toMatch(/IP address/)
  })
})

describe('validateCompose', () => {
  it('passes a clean file', () => {
    const r = validateCompose(`services:
  web:
    image: nginx:1.27
    ports: ["8080:80"]
    depends_on:
      db:
        condition: service_healthy
    networks: [front]
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "pg_isready"]
    environment:
      POSTGRES_PASSWORD: example
networks:
  front:
volumes:
  pgdata:
`)
    expect(r.issues).toEqual([])
    expect(r.services).toEqual([
      { name: 'web', image: 'nginx:1.27', ports: ['8080:80'] },
      { name: 'db', image: 'postgres:16', ports: [] },
    ])
  })

  it('reports YAML syntax errors with a line', () => {
    const r = validateCompose('services:\n  web:\n    image: [x\n')
    expect(r.issues[0].level).toBe('error')
    expect(r.issues[0].line).toBeGreaterThanOrEqual(3)
  })

  it('catches structure mistakes with lines and suggestions', () => {
    const t = texts(
      validateCompose(`version: "3.8"
services:
  app:
    build: .
    enviroment:
      A: 1
    ports:
      - 22:22
      - 99999:80
    volumes:
      - data:/data
      - relative/path
    depends_on: [cache, app]
    networks: [back]
    restart: sometimes
  worker:
    image: busybox
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
`),
    )
    expect(t).toContain('warning@1: version is obsolete in the Compose Specification and ignored — remove it.')
    expect(t).toContain('error@5: app: unknown key “enviroment” — did you mean “environment”?')
    expect(t.some((x) => x.startsWith('warning@8') && x.includes('base-60'))).toBe(true)
    expect(t.some((x) => x.startsWith('error@9') && x.includes('host port'))).toBe(true)
    expect(t.some((x) => x.startsWith('error@11') && x.includes('“data” is not declared'))).toBe(true)
    expect(t.some((x) => x.startsWith('error@12') && x.includes('absolute path'))).toBe(true)
    expect(t.some((x) => x.includes('depends_on “cache”'))).toBe(true)
    expect(t.some((x) => x.includes('can’t depend on itself'))).toBe(true)
    expect(t.some((x) => x.includes('network “back”'))).toBe(true)
    expect(t.some((x) => x.startsWith('error@15') && x.includes('restart'))).toBe(true)
    expect(t.some((x) => x.includes('busybox') && x.startsWith('info'))).toBe(true)
    expect(t.some((x) => x.includes('privileged'))).toBe(true)
    expect(t.some((x) => x.includes('Docker socket'))).toBe(true)
  })

  it('finds depends_on cycles and missing image', () => {
    const t = texts(validateCompose('services:\n  a:\n    image: x:1\n    depends_on: [b]\n  b:\n    depends_on: [a]\n'))
    expect(t.some((x) => x.includes('cycle: a → b → a'))).toBe(true)
    expect(t.some((x) => x.includes('b: needs an image'))).toBe(true)
    expect(texts(validateCompose('foo: 1'))).toContain('error@1: No services: key — a compose file needs at least one service.')
  })
})

describe('distance', () => {
  it('measures edits', () => {
    expect(distance('enviroment', 'environment')).toBe(1)
  })
})
