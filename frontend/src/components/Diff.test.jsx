import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Diff } from './MessageList.jsx'

afterEach(cleanup)

describe('Diff', () => {
  it('shows line numbers, marks and highlighted code for the file type', () => {
    render(<Diff path="src/app.py" text={'@@ -1,2 +1,2 @@\n-def old():\n+def new():\n     return 1\n'} />)
    const rows = [...screen.getByTestId('diff').querySelectorAll('tr')]
    expect(rows.map((r) => r.dataset.kind)).toEqual(['hunk', 'del', 'add', 'ctx'])
    const cells = (r) => [...r.querySelectorAll('td')].map((td) => td.textContent)
    expect(cells(rows[1])).toEqual(['1', '', '-', 'def old():'])
    expect(cells(rows[2])).toEqual(['', '1', '+', 'def new():'])
    expect(cells(rows[3])).toEqual(['2', '2', ' ', '    return 1'])
    // Python keywords are coloured inside changed lines.
    expect(rows[2].querySelector('span.text-violet-300').textContent).toBe('def')
  })
})
