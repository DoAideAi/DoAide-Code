import { describe, expect, it } from 'vitest'
import { formatSql, tokenizeSql, validateSql } from './sqlTool.js'

describe('tokenizeSql', () => {
  it('keeps strings, doubled-quote escapes and comments out of the code stream', () => {
    const tokens = tokenizeSql("select 'it''s' -- from here\nfrom t /* where */")
    const skips = tokens.filter((t) => t.type === 'skip').map((t) => t.text)
    expect(skips).toEqual(["'it''s'", '-- from here', '/* where */'])
  })
})

describe('formatSql', () => {
  it('uppercases keywords and puts each clause on its own line', () => {
    const out = formatSql("select id, name from users where active = true order by name limit 5;")
    expect(out).toBe('SELECT id,\n  name\nFROM users\nWHERE active = true\nORDER BY name\nLIMIT 5;\n')
  })

  it('indents subqueries and keeps commas inside parentheses together', () => {
    const out = formatSql("select count(a, b) from t where x in (select y from u)")
    expect(out).toContain('SELECT COUNT(a, b)')
    expect(out).toContain('(\n  SELECT y\n  FROM u)')
  })

  it('never touches string contents', () => {
    const out = formatSql("select 'select from where' as s from t")
    expect(out).toContain("'select from where'")
  })

  it('handles joins and multi-word clauses', () => {
    const out = formatSql('select * from a left join b on b.id = a.b_id group by a.id')
    expect(out).toContain('\nLEFT JOIN b')
    expect(out).toContain('\n  ON b.id = a.b_id')
    expect(out).toContain('\nGROUP BY a.id')
  })
})

describe('validateSql', () => {
  it('passes a clean query', () => {
    expect(validateSql('select id from users where active = true')).toEqual([])
  })

  it('asks for input first', () => {
    expect(validateSql('  ')[0].message).toMatch(/Paste/)
  })

  it('flags unbalanced parentheses both ways', () => {
    expect(validateSql('select (a from t').some((p) => /unclosed parenthesis/i.test(p.message))).toBe(true)
    expect(validateSql('select a) from t').some((p) => /no matching opening/i.test(p.message))).toBe(true)
  })

  it('flags unterminated strings and comments', () => {
    expect(validateSql("select 'oops from t")[0].message).toMatch(/Unterminated string/)
    expect(validateSql('select a /* oops')[0].message).toMatch(/Unclosed block comment/)
  })

  it('flags trailing commas and missing WHERE on destructive statements', () => {
    expect(validateSql('select a, from t')[0].message).toMatch(/Trailing comma/)
    expect(validateSql('delete from t')[0]).toMatchObject({ hint: 'warning' })
    expect(validateSql('update t set x = 1')[0].message).toMatch(/UPDATE without a WHERE/)
    expect(validateSql('delete from t where id = 1')).toEqual([])
  })

  it('does not read string contents as SQL', () => {
    expect(validateSql("insert into t (a) values ('delete from x')")).toEqual([])
  })
})
