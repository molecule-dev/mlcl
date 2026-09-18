import { describe, expect, it } from 'vitest'

import { resolveTranscriptionLanguage } from '../lib/transcription-language.js'

// The user's stored transcription language (Settings → oauthData.settings.transcription.language)
// was never passed to Whisper, so it always auto-detected. resolveTranscriptionLanguage maps the
// stored display label to the ISO 639-1 code the bond expects; unset/unmapped → undefined
// (auto-detect).

const withLang = (language?: string) => ({
  oauthData: { settings: { transcription: { language } } },
})

describe('resolveTranscriptionLanguage', () => {
  it('maps each Settings language label to its ISO 639-1 code', () => {
    expect(resolveTranscriptionLanguage(withLang('Spanish'))).toBe('es')
    expect(resolveTranscriptionLanguage(withLang('French'))).toBe('fr')
    expect(resolveTranscriptionLanguage(withLang('German'))).toBe('de')
    expect(resolveTranscriptionLanguage(withLang('Japanese'))).toBe('ja')
    expect(resolveTranscriptionLanguage(withLang('English (US)'))).toBe('en')
    expect(resolveTranscriptionLanguage(withLang('English (UK)'))).toBe('en')
  })

  it('returns undefined (auto-detect) when the language is unset', () => {
    expect(resolveTranscriptionLanguage(withLang(undefined))).toBeUndefined()
    expect(resolveTranscriptionLanguage({ oauthData: {} })).toBeUndefined()
    expect(resolveTranscriptionLanguage({ oauthData: null })).toBeUndefined()
    expect(resolveTranscriptionLanguage(null)).toBeUndefined()
    expect(resolveTranscriptionLanguage(undefined)).toBeUndefined()
  })

  it('returns undefined for an unknown label rather than a bad code', () => {
    expect(resolveTranscriptionLanguage(withLang('Klingon'))).toBeUndefined()
  })
})
