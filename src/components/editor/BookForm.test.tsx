import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookForm from './BookForm'
import type { BookMetadata } from '@/types'

// Minimal set of valid field values that passes all required-field validation
const VALID_VALUES: Partial<BookMetadata> = {
  title: 'Test Book',
  author: 'Test Author',
  publisher: 'Test Publisher',
  publishedYear: '2024',
  isbn: '9780000000000',
  category: 'Fiction',
  genre: 'Novel',
  collection: 'FIC',
  itemType: 'BK',
  pageCount: '200',
  language: 'EN',
  edition: '1st',
  publicationPlace: 'Dhaka',
  summary: 'A brief summary.',
}

function renderForm(overrides: Partial<Parameters<typeof BookForm>[0]> = {}) {
  return render(
    <BookForm
      initialValues={VALID_VALUES}
      scanDate="2026-01-01"
      onSave={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  )
}

describe('BookForm — isSaving prop', () => {
  it('shows "Save Book" label when not saving', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /save book/i })).toBeTruthy()
  })

  it('shows "Uploading…" label when isSaving is true', () => {
    renderForm({ isSaving: true })
    expect(screen.getByRole('button', { name: /uploading/i })).toBeTruthy()
  })

  it('Save button is disabled when isSaving is true', () => {
    renderForm({ isSaving: true })
    const saveBtn = screen.getByRole('button', { name: /uploading/i })
    expect(saveBtn).toBeDisabled()
  })

  it('Save button is not disabled by default', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /save book/i })).not.toBeDisabled()
  })

  it('Cancel button is disabled when isSaving is true', () => {
    renderForm({ isSaving: true })
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('Cancel button is enabled when not saving', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled()
  })

  it('clicking Save when not saving calls onSave', async () => {
    const onSave = vi.fn()
    renderForm({ onSave })
    await userEvent.click(screen.getByRole('button', { name: /save book/i }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('clicking Cancel when not saving calls onCancel', async () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('BookForm — sessionName prop', () => {
  it('shows active session label when sessionName is provided', () => {
    renderForm({ sessionName: 'My Shelf' })
    expect(screen.getByText('Active session:')).toBeTruthy()
    expect(screen.getByText('My Shelf')).toBeTruthy()
  })

  it('does not show session label when sessionName is not provided', () => {
    renderForm()
    expect(screen.queryByText('Active session:')).toBeNull()
  })
})
