import { describe, expect, it } from 'vitest'
import { FORMAT_LANGUAGES, detectFormatLanguage, formatCode } from './format.js'

describe('formatCode JSON', () => {
  it('pretty-prints valid JSON', () => {
    expect(formatCode('JSON', '{"a":[1,2]}')).toEqual({ ok: true, out: '{\n  "a": [\n    1,\n    2\n  ]\n}\n' })
  })

  it('honors 4-space indentation', () => {
    expect(formatCode('JSON', '{"a":1}', { indent: 4 }).out).toBe('{\n    "a": 1\n}\n')
  })

  it('reports invalid JSON', () => {
    const result = formatCode('JSON', '{"a":}')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not valid JSON/)
  })
})

describe('formatCode JavaScript', () => {
  it('splits braces and semicolons and re-indents', () => {
    const out = formatCode('JavaScript', 'function f(x){if(x){return 1;}else{return 2;}}').out
    expect(out).toBe('function f(x){\n  if(x){\n    return 1;\n  }else{\n    return 2;\n  }\n}\n')
  })

  it('leaves for-loop semicolons alone', () => {
    const out = formatCode('JavaScript', 'for(let i=0;i<3;i++){go(i);}').out
    expect(out).toBe('for(let i=0;i<3;i++){\n  go(i);\n}\n')
  })

  it('never touches strings or comments', () => {
    const code = 'const s = "a;{b}";\n// keep; {this}\ncall(s);'
    const out = formatCode('JavaScript', code).out
    expect(out).toContain('"a;{b}"')
    expect(out).toContain('// keep; {this}')
  })

  it('keeps existing line breaks inside brackets', () => {
    const out = formatCode('JavaScript', 'const xs = [\n1,\n2,\n]').out
    expect(out).toBe('const xs = [\n  1,\n  2,\n]\n')
  })
})

describe('formatCode CSS', () => {
  it('one declaration per line, nested blocks indented', () => {
    const out = formatCode('CSS', '@media screen{a{color:red;margin:0}}').out
    expect(out).toBe('@media screen {\n  a {\n    color:red;\n    margin:0\n  }\n}\n')
  })
})

describe('formatCode HTML', () => {
  it('nests tags and leaves raw content alone', () => {
    const out = formatCode('HTML', '<div><p>Hi <b>there</b></p><script>if(x){y()}</script></div>').out
    expect(out).toBe('<div>\n  <p>\n    Hi\n    <b>\n      there\n    </b>\n  </p>\n  <script>\nif(x){y()}\n  </script>\n</div>\n')
  })

  it('does not indent after void elements', () => {
    const out = formatCode('HTML', '<div><br><span>x</span></div>').out
    expect(out).toBe('<div>\n  <br>\n  <span>\n    x\n  </span>\n</div>\n')
  })
})

describe('formatCode Python', () => {
  it('only cleans up, with a note', () => {
    const result = formatCode('Python', 'def f():\n\treturn 1   \n\n\n\nx = f()')
    expect(result.out).toBe('def f():\n    return 1\n\nx = f()\n')
    expect(result.note).toMatch(/safe clean-ups/)
  })
})

describe('formatCode misc', () => {
  it('asks for code when the paste is blank', () => {
    expect(formatCode('JSON', '   ').ok).toBe(false)
  })
})

describe('detectFormatLanguage', () => {
  it('spots each language', () => {
    expect(detectFormatLanguage('{"a": 1}')).toBe('JSON')
    expect(detectFormatLanguage('<!doctype html><p>x</p>')).toBe('HTML')
    expect(detectFormatLanguage('def f():\n    return 1')).toBe('Python')
    expect(detectFormatLanguage('.btn { color: red; }')).toBe('CSS')
    expect(detectFormatLanguage('const x = 1')).toBe('JavaScript')
    expect(FORMAT_LANGUAGES).toContain(detectFormatLanguage('anything else'))
  })
})
