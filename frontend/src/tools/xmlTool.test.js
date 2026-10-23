import { describe, expect, it } from 'vitest'
import { formatXml, parseXml, xmlToJson } from './xmlTool.js'

const SRC = '<?xml version="1.0"?><!-- c --><catalog xmlns:x="urn:x"><book id="1"><title>A &amp; B</title><x:tag/></book><book id="2"><title><![CDATA[<raw>]]></title></book></catalog>'

describe('formatXml', () => {
  it('pretty-prints with comments, CDATA and namespaces kept', () => {
    expect(formatXml(SRC)).toBe(
      [
        '<?xml version="1.0"?>',
        '<!-- c -->',
        '<catalog xmlns:x="urn:x">',
        '  <book id="1">',
        '    <title>A &amp; B</title>',
        '    <x:tag/>',
        '  </book>',
        '  <book id="2">',
        '    <title><![CDATA[<raw>]]></title>',
        '  </book>',
        '</catalog>',
      ].join('\n'),
    )
  })
  it('indents with tabs and minifies, optionally dropping comments', () => {
    expect(formatXml('<a><b>1</b></a>', { indent: '\t' })).toBe('<a>\n\t<b>1</b>\n</a>')
    expect(formatXml('<a>\n  <!-- x -->\n  <b> 1 </b>\n</a>', { minify: true, keepComments: false })).toBe('<a><b>1</b></a>')
  })
})

describe('well-formedness errors', () => {
  const err = (s) => {
    try {
      parseXml(s)
    } catch (e) {
      return [e.message, e.line, e.col]
    }
    return null
  }
  it('reports mismatched and unclosed tags with positions', () => {
    expect(err('<a>\n  <b></c>\n</a>')).toEqual(['Expected </b> but found </c>', 2, 6])
    expect(err('<a><b></b>')[0]).toBe('<a> is never closed')
    expect(err('</a>')[0]).toMatch(/no matching opening tag/)
  })
  it('catches attribute, entity and root problems', () => {
    expect(err('<a x=1/>')[0]).toMatch(/must be quoted/)
    expect(err('<a x="1" x="2"/>')[0]).toMatch(/Duplicate attribute/)
    expect(err('<a>Tom & Jerry</a>')[0]).toMatch(/Bad entity/)
    expect(err('<a/><b/>')[0]).toMatch(/one root/)
    expect(err(' <?xml version="1.0"?><a/>')[0]).toMatch(/very first/)
    expect(err('hello')[0]).toMatch(/outside the root/)
    expect(err('')[0]).toBe('No root element')
    expect(err('<a>&#169; &custom;</a>')).toBeNull()
  })
})

describe('xmlToJson', () => {
  it('maps attributes, repeats, text and CDATA', () => {
    expect(JSON.parse(xmlToJson(SRC))).toEqual({
      catalog: {
        '@xmlns:x': 'urn:x',
        book: [
          { '@id': '1', title: 'A & B', 'x:tag': null },
          { '@id': '2', title: '<raw>' },
        ],
      },
    })
    expect(JSON.parse(xmlToJson('<p lang="en">Hi <b>there</b></p>'))).toEqual({ p: { '@lang': 'en', b: 'there', '#text': 'Hi' } })
  })
})
