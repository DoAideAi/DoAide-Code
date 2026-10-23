import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConversationSidebar from './ConversationSidebar.jsx'

afterEach(cleanup)

const sessions = [
  { id: 'a1', title: 'First chat', created_at: Date.now() / 1000, updated_at: Date.now() / 1000 },
  { id: 'b2', title: 'Second chat', created_at: Date.now() / 1000 - 86400, updated_at: Date.now() / 1000 - 86400 },
]

describe('ConversationSidebar', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={false} onClose={() => {}} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows conversation list when open', () => {
    render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} />,
    )
    expect(screen.getByTestId('conversation-sidebar')).toBeTruthy()
    expect(screen.getByText('First chat')).toBeTruthy()
    expect(screen.getByText('Second chat')).toBeTruthy()
  })

  it('highlights the active session', () => {
    render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} />,
    )
    const active = screen.getByTestId('conv-a1')
    expect(active.className).toContain('bg-sky-600/20')
  })

  it('calls onSelect when a session is clicked', () => {
    const onSelect = vi.fn()
    render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={onSelect} onNewChat={() => {}} open={true} onClose={() => {}} />,
    )
    fireEvent.click(screen.getByTestId('conv-b2'))
    expect(onSelect).toHaveBeenCalledWith('b2')
  })

  it('calls onNewChat when the new chat button is clicked', () => {
    const onNewChat = vi.fn()
    render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={onNewChat} open={true} onClose={() => {}} />,
    )
    fireEvent.click(screen.getByTestId('new-chat-sidebar'))
    expect(onNewChat).toHaveBeenCalledOnce()
  })

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn()
    render(
      <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={onClose} />,
    )
    fireEvent.click(screen.getByTestId('sidebar-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows loading state', () => {
    render(
      <ConversationSidebar sessions={[]} activeSessionId="" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} loading={true} />,
    )
    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('shows empty state when no sessions', () => {
    render(
      <ConversationSidebar sessions={[]} activeSessionId="" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} loading={false} />,
    )
    expect(screen.getByText('No conversations yet')).toBeTruthy()
  })

  it('shows "New conversation" for sessions without a title', () => {
    const untitled = [{ id: 'c3', title: null, created_at: Date.now() / 1000, updated_at: Date.now() / 1000 }]
    render(
      <ConversationSidebar sessions={untitled} activeSessionId="" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} />,
    )
    expect(screen.getByText('New conversation')).toBeTruthy()
  })

  describe('deleting a conversation', () => {
    const open = (onDelete, onSelect = () => {}) =>
      render(
        <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={onSelect} onNewChat={() => {}} open={true} onClose={() => {}} onDelete={onDelete} />,
      )

    it('has no delete button without onDelete', () => {
      render(
        <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={() => {}} />,
      )
      expect(screen.queryByTestId('delete-conv-b2')).toBeNull()
    })

    it('asks first, and cancelling deletes nothing', () => {
      const onDelete = vi.fn()
      const onSelect = vi.fn()
      open(onDelete, onSelect)
      fireEvent.click(screen.getByTestId('delete-conv-b2'))
      expect(onSelect).not.toHaveBeenCalled()
      expect(screen.getByRole('alertdialog').textContent).toContain('Second chat')
      fireEvent.click(screen.getByTestId('delete-conv-cancel'))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('Escape closes the confirmation, not the sidebar', () => {
      const onClose = vi.fn()
      render(
        <ConversationSidebar sessions={sessions} activeSessionId="a1" onSelect={() => {}} onNewChat={() => {}} open={true} onClose={onClose} onDelete={vi.fn()} />,
      )
      fireEvent.click(screen.getByTestId('delete-conv-b2'))
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('deletes on confirm and closes the dialog', async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined)
      open(onDelete)
      fireEvent.click(screen.getByTestId('delete-conv-b2'))
      fireEvent.click(screen.getByTestId('delete-conv-confirm'))
      expect(onDelete).toHaveBeenCalledWith('b2')
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    })

    it('keeps the dialog open with the error when deleting fails', async () => {
      const onDelete = vi.fn().mockRejectedValue(new Error('A reply is still running in this conversation; stop it first'))
      open(onDelete)
      fireEvent.click(screen.getByTestId('delete-conv-a1'))
      fireEvent.click(screen.getByTestId('delete-conv-confirm'))
      expect((await screen.findByTestId('delete-conv-error')).textContent).toContain('stop it first')
      expect(screen.getByRole('alertdialog')).toBeTruthy()
    })
  })
})
