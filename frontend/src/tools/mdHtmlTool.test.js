import { describe, expect, it } from 'vitest'
import { inlineHtml, markdownToHtml } from './mdHtmlTool.js'

describe('inlineHtml', () => {
  it('converts bold, italic, strike and code', () => {
    expect(inlineHtml('**b** *i* ~~s~~ `c`')).toBe('<strong>b</strong> <em>i</em> <del>s</del> <code>c</code>')
  })
  it('leaves markdown inside code literal', () => {
    expect(inlineHtml('`**not bold**`')).toBe('<code>**not bold**</code>')
  })
  it('builds links and images with safe URLs only', () => {
    expect(inlineHtml('[x](https://a.b)')).toBe('<a href="https://a.b">x</a>')
    expect(inlineHtml('[x](javascript:alert(1))')).toBe('x')
    expect(inlineHtml('![alt](https://a.b/i.png)')).toBe('<img src="https://a.b/i.png" alt="alt" />')
  })
  it('escapes raw HTML', () => {
    expect(inlineHtml('<script>')).toBe('&lt;script&gt;')
  })
})

describe('markdownToHtml', () => {
  it('converts headings and paragraphs', () => {
    expect(markdownToHtml('## Title\n\nBody text')).toBe('<h2>Title</h2>\n<p>Body text</p>')
  })
  it('converts bullet and numbered lists', () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(markdownToHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>')
  })
  it('converts fenced code with the language and escapes it', () => {
    expect(markdownToHtml('```js\nif (a < b) {}\n```')).toBe('<pre><code class="language-js">if (a &lt; b) {}</code></pre>')
  })
  it('converts quotes with nested markdown', () => {
    expect(markdownToHtml('> **note**')).toBe('<blockquote><p><strong>note</strong></p></blockquote>')
  })
  it('converts tables', () => {
    expect(markdownToHtml('| a | b |\n| - | - |\n| 1 | 2 |')).toBe(
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    )
  })
  it('converts rules', () => {
    expect(markdownToHtml('---')).toBe('<hr />')
  })
})
