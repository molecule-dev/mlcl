/**
 * Resolve the ISO 639-1 transcription language from the user's stored Settings choice.
 *
 * Settings persists a display label (e.g. "Spanish") into
 * `users.oauthData.settings.transcription.language`, but the transcribe handler never passed it to
 * the Whisper bond — so it always auto-detected regardless of the user's choice. This maps the label
 * to the ISO code Whisper expects; an unset or unmapped value returns undefined so auto-detect still
 * applies.
 */

/** Settings "Language" display labels → ISO 639-1 codes. */
const TRANSCRIPTION_LANGUAGE_ISO: Record<string, string> = {
  'English (US)': 'en',
  'English (UK)': 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Japanese: 'ja',
}

export interface UserWithSettings {
  oauthData?: { settings?: { transcription?: { language?: string } } } | null
}

/** The ISO 639-1 code for the user's stored transcription language, or undefined for auto-detect. */
export function resolveTranscriptionLanguage(
  user: UserWithSettings | null | undefined,
): string | undefined {
  const choice = user?.oauthData?.settings?.transcription?.language
  return choice ? TRANSCRIPTION_LANGUAGE_ISO[choice] : undefined
}
