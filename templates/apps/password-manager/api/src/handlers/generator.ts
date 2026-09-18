import crypto from 'crypto'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const generatorSchema = z.object({
  length: z.number().int().min(4).max(256).default(20),
  uppercase: z.boolean().default(true),
  lowercase: z.boolean().default(true),
  numbers: z.boolean().default(true),
  symbols: z.boolean().default(true),
  avoidAmbiguous: z.boolean().default(false),
})

const passphraseSchema = z.object({
  words: z.number().int().min(3).max(16).default(4),
  separator: z.string().min(1).max(4).default('-'),
  capitalize: z.boolean().default(true),
})

const WORD_LIST = [
  'apple',
  'brave',
  'cloud',
  'dance',
  'eagle',
  'flame',
  'grape',
  'heart',
  'ivory',
  'joker',
  'kneel',
  'lemon',
  'maple',
  'noble',
  'ocean',
  'piano',
  'quest',
  'river',
  'storm',
  'tiger',
  'unity',
  'vivid',
  'whale',
  'xenon',
  'yacht',
  'zesty',
  'amber',
  'blaze',
  'cedar',
  'drift',
  'ember',
  'frost',
  'gleam',
  'haven',
  'index',
  'jewel',
  'karma',
  'lunar',
  'marsh',
  'nexus',
  'orbit',
  'prism',
  'quilt',
  'ridge',
  'spark',
  'thorn',
  'ultra',
  'vault',
]

router.post('/', validateBody(generatorSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { length, uppercase, lowercase, numbers, symbols, avoidAmbiguous } = req.body as z.infer<
      typeof generatorSchema
    >

    const buckets: string[] = []
    if (uppercase)
      buckets.push(avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    if (lowercase)
      buckets.push(avoidAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz')
    if (numbers) buckets.push(avoidAmbiguous ? '23456789' : '0123456789')
    if (symbols) buckets.push('!@#$%^&*()_+-=[]{}|;:,.<>?')
    if (buckets.length === 0) buckets.push('abcdefghijklmnopqrstuvwxyz')

    const charset = buckets.join('')

    // Guarantee one char from each enabled bucket so a 24-char request
    // with all four charsets enabled never silently omits a category
    // (the failure mode that keeps users locked out of sites enforcing
    // "must contain a digit/symbol" rules).
    const reservedCount = Math.min(buckets.length, length)
    const seedBytes = crypto.randomBytes(length + reservedCount)
    const chars: string[] = []
    for (let i = 0; i < reservedCount; i++) {
      chars.push(buckets[i][seedBytes[i] % buckets[i].length])
    }
    for (let i = reservedCount; i < length; i++) {
      chars.push(charset[seedBytes[i] % charset.length])
    }
    // Fisher-Yates shuffle so the guaranteed chars don't always land in
    // the same positions
    for (let i = chars.length - 1; i > 0; i--) {
      const j = seedBytes[length + (i % reservedCount)] % (i + 1)
      ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    const password = chars.join('')

    res.json({ password })
  } catch (error) {
    logger.error('generator.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/passphrase', validateBody(passphraseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { words, separator, capitalize } = req.body as z.infer<typeof passphraseSchema>
    const selected: string[] = []
    const bytes = crypto.randomBytes(words)
    for (let i = 0; i < words; i++) {
      let word = WORD_LIST[bytes[i] % WORD_LIST.length]
      if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1)
      selected.push(word)
    }
    res.json({ passphrase: selected.join(separator) })
  } catch (error) {
    logger.error('generator.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
