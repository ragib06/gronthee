import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateSessionDialog from './CreateSessionDialog'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { ExportConfig } from '@/types'

function makeConfig(id: string, name: string): ExportConfig {
  return {
    id,
    name,
    columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

const configs: ExportConfig[] = [DISHARI_CONFIG, makeConfig('library-v2', 'Library v2')]

describe('CreateSessionDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <CreateSessionDialog
        open={false}
        configs={configs}
        onCancel={() => {}}
        onCreate={() => null}
      />
    )
    expect(screen.queryByText('New Session')).toBeNull()
  })

  it('shows config dropdown defaulting to Dishari', () => {
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={() => {}}
        onCreate={() => null}
      />
    )
    const select = screen.getByLabelText(/export config/i) as HTMLSelectElement
    expect(select.value).toBe('dishari')
  })

  it('Create button is disabled until a name is entered', async () => {
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={() => {}}
        onCreate={() => null}
      />
    )
    const createBtn = screen.getByRole('button', { name: /^create$/i })
    expect(createBtn).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Sci-Fi')
    expect(createBtn).not.toBeDisabled()
  })

  it('clicking Create calls onCreate with name and configId', async () => {
    const onCreate = vi.fn().mockReturnValue(null)
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={() => {}}
        onCreate={onCreate}
      />
    )
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Sci-Fi')
    await userEvent.selectOptions(screen.getByLabelText(/export config/i), 'library-v2')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(onCreate).toHaveBeenCalledWith('Sci-Fi', 'library-v2')
  })

  it('pressing Enter in the name input submits', async () => {
    const onCreate = vi.fn().mockReturnValue(null)
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={() => {}}
        onCreate={onCreate}
      />
    )
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Poetry{Enter}')
    expect(onCreate).toHaveBeenCalledWith('Poetry', 'dishari')
  })

  it('shows the error returned by onCreate (e.g. duplicate name)', async () => {
    const onCreate = vi.fn().mockReturnValue('Name already taken.')
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={() => {}}
        onCreate={onCreate}
      />
    )
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Default')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(screen.getByText(/name already taken/i)).toBeTruthy()
  })

  it('Cancel calls onCancel', async () => {
    const onCancel = vi.fn()
    render(
      <CreateSessionDialog
        open={true}
        configs={configs}
        onCancel={onCancel}
        onCreate={() => null}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
