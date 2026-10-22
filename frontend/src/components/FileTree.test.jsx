import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConversationSidebar from './ConversationSidebar.jsx'
import FileTree from './FileTree.jsx'
import FileViewer, { langFor } from './FileViewer.jsx'

afterEach(cleanup)

const TREE = {
  '': [
    { name: 'src', path: 'src', type: 'dir' },
    { name: 'README.md', path: 'README.md', type: 'file', size: 10 },
  ],
  src: [{ name: 'app.py', path: 'src/app.py', type: 'file', size: 20 }],
}
const loader = () => vi.fn(async (path) => ({ entries: TREE[path], root: 'demo' }))

describe('FileTree', () => {
  it('lists the root, and loads a folder only when it opens', async () => {
    const load = loader()
    render(<FileTree load={load} onOpen={() => {}} />)
    await screen.findByText('README.md')
    expect(screen.getByText('demo')).toBeTruthy()
    expect(screen.queryByText('app.py')).toBeNull()
    expect(load).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('file-src'))
    await screen.findByText('app.py')
    expect(load).toHaveBeenCalledWith('src')
    expect(screen.getByTestId('file-src').getAttribute('aria-expanded')).toBe('true')

    // Closing and reopening uses what was loaded.
    fireEvent.click(screen.getByTestId('file-src'))
    expect(screen.queryByText('app.py')).toBeNull()
    fireEvent.click(screen.getByTestId('file-src'))
    expect(screen.getByText('app.py')).toBeTruthy()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('opens a file and highlights the open one', async () => {
    const onOpen = vi.fn()
    render(<FileTree load={loader()} onOpen={onOpen} activePath="README.md" />)
    fireEvent.click(await screen.findByTestId('file-README.md'))
    expect(onOpen).toHaveBeenCalledWith('README.md')
    expect(screen.getByTestId('file-README.md').className).toContain('bg-sky-600/20')
  })

  it('shows why the files could not be listed', async () => {
    const load = vi.fn(async () => {
      throw new Error('Your laptop is offline')
    })
    render(<FileTree load={load} onOpen={() => {}} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Your laptop is offline')
  })

  it('starts over when the project changes', async () => {
    const load = loader()
    const { rerender } = render(<FileTree load={load} onOpen={() => {}} reloadKey="a" />)
    await screen.findByText('README.md')
    rerender(<FileTree load={load} onOpen={() => {}} reloadKey="b" />)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })
})

describe('FileViewer', () => {
  it('shows the file highlighted', async () => {
    const load = vi.fn(async () => ({ content: 'def f():\n    return 1\n', size: 22, binary: false, truncated: false }))
    render(<FileViewer path="src/app.py" load={load} onClose={() => {}} />)
    const code = await screen.findByText((_, el) => el.tagName === 'CODE')
    expect(code.dataset.lang).toBe('py')
    expect(code.textContent).toContain('return 1')
    expect(load).toHaveBeenCalledWith('src/app.py')
  })

  it('says when a file is binary', async () => {
    const load = vi.fn(async () => ({ content: '', size: 5, binary: true, truncated: false }))
    render(<FileViewer path="logo.png" load={load} onClose={() => {}} />)
    expect(await screen.findByText('Binary file, not shown')).toBeTruthy()
  })

  it('names the language from the file name', () => {
    expect(langFor('a/b.tsx')).toBe('tsx')
    expect(langFor('config.yml')).toBe('yaml')
    expect(langFor('Dockerfile')).toBe('dockerfile')
    expect(langFor('LICENSE')).toBe('')
  })
})

describe('ConversationSidebar files tab', () => {
  const props = { sessions: [], activeSessionId: null, onSelect: () => {}, onNewChat: () => {}, open: true, onClose: () => {} }

  it('has no tabs without a file loader', () => {
    render(<ConversationSidebar {...props} />)
    expect(screen.queryByTestId('sidebar-tab-files')).toBeNull()
  })

  it('switches between chats and files', async () => {
    render(<ConversationSidebar {...props} loadFiles={loader()} onOpenFile={() => {}} />)
    expect(screen.getByText('No conversations yet')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sidebar-tab-files'))
    expect(await screen.findByText('README.md')).toBeTruthy()
    expect(screen.queryByText('No conversations yet')).toBeNull()
  })
})
