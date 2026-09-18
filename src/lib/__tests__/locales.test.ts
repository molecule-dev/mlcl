import { describe, expect, it } from 'vitest'

import { generateLocaleArrayCode, SUPPORTED_LOCALES } from '../locales.js'

describe('locales', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('has no duplicate codes', () => {
      const codes = SUPPORTED_LOCALES.map((l) => l.code)
      expect(new Set(codes).size).toBe(codes.length)
    })

    it('has English as the first entry', () => {
      expect(SUPPORTED_LOCALES[0]).toEqual({ code: 'en', name: 'English', direction: 'ltr' })
    })

    it('every entry has non-empty code and name', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(locale.code.length).toBeGreaterThan(0)
        expect(locale.name.length).toBeGreaterThan(0)
      }
    })

    it('only uses ltr or rtl for direction', () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(['ltr', 'rtl']).toContain(locale.direction)
      }
    })

    it('marks known RTL locales correctly', () => {
      const rtlCodes = SUPPORTED_LOCALES.filter((l) => l.direction === 'rtl').map((l) => l.code)
      expect(rtlCodes).toEqual(expect.arrayContaining(['ar', 'fa', 'he', 'ur']))
      // No LTR locales accidentally marked RTL
      for (const locale of SUPPORTED_LOCALES) {
        if (['ar', 'fa', 'he', 'ur'].includes(locale.code)) {
          expect(locale.direction).toBe('rtl')
        }
      }
    })
  })

  describe('generateLocaleArrayCode', () => {
    it('returns one line per locale', () => {
      const code = generateLocaleArrayCode()
      const lines = code.split('\n')
      expect(lines.length).toBe(SUPPORTED_LOCALES.length)
    })

    it('uses translations: en for English (first line)', () => {
      const code = generateLocaleArrayCode()
      const firstLine = code.split('\n')[0]
      expect(firstLine).toContain('translations: en')
      expect(firstLine).not.toContain('loader:')
    })

    it('uses loader: lazyLocale for all non-English locales', () => {
      const code = generateLocaleArrayCode()
      const lines = code.split('\n').slice(1) // skip English
      for (const line of lines) {
        expect(line).toContain('loader: lazyLocale(')
        expect(line).not.toContain('translations:')
      }
    })

    it('includes code, name, and direction for each locale', () => {
      const code = generateLocaleArrayCode()
      for (const locale of SUPPORTED_LOCALES) {
        expect(code).toContain(`code: '${locale.code}'`)
        expect(code).toContain(`name: '${locale.name}'`)
        expect(code).toContain(`direction: '${locale.direction}' as const`)
      }
    })
  })
})
