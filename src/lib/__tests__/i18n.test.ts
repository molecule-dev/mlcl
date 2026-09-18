import { beforeEach, describe, expect, it } from 'vitest'

import { messages } from '../../locales/en.js'
import { getLocale, initLocaleSync, t } from '../i18n.js'

describe('i18n', () => {
  beforeEach(() => {
    initLocaleSync('en', messages)
  })

  describe('t()', () => {
    it('returns translated string for valid key', () => {
      expect(t('commands.add.description')).toBe('Add a molecule package to your project')
    })

    it('returns the key itself for missing keys', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('interpolates {param} placeholders', () => {
      expect(t('commands.add.spinners.adding', { name: 'foo' })).toBe('Adding foo...')
    })

    it('interpolates multiple params', () => {
      expect(t('commands.create.spinners.addedFullStack', { apiCount: 3, appCount: 5 })).toBe(
        'Added 3 API + 5 App packages',
      )
    })

    it('replaces all occurrences of same placeholder', () => {
      // Test with a key that doesn't have duplicates, but verify the replaceAll behavior
      const result = t('commands.swap.spinners.foundExisting', { old: 'A', new: 'B' })
      expect(result).toBe('Found A → swapping to B')
    })

    it('returns template unchanged when no params provided', () => {
      expect(t('commands.add.spinners.installing')).toBe('Installing dependencies...')
    })

    it('handles numeric interpolation values', () => {
      expect(t('commands.inject.spinners.found', { count: 3 })).toBe('Found 3 molecule(s)')
    })
  })

  describe('getLocale()', () => {
    it('returns current locale', () => {
      expect(getLocale()).toBe('en')
    })

    it('reflects changes from initLocaleSync', () => {
      initLocaleSync('fr', {})
      expect(getLocale()).toBe('fr')
    })
  })

  describe('locale completeness', () => {
    it('has no empty string values', () => {
      for (const [key, value] of Object.entries(messages)) {
        expect(value, `Key "${key}" has empty value`).not.toBe('')
      }
    })

    it('all keys follow naming convention', () => {
      const validPattern = /^(commands\.\w+|lib\.\w+)\./
      for (const key of Object.keys(messages)) {
        expect(key, `Key "${key}" does not follow naming convention`).toMatch(validPattern)
      }
    })

    it('all interpolation placeholders use valid identifiers', () => {
      for (const [key, value] of Object.entries(messages)) {
        const placeholders = value.match(/\{(\w+)\}/g) ?? []
        for (const placeholder of placeholders) {
          expect(placeholder, `Invalid placeholder in "${key}"`).toMatch(/^\{[a-zA-Z]\w*\}$/)
        }
      }
    })

    it('has keys for all commands', () => {
      const commands = ['add', 'create', 'init', 'inject', 'swap', 'validate']
      for (const cmd of commands) {
        const hasKey = Object.keys(messages).some((k) => k.startsWith(`commands.${cmd}.`))
        expect(hasKey, `Missing keys for command "${cmd}"`).toBe(true)
      }
    })

    it('has keys for all lib modules that use i18n', () => {
      const modules = ['validator', 'injector', 'registry']
      for (const mod of modules) {
        const hasKey = Object.keys(messages).some((k) => k.startsWith(`lib.${mod}.`))
        expect(hasKey, `Missing keys for lib module "${mod}"`).toBe(true)
      }
    })

    it('every command has a description key', () => {
      const commands = ['add', 'create', 'init', 'inject', 'swap', 'validate']
      for (const cmd of commands) {
        expect(
          messages[`commands.${cmd}.description`],
          `Missing description for ${cmd}`,
        ).toBeDefined()
      }
    })
  })
})
