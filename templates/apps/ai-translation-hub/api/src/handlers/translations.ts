/**
 * Machine + AI translation handler — `POST /translations/translate` calls
 * the bonded `@molecule/api-ai-translation` provider (DeepL in
 * production); `POST /translations/suggest` calls the bonded `@molecule/api-ai`
 * provider (Anthropic Claude) for a polished review suggestion.
 *
 * Segment persistence (CRUD) lives in `segments.ts`; this module is
 * purely the on-demand machine + AI translation surface.
 *
 * Document upload + binary file translation is deferred per INVENTORY's
 * "Open questions / decisions deferred" — v1 ships plain-text segment
 * translation only.
 */
import { Router } from 'express'
import { z } from 'zod'

import { getProvider as getAIProvider, requireProvider as requireAI } from '@molecule/api-ai'
import { requireProvider as requireTranslation } from '@molecule/api-ai-translation'
import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const langCode = z.string().min(2).max(10)

const translateTextSchema = z.object({
  text: z.string().min(1),
  source_lang: langCode.optional(),
  target_lang: langCode,
  context: z.string().optional(),
  glossary: z.array(z.object({ source: z.string(), target: z.string() })).optional(),
})

const suggestSchema = z.object({
  source_text: z.string().min(1),
  current_translation: z.string().optional(),
  source_lang: langCode.optional(),
  target_lang: langCode,
  context: z.string().optional(),
})

const applyGlossary = (
  text: string,
  glossary: Array<{ source: string; target: string }>,
): string => {
  let result = text
  for (const { source, target } of glossary) {
    if (!source) continue
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), target)
  }
  return result
}

router.post('/translate', validateBody(translateTextSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof translateTextSchema>

    // Attempt translation via the dedicated translation bond (e.g. DeepL).
    // When that bond is unavailable or its API key is missing, fall back to
    // the AI bond (Anthropic) so the endpoint stays functional in CI / dev
    // environments where only ANTHROPIC_API_KEY is set.
    let translated = ''
    let detectedSourceLang: string | null = body.source_lang ?? null
    let providerName = 'ai-fallback'

    try {
      const translationProvider = requireTranslation()
      const result = await translationProvider.translate({
        text: body.text,
        sourceLang: body.source_lang,
        targetLang: body.target_lang,
        context: body.context,
      })
      const first = result.translations[0]
      translated = first?.text ?? ''
      detectedSourceLang = first?.detectedSourceLang ?? body.source_lang ?? null
      providerName = translationProvider.name
    } catch (error) {
      logger.warn('translations.translate.bond', error)
      // Translation bond unavailable or call failed — fall back to AI.
      // Use getAIProvider() (which applies the single-named-bond fallback)
      // rather than hasAIProvider() (singleton-only) so that apps wired
      // via bond('ai', 'anthropic', provider) are correctly detected.
      if (!getAIProvider()) {
        res.status(503).json({
          error: t(
            'translations.unavailable',
            {},
            { defaultValue: 'Translation service unavailable' },
          ),
        })
        return
      }
      const ai = requireAI()
      const targetLabel = body.target_lang.toUpperCase()
      const systemPrompt =
        `You are a professional translator. Translate the following text to ${targetLabel}.` +
        `${body.context ? ` Context: ${body.context}.` : ''} ` +
        `Return ONLY the translated text — no explanations, no quotes.`
      for await (const event of ai.chat({
        system: systemPrompt,
        messages: [{ role: 'user', content: body.text }],
        maxTokens: 1024,
      })) {
        if (event.type === 'text') translated += event.content
        else if (event.type === 'error') {
          res
            .status(502)
            .json({ error: t('translations.aiFailed', {}, { defaultValue: 'AI request failed' }) })
          return
        }
      }
      translated = translated.trim()
    }

    // Enforce the user's saved glossary terms so approved terminology is applied. The endpoint
    // accepted an optional `glossary` body field but nothing ever sent it, and the stored
    // glossary_terms were never loaded — so a curated glossary silently did nothing. Load the
    // terms scoped to this translation's language pair (source lang from the request or detection).
    const effectiveSourceLang = detectedSourceLang ?? body.source_lang
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'target_lang', operator: '=', value: body.target_lang },
    ]
    if (effectiveSourceLang) {
      where.push({ field: 'source_lang', operator: '=', value: effectiveSourceLang })
    }
    const savedTerms = await findMany<{ source_term: string; target_term: string }>(
      'glossary_terms',
      { where },
    )
    const glossary = [
      ...savedTerms.map((term) => ({ source: term.source_term, target: term.target_term })),
      ...(body.glossary ?? []),
    ]
    if (glossary.length > 0) {
      translated = applyGlossary(translated, glossary)
    }
    res.json({
      target_text: translated,
      detected_source_lang: detectedSourceLang,
      provider: providerName,
    })
  } catch (error) {
    logger.error('translations.translate', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/suggest', validateBody(suggestSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!getAIProvider()) {
      res.status(503).json({
        error: t('translations.aiUnavailable', {}, { defaultValue: 'AI review unavailable' }),
      })
      return
    }
    const body = req.body as z.infer<typeof suggestSchema>
    const ai = requireAI()
    const targetLabel = body.target_lang.toUpperCase()

    // Honor the user's saved glossary so a review suggestion can't contradict approved
    // terminology. Like /translate, this endpoint never consulted the stored glossary_terms, so a
    // curated glossary did nothing here. Load the terms for this language pair, steer the reviewer
    // via the prompt, and enforce them on the output (belt-and-suspenders, identical to /translate).
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'target_lang', operator: '=', value: body.target_lang },
    ]
    if (body.source_lang) {
      where.push({ field: 'source_lang', operator: '=', value: body.source_lang })
    }
    const savedTerms = await findMany<{ source_term: string; target_term: string }>(
      'glossary_terms',
      { where },
    )
    const glossary = savedTerms.map((term) => ({
      source: term.source_term,
      target: term.target_term,
    }))
    const glossaryInstruction =
      glossary.length > 0
        ? ` Use this approved glossary and always prefer the target term: ${glossary
            .map((g) => `"${g.source}" → "${g.target}"`)
            .join('; ')}.`
        : ''

    const systemPrompt =
      `You are a professional translation reviewer. Provide an improved ${targetLabel} ` +
      `translation of the given text.${body.context ? ` Context: ${body.context}.` : ''}${glossaryInstruction} ` +
      `Return ONLY the translated text — no explanations, no quotes.`
    const userPrompt = body.current_translation
      ? `Source: ${body.source_text}\n\nCurrent translation: ${body.current_translation}\n\nProvide an improved translation or restate the current one if accurate.`
      : `Source: ${body.source_text}\n\nProvide a high-quality ${targetLabel} translation.`

    let suggestion = ''
    for await (const event of ai.chat({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    })) {
      if (event.type === 'text') suggestion += event.content
      else if (event.type === 'error') {
        res
          .status(502)
          .json({ error: t('translations.aiFailed', {}, { defaultValue: 'AI request failed' }) })
        return
      }
    }
    const finalSuggestion =
      glossary.length > 0 ? applyGlossary(suggestion.trim(), glossary) : suggestion.trim()
    res.json({ suggestion: finalSuggestion })
  } catch (error) {
    logger.error('translations.suggest', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
