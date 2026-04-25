import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImportConfigDialog from './ImportConfigDialog'

function makeFile(content: string, name = 'config.json'): File {
  return new File([content], name, { type: 'application/json' })
}

const VALID_JSON = JSON.stringify({
  name: 'Imported',
  description: 'A neat one',
  columns: [
    { type: 'mapped', header: 'Title', field: 'title' },
    { type: 'constant', header: 'Marker', value: 'X' },
  ],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
})

describe('ImportConfigDialog', () => {
  it('does not render when closed', () => {
    render(<ImportConfigDialog open={false} onCancel={vi.fn()} onImport={vi.fn()} />)
    expect(screen.queryByText(/Import Config/i)).toBeNull()
  })

  it('shows error message for malformed JSON', async () => {
    render(<ImportConfigDialog open onCancel={vi.fn()} onImport={vi.fn()} />)
    const input = screen.getByLabelText(/Config file/i) as HTMLInputElement
    await userEvent.upload(input, makeFile('{not json'))
    await waitFor(() => expect(screen.getByText(/not valid JSON/i)).toBeTruthy())
  })

  it('shows error for valid JSON that fails validation', async () => {
    render(<ImportConfigDialog open onCancel={vi.fn()} onImport={vi.fn()} />)
    const input = screen.getByLabelText(/Config file/i) as HTMLInputElement
    await userEvent.upload(input, makeFile(JSON.stringify({ name: 'X' })))
    await waitFor(() => expect(screen.getByText(/columns/i)).toBeTruthy())
  })

  it('shows preview and lets the user rename before confirming', async () => {
    const onImport = vi.fn().mockReturnValue(null)
    render(<ImportConfigDialog open onCancel={vi.fn()} onImport={onImport} />)
    const input = screen.getByLabelText(/Config file/i) as HTMLInputElement
    await userEvent.upload(input, makeFile(VALID_JSON))
    await waitFor(() => expect(screen.getByDisplayValue('Imported')).toBeTruthy())
    expect(screen.getByText(/2 columns/)).toBeTruthy()

    const nameField = screen.getByLabelText(/^name$/i)
    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Renamed Config')

    await userEvent.click(screen.getByRole('button', { name: /^import$/i }))
    expect(onImport).toHaveBeenCalledWith({
      name: 'Renamed Config',
      description: 'A neat one',
      columns: [
        { type: 'mapped', header: 'Title', field: 'title' },
        { type: 'constant', header: 'Marker', value: 'X' },
      ],
    })
  })

  it('Cancel button calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<ImportConfigDialog open onCancel={onCancel} onImport={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Import button is disabled until a valid file is parsed', () => {
    render(<ImportConfigDialog open onCancel={vi.fn()} onImport={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^import$/i })).toBeDisabled()
  })
})
