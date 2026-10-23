import { describe, expect, it } from 'vitest'
import { csvCell, detectDelimiter, inferValue, jsonToCsv, parseCsv, table, toJson, toKeyedJson, toSql, uniqueHeaders } from './csvTool.js'

describe('parseCsv', () => {
  it('handles quotes, embedded delimiters, newlines and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n"multi\nline",2\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['multi\nline', '2'],
    ])
  })
  it('keeps empty fields and skips blank lines and a BOM', () => {
    expect(parseCsv('﻿a,,c\n\n1,2,')).toEqual([
      ['a', '', 'c'],
      ['1', '2', ''],
    ])
  })
})

describe('detectDelimiter', () => {
  it('picks the consistent separator', () => {
    expect(detectDelimiter('a;b;c\n1;2,5;3')).toBe(';')
    expect(detectDelimiter('a\tb\n1\t2')).toBe('\t')
    expect(detectDelimiter('a|b\n1|2')).toBe('|')
    expect(detectDelimiter('"x,y";b\n1;2')).toBe(';')
    expect(detectDelimiter('single')).toBe(',')
  })
})

describe('typing and headers', () => {
  it('infers numbers, booleans and nulls but keeps codes', () => {
    expect([inferValue('42'), inferValue('-1.5'), inferValue('TRUE'), inferValue(''), inferValue('007'), inferValue('12345678901234567890')]).toEqual([
      42, -1.5, true, null, '007', '12345678901234567890',
    ])
  })
  it('dedupes and fills header names', () => {
    expect(uniqueHeaders(['id', '', 'id'])).toEqual(['id', 'column_2', 'id_2'])
  })
})

describe('writers', () => {
  const t = table(parseCsv('id,name,active\n1,Ann,true\n2,"O\'Neil",false'))
  it('writes JSON objects, arrays and keyed JSON', () => {
    expect(JSON.parse(toJson(t))).toEqual([
      { id: 1, name: 'Ann', active: true },
      { id: 2, name: "O'Neil", active: false },
    ])
    const raw = table(parseCsv('1,2'), { header: false })
    expect(JSON.parse(toJson(raw, { header: false }))).toEqual([[1, 2]])
    expect(JSON.parse(toKeyedJson(t, 'name'))).toEqual({ Ann: { id: 1, active: true }, "O'Neil": { id: 2, active: false } })
  })
  it('writes SQL with inferred types and escaped strings', () => {
    const sql = toSql(t, { tableName: 'User List' })
    expect(sql).toContain('CREATE TABLE User_List (\n  id INTEGER,\n  name TEXT,\n  active BOOLEAN\n);')
    expect(sql).toContain("(2, 'O''Neil', FALSE)")
    expect(toSql(t, { create: false, batch: 1 }).match(/INSERT/g)).toHaveLength(2)
  })
  it('converts JSON back to CSV with quoting', () => {
    expect(jsonToCsv('[{"a":1,"b":"x,y"},{"a":2,"c":{"n":1}}]')).toBe('a,b,c\n1,"x,y",\n2,,"{""n"":1}"')
    expect(jsonToCsv('[[1,"a\\nb"]]')).toBe('1,"a\nb"')
    expect(csvCell(' pad ')).toBe('" pad "')
    expect(() => jsonToCsv('[1,2]')).toThrow()
  })
})
