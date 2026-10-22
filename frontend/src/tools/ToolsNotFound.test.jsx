import { cleanup, render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import ToolsNotFound from './ToolsNotFound.jsx'
import ToolsRouter from './ToolsRouter.jsx'

afterEach(cleanup)

describe('ToolsNotFound', () => {
  it('names the problem and lists every tool', () => {
    render(<ToolsNotFound />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("That tool doesn't exist")
    expect(screen.getByRole('link', { name: /Diff checker/ }).getAttribute('href')).toBe('/tools/diff-checker')
    expect(screen.getByRole('link', { name: 'Review' }).getAttribute('href')).toBe('/tools/code-review')
    expect(document.title).toBe('Tool not found | DoAide Code')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })

  it('is what the router shows for an unknown slug, without touching real tools', async () => {
    render(
      <Suspense fallback={null}>
        <ToolsRouter path="/tools/not-a-real-tool" />
      </Suspense>,
    )
    expect((await screen.findByTestId('tools-not-found'))).toBeTruthy()
    cleanup()
    render(
      <Suspense fallback={null}>
        <ToolsRouter path="/tools/regex-tester" />
      </Suspense>,
    )
    expect((await screen.findByTestId('rx-pattern'))).toBeTruthy()
  })
})
