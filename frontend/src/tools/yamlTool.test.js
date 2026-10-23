import { describe, expect, it } from 'vitest'
import { jsonErrorPos, jsonToYaml, yamlToJson } from './yamlTool.js'

describe('yamlToJson', () => {
  it('converts mappings, lists and YAML 1.2 scalars', () => {
    const { json } = yamlToJson('name: app\nports:\n  - 80\n  - "443"\nenabled: true\nmode: no\nnothing: ~\n')
    expect(JSON.parse(json)).toEqual({ name: 'app', ports: [80, '443'], enabled: true, mode: 'no', nothing: null })
  })
  it('resolves anchors, aliases and merge keys', () => {
    const { json } = yamlToJson('base: &b\n  image: node\n  restart: always\nweb:\n  <<: *b\n  restart: "no"\n')
    expect(JSON.parse(json).web).toEqual({ image: 'node', restart: 'no' })
  })
  it('turns several documents into an array', () => {
    const r = yamlToJson('kind: A\n---\nkind: B\n')
    expect(JSON.parse(r.json)).toEqual([{ kind: 'A' }, { kind: 'B' }])
    expect(r.documents).toBe(2)
  })
  it('reports the line of a syntax error', () => {
    const { error } = yamlToJson('a: 1\nb: [1, 2\nc: 3\n')
    expect(error.line).toBeGreaterThanOrEqual(2)
    expect(error.message).toBeTruthy()
    expect(yamlToJson('').json).toBe('')
  })
})

describe('jsonToYaml', () => {
  it('writes YAML with the chosen indent', () => {
    expect(jsonToYaml('{"a":{"b":[1,2]}}', { indent: 4 }).yaml).toBe('a:\n    b:\n        - 1\n        - 2\n')
  })
  it('splits an array into documents on request', () => {
    expect(jsonToYaml('[{"a":1},{"a":2}]', { multiDoc: true }).yaml).toBe('a: 1\n---\na: 2\n')
  })
  it('round-trips through yamlToJson', () => {
    const src = { s: 'multi\nline', n: 1.5, l: [true, null], q: 'yes' }
    expect(JSON.parse(yamlToJson(jsonToYaml(JSON.stringify(src)).yaml).json)).toEqual(src)
  })
  it('locates JSON errors', () => {
    expect(jsonToYaml('{"a":}').error.message).toBeTruthy()
    expect(jsonErrorPos('Unexpected token } in JSON at position 5', '{\n"a":}')).toEqual({ line: 2, col: 4 })
  })
})
