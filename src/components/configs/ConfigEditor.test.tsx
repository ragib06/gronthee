import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigEditor from './ConfigEditor'
import type { ExportConfig } from '@/types'

function makeConfig(): ExportConfig {
  return {
    id: 'custom',
    name: 'Custom',
    columns: [
      { type: 'mapped', header: 'Title', field: 'title' },
      { type: 'constant', header: 'Marker', value: 'X' },
    ],
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  }
}

describe('ConfigEditor — create mode', () => {
  it('renders with one empty mapped column scaffold', () => {
    render(
      <ConfigEditor
        mode="create"
        existingNames={[]}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/^new config$/i)).toBeTruthy()
    expect(screen.getByLabelText(/^name$/i)).toBeTruthy()
    expect(screen.getByText('1 column')).toBeTruthy()
  })

  it('rejects save when name is empty', async () => {
    const onSave = vi.fn()
    render(<ConfigEditor mode="create" existingNames={[]} onCancel={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/Name is required/i)).toBeTruthy()
  })

  it('rejects save when name collides with an existing config', async () => {
    const onSave = vi.fn()
    render(<ConfigEditor mode="create" existingNames={['Dishari']} onCancel={vi.fn()} onSave={onSave} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'dishari')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/already exists/i)).toBeTruthy()
  })

  it('rejects save when a column has an empty header', async () => {
    const onSave = vi.fn()
    render(<ConfigEditor mode="create" existingNames={[]} onCancel={vi.fn()} onSave={onSave} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'My Config')
    const headerInput = screen.getByLabelText(/Column 1 header/i)
    await userEvent.clear(headerInput)
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/Column 1: header is required/i)).toBeTruthy()
  })

  it('switching a row from Mapped to Constant clears the field state', async () => {
    const onSave = vi.fn().mockReturnValue(null)
    render(<ConfigEditor mode="create" existingNames={[]} onCancel={vi.fn()} onSave={onSave} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'My Config')
    const typeSelect = screen.getByLabelText(/Column 1 type/i) as HTMLSelectElement
    await userEvent.selectOptions(typeSelect, 'constant')
    const valueInput = screen.getByLabelText(/Column 1 value/i) as HTMLInputElement
    expect(valueInput.value).toBe('')
    await userEvent.type(valueInput, 'literal')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'My Config',
      description: undefined,
      columns: [{ type: 'constant', header: 'Title', value: 'literal' }],
    })
  })

  it('Add column appends a new row', async () => {
    render(<ConfigEditor mode="create" existingNames={[]} onCancel={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('1 column')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /add column/i }))
    expect(screen.getByText('2 columns')).toBeTruthy()
  })

  it('Move down button reorders rows', async () => {
    const onSave = vi.fn().mockReturnValue(null)
    render(<ConfigEditor mode="edit" initial={makeConfig()} existingNames={[]} onCancel={vi.fn()} onSave={onSave} />)
    // Initial order: Title (col 1), Marker (col 2)
    await userEvent.click(screen.getByLabelText(/Move column 1 down/i))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Custom',
      description: undefined,
      columns: [
        { type: 'constant', header: 'Marker', value: 'X' },
        { type: 'mapped', header: 'Title', field: 'title' },
      ],
    })
  })
})

describe('ConfigEditor — edit mode', () => {
  it('loads name, description, and columns from initial', () => {
    const initial: ExportConfig = { ...makeConfig(), description: 'Hello' }
    render(<ConfigEditor mode="edit" initial={initial} existingNames={[]} onCancel={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByDisplayValue('Custom')).toBeTruthy()
    expect(screen.getByDisplayValue('Hello')).toBeTruthy()
    expect(screen.getByDisplayValue('Title')).toBeTruthy()
    expect(screen.getByDisplayValue('Marker')).toBeTruthy()
  })

  it('Cancel button calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<ConfigEditor mode="edit" initial={makeConfig()} existingNames={[]} onCancel={onCancel} onSave={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Save calls onSave with the edited config', async () => {
    const onSave = vi.fn().mockReturnValue(null)
    render(<ConfigEditor mode="edit" initial={makeConfig()} existingNames={[]} onCancel={vi.fn()} onSave={onSave} />)
    const nameInput = screen.getByLabelText(/^name$/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith({
      name: 'Renamed',
      description: undefined,
      columns: [
        { type: 'mapped', header: 'Title', field: 'title' },
        { type: 'constant', header: 'Marker', value: 'X' },
      ],
    })
  })
})
