/**
 * Lightweight CLI i18n module.
 *
 * Provides string lookup with interpolation for all CLI-facing text.
 * English messages are loaded eagerly so t() works at class-definition
 * time (required for oclif static description properties).
 *
 * @module
 */

import { messages as enMessages } from '../locales/en.js'
import type { LocaleMessages } from '../locales/types.js'

let currentLocale = 'en'
let messages: LocaleMessages = enMessages

/**
 * Get the current locale.
 */
export function getLocale(): string {
  return currentLocale
}

/**
 * Set the locale and load its messages.
 * Falls back to English if the requested locale is not available.
 */
export async function setLocale(locale: string): Promise<void> {
  currentLocale = locale
  messages = await loadLocaleMessages(locale)
}

/**
 * Synchronous initialization with pre-loaded messages.
 * Useful in tests or when switching to a bundled locale.
 */
export function initLocaleSync(locale: string, msgs: LocaleMessages): void {
  currentLocale = locale
  messages = msgs
}

/**
 * Look up a translated string by dot-path key.
 *
 * - Returns the key itself if no translation is found (graceful fallback).
 * - Supports interpolation: t('key', { name: 'foo' }) replaces {name} with foo.
 * - Supports pluralization via count: looks for key_one / key_other suffixes.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let template = messages[key]

  if (params && 'count' in params) {
    const count = Number(params.count)
    const pluralKey = count === 1 ? `${key}_one` : `${key}_other`
    if (messages[pluralKey]) {
      template = messages[pluralKey]
    }
  }

  if (!template) return key

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      template = template.replaceAll(`{${name}}`, String(value))
    }
  }

  return template
}

/**
 * Dynamically import locale messages.
 * Falls back to English if the requested locale is not found.
 */
async function loadLocaleMessages(locale: string): Promise<LocaleMessages> {
  try {
    const mod = await import(`../locales/${locale}.js`)
    return mod.messages
  } catch (_error) {
    // Safe to ignore: dynamic import fails when the locale file doesn't exist.
    // Falling back to English (or empty object for 'en') is the documented behavior.
    if (locale !== 'en') {
      return enMessages
    }
    return {}
  }
}
