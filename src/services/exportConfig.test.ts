import { describe, it, expect } from 'vitest'
import {
  validateConfig,
  isValidationError,
  parseImported,
  serializeForShare,
  isBookField,
  ALL_BOOK_FIELDS,
  DISHARI_CONFIG,
} from './exportConfig'
import type { ExportConfig } from '@/types'

function validInput() {
  return {
    name: 'My Library',
    description: 'For my custom system',
    columns: [
      { type: 'mapped', header: 'Title', field: 'title' },
      { type: 'constant', header: 'Branch', value: 'Main' },
    ],
  }
}

describe('isBookField', () => {
  it('accepts known fields', () => {
    expect(isBookField('title')).toBe(true)
    expect(isBookField('isbn')).toBe(true)
    expect(isBookField('summary')).toBe(true)
  })

  it('rejects R&D-only fields', () => {
    // R&D fields must NOT be exposed via Mapped columns
    expect(isBookField('id')).toBe(false)
    expect(isBookField('imageUrls')).toBe(false)
    expect(isBookField('rawAIOutput')).toBe(false)
    expect(isBookField('sessionId')).toBe(false)
  })

  it('rejects unknown values', () => {
    expect(isBookField('not-a-field')).toBe(false)
    expect(isBookField(42)).toBe(false)
    expect(isBookField(null)).toBe(false)
  })
})

describe('ALL_BOOK_FIELDS', () => {
  it('does not include R&D fields', () => {
    expect(ALL_BOOK_FIELDS).not.toContain('id')
    expect(ALL_BOOK_FIELDS).not.toContain('imageUrls')
    expect(ALL_BOOK_FIELDS).not.toContain('rawAIOutput')
  })
})

describe('validateConfig', () => {
  it('accepts a valid config', () => {
    const result = validateConfig(validInput())
    expect(isValidationError(result)).toBe(false)
    if (!isValidationError(result)) {
      expect(result.name).toBe('My Library')
      expect(result.columns).toHaveLength(2)
    }
  })

  it('trims the name', () => {
    const result = validateConfig({ ...validInput(), name: '  Padded  ' })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.name).toBe('Padded')
  })

  it('rejects non-object input', () => {
    expect(isValidationError(validateConfig(null))).toBe(true)
    expect(isValidationError(validateConfig('string'))).toBe(true)
    expect(isValidationError(validateConfig(42))).toBe(true)
  })

  it('rejects missing name', () => {
    const result = validateConfig({ columns: validInput().columns })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects empty name', () => {
    const result = validateConfig({ name: '   ', columns: validInput().columns })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects missing columns', () => {
    const result = validateConfig({ name: 'X' })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects empty columns array', () => {
    const result = validateConfig({ name: 'X', columns: [] })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects more than 200 columns', () => {
    const cols = Array.from({ length: 201 }, () => ({ type: 'constant', header: 'h', value: '' }))
    const result = validateConfig({ name: 'X', columns: cols })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects column with unknown type', () => {
    const result = validateConfig({
      name: 'X',
      columns: [{ type: 'computed', header: 'h', expr: '1+1' }],
    })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects column with empty header', () => {
    const result = validateConfig({
      name: 'X',
      columns: [{ type: 'constant', header: '', value: '' }],
    })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects header longer than 200 chars', () => {
    const result = validateConfig({
      name: 'X',
      columns: [{ type: 'constant', header: 'a'.repeat(201), value: '' }],
    })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects mapped column with unknown field', () => {
    const result = validateConfig({
      name: 'X',
      columns: [{ type: 'mapped', header: 'Bogus', field: 'not_a_field' }],
    })
    expect(isValidationError(result)).toBe(true)
  })

  it('rejects mapped column referencing R&D field', () => {
    for (const field of ['id', 'imageUrls', 'rawAIOutput']) {
      const result = validateConfig({
        name: 'X',
        columns: [{ type: 'mapped', header: 'H', field }],
      })
      expect(isValidationError(result)).toBe(true)
    }
  })

  it('coerces missing constant value to empty string', () => {
    const result = validateConfig({
      name: 'X',
      columns: [{ type: 'constant', header: 'H' }],
    })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.columns[0]).toEqual({ type: 'constant', header: 'H', value: '' })
  })

  it('preserves a provided id', () => {
    const result = validateConfig({ ...validInput(), id: 'fixed-id' })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.id).toBe('fixed-id')
  })

  it('derives id from name when missing', () => {
    const result = validateConfig({ ...validInput(), name: 'My Cool Library' })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.id).toBe('my-cool-library')
  })

  it('preserves builtIn=true when present', () => {
    const result = validateConfig({ ...validInput(), builtIn: true })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.builtIn).toBe(true)
  })

  it('omits description when empty/missing', () => {
    const result = validateConfig({ ...validInput(), description: '' })
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.description).toBeUndefined()
  })
})

describe('parseImported', () => {
  it('parses a valid JSON string', () => {
    const json = JSON.stringify(validInput())
    const result = parseImported(json)
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.name).toBe('My Library')
  })

  it('rejects malformed JSON', () => {
    const result = parseImported('{ not: valid')
    expect(isValidationError(result)).toBe(true)
  })

  it('strips builtIn from imported configs', () => {
    const json = JSON.stringify({ ...validInput(), builtIn: true })
    const result = parseImported(json)
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.builtIn).toBeUndefined()
  })

  it('round trips via serializeForShare', () => {
    const original: ExportConfig = {
      id: 'src-id',
      name: 'Round Trip',
      description: 'Tests round-tripping',
      columns: [
        { type: 'mapped', header: 'Title', field: 'title' },
        { type: 'constant', header: 'X', value: 'fixed' },
      ],
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    }
    const json = serializeForShare(original)
    const result = parseImported(json)
    if (isValidationError(result)) throw new Error(result.error)
    expect(result.name).toBe(original.name)
    expect(result.description).toBe(original.description)
    expect(result.columns).toEqual(original.columns)
    // id is regenerated from name (serialize stripped it)
    expect(result.id).toBe('round-trip')
    expect(result.builtIn).toBeUndefined()
  })
})

describe('serializeForShare', () => {
  it('omits id and builtIn', () => {
    const config: ExportConfig = {
      ...DISHARI_CONFIG,
      id: 'dishari',
    }
    const json = serializeForShare(config)
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.id).toBeUndefined()
    expect(parsed.builtIn).toBeUndefined()
    expect(parsed.name).toBe('Dishari')
    expect(Array.isArray(parsed.columns)).toBe(true)
  })
})

describe('DISHARI_CONFIG (bundled built-in)', () => {
  it('loads with id "dishari" and builtIn: true', () => {
    expect(DISHARI_CONFIG.id).toBe('dishari')
    expect(DISHARI_CONFIG.name).toBe('Dishari')
    expect(DISHARI_CONFIG.builtIn).toBe(true)
  })

  it('has 40 columns (matching the legacy hard-coded HEADERS list)', () => {
    expect(DISHARI_CONFIG.columns).toHaveLength(40)
  })
})
