import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteSessionDialog from './DeleteSessionDialog'
import type { Session } from '@/types'

function makeSession(id = 'sci-fi', name = 'Sci-Fi'): Session {
  return { id, name, createdAt: new Date().toISOString() }
}

describe('DeleteSessionDialog', () => {
  it('does not render when session is null', () => {
    render(<DeleteSessionDialog session={null} bookCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText(/Delete session/)).toBeNull()
  })

  it('shows session name in heading', () => {
    render(<DeleteSessionDialog session={makeSession()} bookCount={3} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/Delete session.*Sci-Fi/)).toBeTruthy()
  })

  it('shows correct book count text for many books', () => {
    render(<DeleteSessionDialog session={makeSession()} bookCount={5} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/5 books.*moved to Default/)).toBeTruthy()
  })

  it('shows singular for 1 book', () => {
    render(<DeleteSessionDialog session={makeSession()} bookCount={1} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/1 book.*moved to Default/)).toBeTruthy()
  })

  it('shows "no books" message for 0 books', () => {
    render(<DeleteSessionDialog session={makeSession()} bookCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/no books/i)).toBeTruthy()
  })

  it('calls onConfirm when Delete is clicked', async () => {
    const onConfirm = vi.fn()
    render(<DeleteSessionDialog session={makeSession()} bookCount={2} onConfirm={onConfirm} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(<DeleteSessionDialog session={makeSession()} bookCount={2} onConfirm={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape key', async () => {
    const onCancel = vi.fn()
    render(<DeleteSessionDialog session={makeSession()} bookCount={0} onConfirm={vi.fn()} onCancel={onCancel} />)
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
