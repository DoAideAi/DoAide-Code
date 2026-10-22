import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Markdown, parseBlocks, safeHref } from './markdown.jsx'

afterEach(cleanup)

const html = (text) => render(<div><Markdown text={text} /></div>).container

describe('parseBlocks', () => {
  it('splits headings, rules, quotes, lists and paragraphs', () => {
    const blocks = parseBlocks('## Plan\n\nFirst line\nsecond line\n\n- one\n- two\n  - nested\n\n3. three\n4. four\n\n> quoted\n> more\n\n---')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'rule'])
    expect(blocks[0]).toEqual({ type: 'heading', level: 2, text: 'Plan' })
    expect(blocks[1].text).toBe('First line\nsecond line')
    expect(blocks[2].items).toEqual([{ text: 'one', depth: 0 }, { text: 'two', depth: 0 }, { text: 'nested', depth: 1 }])
    expect(blocks[3]).toMatchObject({ ordered: true, start: 3 })
    expect(blocks[4].text).toBe('quoted\nmore')
  })

  it('a list item continues onto indented lines', () => {
    expect(parseBlocks('- first\n  still first\n- second')[0].items[0].text).toBe('first\nstill first')
  })
})

describe('Markdown', () => {
  it('renders bold, italic, strikethrough and inline code without the markup', () => {
    const el = html('Use **bold**, *italic*, _also italic_, ~~gone~~ and `code()`.')
    expect(el.querySelector('strong').textContent).toBe('bold')
    expect([...el.querySelectorAll('em')].map((e) => e.textContent)).toEqual(['italic', 'also italic'])
    expect(el.querySelector('s').textContent).toBe('gone')
    expect(el.querySelector('code').textContent).toBe('code()')
    expect(el.textContent).toBe('Use bold, italic, also italic, gone and code().')
  })

  it('leaves snake_case, maths and code contents alone', () => {
    const el = html('Set my_var_name to 2 * 3 * 4 with `a*b*c` and __init__ stays')
    expect(el.querySelector('em')).toBeNull()
    expect(el.querySelector('code').textContent).toBe('a*b*c')
    expect(el.textContent).toContain('my_var_name')
  })

  it('renders lists and headings as real elements', () => {
    const el = html('# Title\n\n1. one\n2. two\n\n- a\n- b')
    expect(el.querySelector('h3').textContent).toBe('Title')
    expect(el.querySelectorAll('ol li')).toHaveLength(2)
    expect(el.querySelectorAll('ul li')).toHaveLength(2)
  })

  it('links open in a new tab, bare URLs too, without trailing punctuation', () => {
    const el = html('See [the docs](https://example.com/docs) or https://example.com/a.')
    const links = el.querySelectorAll('a')
    expect(links[0].getAttribute('href')).toBe('https://example.com/docs')
    expect(links[0].textContent).toBe('the docs')
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
    expect(links[1].getAttribute('href')).toBe('https://example.com/a')
  })

  it('never links javascript: or data: URLs, and never renders HTML', () => {
    const el = html('[click](javascript:alert(1)) <img src=x onerror=alert(1)>')
    expect(el.querySelector('a')).toBeNull()
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('click')
    expect(safeHref('data:text/html,x')).toBeNull()
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c')
  })
})
