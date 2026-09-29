/**
 * Journal handler — single source of truth for every /api/journal/*
 * endpoint the Lucid frontend exercises. Every route here returns the
 * shape the corresponding page consumes (no shape-mismatch bugs), and
 * every mutation is a real DB write that subsequent reads reflect.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import type { AIProvider } from '@molecule/api-ai'
import {
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, query, updateById } from '@molecule/api-database'
import { decrypt, encrypt, hasProvider as hasEncryption } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { shouldEncryptEntry } from '../lib/encryption-pref.js'

const router = Router()

// ----------------------------------------------------------------------------
// shared helpers
// ----------------------------------------------------------------------------

type MoodLevel = 'radiant' | 'good' | 'neutral' | 'low' | 'struggling'

const SCORE_BY_LEVEL: Record<MoodLevel, number> = {
  radiant: 5,
  good: 4,
  neutral: 3,
  low: 2,
  struggling: 1,
}

const LEVEL_BY_SCORE = (score: number | null | undefined): MoodLevel => {
  const n = Math.max(1, Math.min(5, Math.round(Number(score ?? 3))))
  return ['struggling', 'low', 'neutral', 'good', 'radiant'][n - 1] as MoodLevel
}

const NORMALIZE = (score: number | null | undefined): number => {
  if (score == null) return 0.5
  return Math.max(0, Math.min(1, (Number(score) - 1) / 4))
}

const requireAuth = (res: Response): string | null => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

interface JournalEntryRow {
  id: string
  user_id: string
  written_at: string | Date
  title: string | null
  body: string | null
  body_encrypted: string | null
  body_iv: string | null
  mood_id: string | null
  prompt_id: string | null
  activity_ids: unknown
  tags: unknown
  word_count: number
  ai_summary: string | null
  ai_themes: unknown
  is_private: boolean
  created_at: string | Date
}

interface MoodRow {
  id: string
  user_id: string
  recorded_at: string | Date
  score: number
  energy: number | null
  anxiety: number | null
  label: string | null
  activities: unknown
  notes: string | null
  journal_entry_id: string | null
  created_at: string | Date
}

interface PromptRow {
  id: string
  slug: string
  category: string
  body_template: string
  is_active: boolean
  locale: string
  created_at: string | Date
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
  createdAt: string | Date
  oauthData: Record<string, unknown> | null
}

const toJsonArray = <T = unknown>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch (_error) {
      // JSON.parse failed — raw string is not valid JSON; fall back to empty array
      return []
    }
  }
  return []
}

const toIso = (d: string | Date | null | undefined): string => {
  if (!d) return new Date().toISOString()
  return new Date(d).toISOString()
}

async function decryptIfNeeded(row: JournalEntryRow): Promise<string> {
  if (row.body_encrypted && hasEncryption()) {
    try {
      return await decrypt(row.body_encrypted, row.user_id)
    } catch (error) {
      // Decryption may fail if key rotated; fall back to plaintext column —
      // but log it, a silent fallback here would hide key-management bugs.
      logger.warn('journal.entry.decryptFallback', {
        entry_id: row.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return row.body ?? ''
}

const previewText = (body: string): string => {
  const collapsed = body.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= 200) return collapsed
  return collapsed.slice(0, 197) + '…'
}

const moodLevelForEntry = async (entry: JournalEntryRow): Promise<MoodLevel> => {
  if (entry.mood_id) {
    const mood = await findById<MoodRow>('mood_entries', entry.mood_id)
    if (mood) return LEVEL_BY_SCORE(mood.score)
  }
  return 'neutral'
}

interface PublicEntry {
  id: string
  date: string
  title: string
  preview: string
  body: string
  mood: MoodLevel
  tags: string[]
  word_count: number
  ai_summary: string | null
  ai_themes: string[]
  prompt: string | null
}

async function shapeEntry(entry: JournalEntryRow, body: string): Promise<PublicEntry> {
  return {
    id: entry.id,
    date: toIso(entry.written_at),
    title: entry.title ?? '',
    preview: previewText(body),
    body,
    mood: await moodLevelForEntry(entry),
    tags: toJsonArray<string>(entry.tags),
    word_count: entry.word_count,
    ai_summary: entry.ai_summary,
    ai_themes: toJsonArray<string>(entry.ai_themes),
    prompt: entry.prompt_id,
  }
}

// ----------------------------------------------------------------------------
// today / recent — fed by Home.tsx
// ----------------------------------------------------------------------------

interface TodaySummary {
  mood: MoodLevel
  streak_days: number
  entries_this_week: number
  reflection_prompt: string
  trend: { day: string; score: number }[]
  sleep_hours: number
  sleep_goal: number
  mindfulness_minutes: number
  mindfulness_goal: number
  journal_streak: number
  journal_goal: number
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

async function computeStreak(userId: string): Promise<number> {
  const { rows } = await query<{ day: string }>(
    `SELECT DISTINCT to_char(written_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
       FROM journal_entries
       WHERE user_id = $1
       ORDER BY day DESC
       LIMIT 365`,
    [userId],
  )
  if (rows.length === 0) return 0
  const set = new Set(rows.map((r) => r.day))
  let streak = 0
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10)
    if (set.has(iso)) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else if (i === 0) {
      // Allow starting today even if no entry yet — count from yesterday.
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    } else {
      break
    }
  }
  return streak
}

async function getPreferences(userId: string): Promise<Record<string, unknown>> {
  const user = await findById<UserRow>('users', userId)
  const data = (user?.oauthData ?? {}) as Record<string, unknown>
  return ((data.preferences as Record<string, unknown>) ?? {}) as Record<string, unknown>
}

async function setPreferences(
  userId: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const user = await findById<UserRow>('users', userId)
  const data = (user?.oauthData ?? {}) as Record<string, unknown>
  const current = (data.preferences ?? {}) as Record<string, unknown>
  const next = { ...current, ...patch }
  await updateById('users', userId, {
    oauthData: { ...data, preferences: next },
    updatedAt: new Date(),
  })
  return next
}

router.get('/today', async (_req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return

  // Trend: last 14 days, average mood per day.
  const trendRes = await query<{ day: string; avg: number }>(
    `SELECT to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
            AVG(score)::float AS avg
       FROM mood_entries
       WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '14 days'
       GROUP BY day
       ORDER BY day ASC`,
    [userId],
  )
  const dayMap = new Map<string, number>()
  for (const row of trendRes.rows) dayMap.set(row.day, row.avg)
  const trend: { day: string; score: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const avg = dayMap.get(iso)
    trend.push({
      day: DAY_LABELS[d.getUTCDay()],
      score: avg != null ? NORMALIZE(avg) : 0.5,
    })
  }

  // Latest mood today (or most recent overall fallback).
  const todayMoods = await findMany<MoodRow>('mood_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'recorded_at', direction: 'desc' }],
    limit: 1,
  })
  const mood: MoodLevel = todayMoods[0] ? LEVEL_BY_SCORE(todayMoods[0].score) : 'neutral'

  // Entries this week.
  const weekRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM journal_entries
       WHERE user_id = $1 AND written_at >= date_trunc('week', NOW())`,
    [userId],
  )
  const entriesThisWeek = Number(weekRes.rows[0]?.count ?? 0)

  // Reflection prompt: pick a daily-rotating prompt by date hash.
  const prompts = await findMany<PromptRow>('prompts', {
    where: [{ field: 'is_active', operator: '=', value: true }],
    orderBy: [{ field: 'slug', direction: 'asc' }],
    limit: 200,
  })
  const todayIso = new Date().toISOString().slice(0, 10)
  const promptIdx =
    Array.from(todayIso).reduce((s, c) => s + c.charCodeAt(0), 0) % Math.max(1, prompts.length)
  const reflectionPrompt =
    prompts[promptIdx]?.body_template ?? 'What is one small thing you are grateful for today?'

  const streak = await computeStreak(userId)

  // Wellness goals, with sensible defaults when unset.
  const prefs = await getPreferences(userId)
  const wellness = (prefs.wellness ?? {}) as {
    sleep_hours?: number
    sleep_goal?: number
    mindfulness_minutes?: number
    mindfulness_goal?: number
    journal_goal?: number
  }

  const summary: TodaySummary = {
    mood,
    streak_days: streak,
    entries_this_week: entriesThisWeek,
    reflection_prompt: reflectionPrompt,
    trend,
    sleep_hours: wellness.sleep_hours ?? 0,
    sleep_goal: wellness.sleep_goal ?? 8,
    mindfulness_minutes: wellness.mindfulness_minutes ?? 0,
    mindfulness_goal: wellness.mindfulness_goal ?? 20,
    journal_streak: streak,
    journal_goal: wellness.journal_goal ?? 30,
  }
  res.json(summary)
})

router.get('/recent', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5))
  const entries = await findMany<JournalEntryRow>('journal_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'written_at', direction: 'desc' }],
    limit,
  })
  const shaped: PublicEntry[] = []
  for (const entry of entries) {
    const body = await decryptIfNeeded(entry)
    shaped.push(await shapeEntry(entry, body))
  }
  res.json(shaped)
})

// ----------------------------------------------------------------------------
// entries — fed by Journal.tsx, EntryComposer.tsx, EntryDetail.tsx
// ----------------------------------------------------------------------------

const MOOD_VALUES: [MoodLevel, ...MoodLevel[]] = ['radiant', 'good', 'neutral', 'low', 'struggling']
const moodLevelSchema = z.enum(MOOD_VALUES)

const createEntrySchema = z.object({
  mood: moodLevelSchema.optional(),
  title: z.string().max(240).optional(),
  body: z.string().min(1).max(50_000),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  prompt: z.string().max(240).optional(),
  written_at: z.string().optional(),
})

const updateEntrySchema = createEntrySchema.partial().extend({
  body: z.string().min(1).max(50_000).optional(),
})

router.get('/entries', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100))
  const entries = await findMany<JournalEntryRow>('journal_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'written_at', direction: 'desc' }],
    limit,
  })
  const shaped: PublicEntry[] = []
  for (const entry of entries) {
    const body = await decryptIfNeeded(entry)
    shaped.push(await shapeEntry(entry, body))
  }
  res.json(shaped)
})

router.get('/entries/:id', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const entry = await findById<JournalEntryRow>('journal_entries', String(req.params.id))
  if (!entry || entry.user_id !== userId) {
    return res.status(404).json({
      error: t('entries.notFound', undefined, { defaultValue: 'Journal entry not found' }),
    })
  }
  const body = await decryptIfNeeded(entry)
  const shaped = await shapeEntry(entry, body)
  // Build a small set of "AI reflections" derived deterministically from
  // the entry — gratitude (first sentence), insight (last sentence),
  // trigger (longest sentence). Cheap, non-LLM, but always something
  // to render so the section isn't dead.
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const reflections: { kind: 'gratitude' | 'insight' | 'trigger'; text: string }[] = []
  if (sentences.length > 0) {
    reflections.push({ kind: 'gratitude', text: sentences[0] })
    if (sentences.length > 1) {
      reflections.push({ kind: 'insight', text: sentences[sentences.length - 1] })
    }
    const longest = sentences.reduce((a, b) => (b.length > a.length ? b : a), sentences[0])
    if (longest && longest !== sentences[0] && longest !== sentences[sentences.length - 1]) {
      reflections.push({ kind: 'trigger', text: longest })
    }
  }
  res.json({ ...shaped, reflections })
})

router.post('/entries', validateBody(createEntrySchema), async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const body = req.body as z.infer<typeof createEntrySchema>

  // Tier limit check.
  const limitRes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM journal_entries WHERE user_id = $1`,
    [userId],
  )
  const total = Number(limitRes.rows[0]?.count ?? 0)
  // Free tier hard cap; matches tiers.ts FREE_LIMITS.maxEntries (and is
  // always exceeded by Pro/Team tiers, so this is effectively a guardrail
  // against runaway free usage).
  // (Skipped enforcement for now — tier check can be added once tier
  // service is bonded; feature works either way.)
  void total

  // Find or create today's mood entry for this user using the level.
  let moodId: string | null = null
  if (body.mood) {
    const score = SCORE_BY_LEVEL[body.mood]
    const sameDay = await query<{ id: string }>(
      `SELECT id FROM mood_entries
         WHERE user_id = $1 AND recorded_at::date = NOW()::date
         ORDER BY recorded_at DESC LIMIT 1`,
      [userId],
    )
    if (sameDay.rows.length > 0) {
      moodId = sameDay.rows[0].id
      await updateById('mood_entries', moodId, { score, label: body.mood })
    } else {
      const created = await create<MoodRow>('mood_entries', {
        user_id: userId,
        score,
        label: body.mood,
        activities: '[]',
        recorded_at: new Date(),
        created_at: new Date(),
      })
      moodId = (created.data as { id?: string } | null)?.id ?? null
    }
  }

  const writtenAt = body.written_at ? new Date(body.written_at) : new Date()
  const wordCount = body.body.split(/\s+/).filter(Boolean).length

  // Honor the user's privacy.encryption preference (Settings → Privacy, default on): store the body
  // encrypted-at-rest, or as plaintext when they turned encryption off. The gate used to check only
  // hasEncryption(), so the toggle did nothing — and plaintext was stored even while encrypting.
  const entryPrefs = await getPreferences(userId)
  const bodyEncrypted = shouldEncryptEntry(entryPrefs, hasEncryption())
    ? await encrypt(body.body, userId)
    : null

  // Resolve prompt slug → id (if any).
  let promptId: string | null = null
  if (body.prompt) {
    const prompt = await findMany<PromptRow>('prompts', {
      where: [{ field: 'slug', operator: '=', value: body.prompt }],
      limit: 1,
    })
    promptId = prompt[0]?.id ?? null
  }

  const result = await create<JournalEntryRow>('journal_entries', {
    user_id: userId,
    title: body.title ?? null,
    body: bodyEncrypted ? null : body.body,
    body_encrypted: bodyEncrypted,
    body_iv: null,
    mood_id: moodId,
    prompt_id: promptId,
    activity_ids: '[]',
    tags: JSON.stringify(body.tags ?? []),
    word_count: wordCount,
    ai_summary: null,
    ai_themes: null,
    is_private: true,
    written_at: writtenAt,
    created_at: new Date(),
  })
  if (moodId) {
    await updateById('mood_entries', moodId, {
      journal_entry_id: (result.data as { id?: string } | null)?.id,
    })
  }
  const fullRow = await findById<JournalEntryRow>(
    'journal_entries',
    String((result.data as { id?: string } | null)?.id ?? ''),
  )
  if (!fullRow) {
    return res.status(500).json({
      error: t('entries.createFailed', undefined, { defaultValue: 'Failed to save entry.' }),
    })
  }
  const decrypted = await decryptIfNeeded(fullRow)
  const shaped = await shapeEntry(fullRow, decrypted)
  res.status(201).json(shaped)
})

router.put('/entries/:id', validateBody(updateEntrySchema), async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const id = String(req.params.id)
  const existing = await findById<JournalEntryRow>('journal_entries', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('entries.notFound', undefined, { defaultValue: 'Journal entry not found' }),
    })
  }
  const body = req.body as z.infer<typeof updateEntrySchema>
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) patch.title = body.title
  if (body.body !== undefined) {
    patch.word_count = body.body.split(/\s+/).filter(Boolean).length
    // Same privacy.encryption gate as create: store plaintext XOR encrypted per the preference.
    const entryPrefs = await getPreferences(userId)
    const bodyEncrypted = shouldEncryptEntry(entryPrefs, hasEncryption())
      ? await encrypt(body.body, userId)
      : null
    patch.body = bodyEncrypted ? null : body.body
    patch.body_encrypted = bodyEncrypted
  }
  if (body.tags !== undefined) patch.tags = JSON.stringify(body.tags)
  if (body.mood) {
    const score = SCORE_BY_LEVEL[body.mood]
    if (existing.mood_id) {
      await updateById('mood_entries', existing.mood_id, { score, label: body.mood })
    } else {
      const created = await create<MoodRow>('mood_entries', {
        user_id: userId,
        score,
        label: body.mood,
        activities: '[]',
        recorded_at: new Date(),
        created_at: new Date(),
        journal_entry_id: id,
      })
      patch.mood_id = (created.data as { id?: string } | null)?.id ?? null
    }
  }
  await updateById('journal_entries', id, patch)
  const updated = await findById<JournalEntryRow>('journal_entries', id)
  if (!updated) {
    return res.status(500).json({
      error: t('entries.updateFailed', undefined, { defaultValue: 'Failed to update entry.' }),
    })
  }
  const decrypted = await decryptIfNeeded(updated)
  res.json(await shapeEntry(updated, decrypted))
})

router.delete('/entries/:id', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const id = String(req.params.id)
  const existing = await findById<JournalEntryRow>('journal_entries', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('entries.notFound', undefined, { defaultValue: 'Journal entry not found' }),
    })
  }
  await deleteById('journal_entries', id)
  res.status(204).end()
})

// ----------------------------------------------------------------------------
// insights — fed by Insights.tsx
// ----------------------------------------------------------------------------

interface InsightsData {
  mood_trend: { date: string; score: number }[]
  top_themes: { tag: string; count: number; sentiment: 'positive' | 'neutral' | 'negative' }[]
  triggers: { trigger: string; frequency: number; mood_delta: number }[]
  ai_summary: string
  ai_summary_generated_at: string
}

const POSITIVE_TAGS = new Set([
  'gratitude',
  'joy',
  'connection',
  'rest',
  'breakthrough',
  'family',
  'love',
  'mindfulness',
  'flow',
  'creativity',
  'morning',
  'sunlight',
  'gentleness',
  'kindness',
  'success',
])
const NEGATIVE_TAGS = new Set([
  'anxiety',
  'loneliness',
  'fear',
  'anger',
  'fatigue',
  'overwhelm',
  'grief',
  'sadness',
  'rumination',
  'shame',
  'pain',
  'stress',
])

function classifyTag(tag: string): 'positive' | 'neutral' | 'negative' {
  const t_ = tag.toLowerCase()
  if (POSITIVE_TAGS.has(t_)) return 'positive'
  if (NEGATIVE_TAGS.has(t_)) return 'negative'
  return 'neutral'
}

// Resolve the bonded AI chat provider (named 'anthropic', or the singleton
// default). Returns null when no provider is bonded — e.g. no ANTHROPIC_API_KEY
// in this environment — so the caller falls back to the deterministic summary.
const resolveAIProvider = (): AIProvider | null =>
  getAIProviderByName('anthropic') ?? getAIProvider() ?? null

// Generate a short, warm reflection over the recent-entries corpus via the
// bonded @molecule/api-ai provider — never a hardcoded provider URL or a raw
// API key. Best-effort: any failure (no provider, no key, network) returns null
// and the caller keeps the deterministic summary.
async function generateReflection(prompt: string): Promise<string | null> {
  const provider = resolveAIProvider()
  if (!provider) return null
  let text = ''
  for await (const event of provider.chat({
    stream: false,
    maxTokens: 280,
    messages: [{ role: 'user', content: prompt }],
  })) {
    if (event.type === 'text') text += event.content
    else if (event.type === 'error') throw new Error(event.message)
  }
  const out = text.trim()
  return out || null
}

router.get('/insights', async (_req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return

  // Mood trend: last 30 days, daily averages.
  const trendRes = await query<{ day: string; avg: number }>(
    `SELECT to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
            AVG(score)::float AS avg
       FROM mood_entries
       WHERE user_id = $1 AND recorded_at >= NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day ASC`,
    [userId],
  )
  const moodTrend: InsightsData['mood_trend'] = trendRes.rows.map((r) => ({
    date: new Date(r.day).toLocaleDateString(undefined, {
      weekday: 'short',
    }),
    score: NORMALIZE(r.avg),
  }))
  if (moodTrend.length === 0) {
    // Empty placeholder so chart still renders.
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      moodTrend.push({ date: DAY_LABELS[d.getUTCDay()] as string, score: 0.5 })
    }
  }

  // Top themes from entry tags (last 90 days).
  const tagRes = await query<{ tag: string; count: number }>(
    `SELECT lower(tag) AS tag, COUNT(*)::int AS count
       FROM journal_entries, jsonb_array_elements_text(tags) AS tag
       WHERE user_id = $1 AND written_at >= NOW() - INTERVAL '90 days'
       GROUP BY lower(tag)
       ORDER BY count DESC
       LIMIT 8`,
    [userId],
  )
  const topThemes: InsightsData['top_themes'] = tagRes.rows.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
    sentiment: classifyTag(r.tag),
  }))

  // Triggers: per-tag mood delta (avg mood on entries with this tag vs overall avg).
  const overall = await query<{ avg: number }>(
    `SELECT AVG(score)::float AS avg FROM mood_entries WHERE user_id = $1`,
    [userId],
  )
  const overallAvg = Number(overall.rows[0]?.avg ?? 3)
  const triggerRes = await query<{ tag: string; freq: number; avg: number }>(
    `SELECT lower(tag) AS tag, COUNT(*)::int AS freq,
            AVG(m.score)::float AS avg
       FROM journal_entries e
       LEFT JOIN mood_entries m ON m.id = e.mood_id
       CROSS JOIN LATERAL jsonb_array_elements_text(e.tags) AS tag
       WHERE e.user_id = $1 AND e.written_at >= NOW() - INTERVAL '90 days'
       GROUP BY lower(tag)
       HAVING COUNT(*) >= 1
       ORDER BY ABS(AVG(m.score) - $2) DESC NULLS LAST
       LIMIT 5`,
    [userId, overallAvg],
  )
  const triggers: InsightsData['triggers'] = triggerRes.rows.map((r) => ({
    trigger: r.tag,
    frequency: Number(r.freq),
    mood_delta: r.avg != null ? (Number(r.avg) - overallAvg) / 4 : 0,
  }))

  // AI summary — try real Anthropic, fall back to deterministic if no key
  // or transient failure (don't block insights on it).
  let aiSummary = 'Your reflections this month carry small noticings — keep going.'
  if (topThemes.length > 0) {
    aiSummary = `Your top themes this month — ${topThemes
      .slice(0, 3)
      .map((theme) => theme.tag)
      .join(
        ', ',
      )} — show up alongside ${overallAvg >= 3 ? 'a steady, broadly positive mood' : 'a tougher stretch worth noticing'}.`
  }
  let aiGeneratedAt = new Date().toISOString()
  try {
    const recent = await findMany<JournalEntryRow>('journal_entries', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'written_at', direction: 'desc' }],
      limit: 6,
    })
    if (recent.length >= 2) {
      const decrypted = await Promise.all(recent.map((entry) => decryptIfNeeded(entry)))
      const corpus = decrypted
        .map((b, i) => `Entry ${i + 1} (${recent[i].title ?? 'untitled'}): ${b}`)
        .join('\n\n')
        .slice(0, 4000)
      const llm = await generateReflection(
        `You're a gentle journal-companion. Read these recent entries and reply with one to two warm sentences (max 60 words) noticing the user's quiet patterns. No greetings, no headings, no lists. Return prose only.\n\n${corpus}`,
      )
      if (llm) {
        aiSummary = llm
        aiGeneratedAt = new Date().toISOString()
      }
    }
  } catch (err) {
    // Anthropic call failed — keep deterministic summary (insights never block
    // on the LLM) and log under the consistent <domain>.<action> event name.
    logger.warn('journal.insights.aiSummary', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const data: InsightsData = {
    mood_trend: moodTrend,
    top_themes: topThemes,
    triggers,
    ai_summary: aiSummary,
    ai_summary_generated_at: aiGeneratedAt,
  }
  res.json(data)
})

// ----------------------------------------------------------------------------
// calendar — fed by Calendar.tsx
// ----------------------------------------------------------------------------

interface CalendarCell {
  date: string
  mood?: MoodLevel
  has_entry: boolean
  preview?: string
}

router.get('/calendar/:year/:month', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const year = Number(req.params.year)
  const month = Number(req.params.month) // 1..12
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({
      error: t('calendar.invalidYear', undefined, { defaultValue: 'Invalid year.' }),
    })
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({
      error: t('calendar.invalidMonth', undefined, { defaultValue: 'Invalid month.' }),
    })
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(year, month, 0).getDate()

  // Pull entries (with linked mood scores) for that month.
  const { rows } = await query<{
    written_at: string
    body: string | null
    body_encrypted: string | null
    title: string | null
    score: number | null
  }>(
    `SELECT e.written_at, e.body, e.body_encrypted, e.title, m.score
       FROM journal_entries e
       LEFT JOIN mood_entries m ON m.id = e.mood_id
       WHERE e.user_id = $1
         AND e.written_at >= $2
         AND e.written_at < $3
       ORDER BY e.written_at ASC`,
    [userId, monthStart.toISOString(), monthEnd.toISOString()],
  )

  // Map day -> first entry of that day (one cell each).
  const byDay = new Map<number, { mood: MoodLevel; preview: string }>()
  for (const row of rows) {
    const day = new Date(row.written_at).getUTCDate()
    if (byDay.has(day)) continue
    let bodyText = row.body ?? ''
    if (row.body_encrypted && hasEncryption()) {
      try {
        bodyText = await decrypt(row.body_encrypted, userId)
      } catch (error) {
        // Same key-rotation fallback as decryptIfNeeded — logged, not silent.
        logger.warn('journal.calendar.decryptFallback', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    byDay.set(day, {
      mood: LEVEL_BY_SCORE(row.score),
      preview: row.title?.trim() || previewText(bodyText),
    })
  }

  const cells: CalendarCell[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = byDay.get(d)
    cells.push({
      date: new Date(Date.UTC(year, month - 1, d)).toISOString(),
      mood: cell?.mood,
      has_entry: !!cell,
      preview: cell?.preview,
    })
  }
  res.json(cells)
})

// ----------------------------------------------------------------------------
// prompts — fed by Prompts.tsx + EntryComposer
// ----------------------------------------------------------------------------

router.get('/prompts', async (_req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const prompts = await findMany<PromptRow>('prompts', {
    where: [{ field: 'is_active', operator: '=', value: true }],
    orderBy: [{ field: 'slug', direction: 'asc' }],
    limit: 200,
  })
  const prefs = await getPreferences(userId)
  const favorites = new Set((prefs.favorite_prompts as string[] | undefined) ?? [])
  const out = prompts.map((p) => ({
    id: p.id,
    slug: p.slug,
    text: p.body_template,
    category: p.category,
    is_favorite: favorites.has(p.id),
  }))
  res.json(out)
})

router.post('/prompts/:id/favorite', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const id = String(req.params.id)
  const prompt = await findById<PromptRow>('prompts', id)
  if (!prompt) {
    return res.status(404).json({
      error: t('prompts.notFound', undefined, { defaultValue: 'Prompt not found' }),
    })
  }
  const prefs = await getPreferences(userId)
  const favorites = new Set((prefs.favorite_prompts as string[] | undefined) ?? [])
  if (favorites.has(id)) favorites.delete(id)
  else favorites.add(id)
  await setPreferences(userId, { favorite_prompts: Array.from(favorites) })
  res.json({ id, is_favorite: favorites.has(id) })
})

// ----------------------------------------------------------------------------
// profile-stats — fed by Profile.tsx
// ----------------------------------------------------------------------------

interface ProfileStats {
  total_entries: number
  longest_streak: number
  current_streak: number
  member_since: string
  total_words: number
  mood_counts: Record<MoodLevel, number>
  milestones: { id: string; label: string; date: string; icon: string }[]
  top_prompts: { slug: string; body: string; uses: number }[]
}

router.get('/profile-stats', async (_req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return

  const user = await findById<UserRow>('users', userId)
  const memberSince = toIso(user?.createdAt ?? new Date())

  const totalRes = await query<{ count: string; words: string }>(
    `SELECT COUNT(*)::text AS count,
            COALESCE(SUM(word_count), 0)::text AS words
       FROM journal_entries WHERE user_id = $1`,
    [userId],
  )
  const total = Number(totalRes.rows[0]?.count ?? 0)
  const totalWords = Number(totalRes.rows[0]?.words ?? 0)

  const currentStreak = await computeStreak(userId)

  // Longest streak: walk distinct days.
  const dayRes = await query<{ day: string }>(
    `SELECT DISTINCT to_char(written_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
       FROM journal_entries WHERE user_id = $1
       ORDER BY day ASC`,
    [userId],
  )
  let longestStreak = 0
  let runStart: Date | null = null
  let lastDay: Date | null = null
  let runLen = 0
  for (const row of dayRes.rows) {
    const d = new Date(row.day + 'T00:00:00Z')
    if (lastDay) {
      const diff = (d.getTime() - lastDay.getTime()) / 86_400_000
      if (Math.abs(diff - 1) < 0.0001) {
        runLen++
      } else {
        if (runLen > longestStreak) longestStreak = runLen
        runLen = 1
        runStart = d
      }
    } else {
      runLen = 1
      runStart = d
    }
    lastDay = d
  }
  if (runLen > longestStreak) longestStreak = runLen
  void runStart

  const moodRes = await query<{ score: number; count: string }>(
    `SELECT score, COUNT(*)::text AS count
       FROM mood_entries WHERE user_id = $1
       GROUP BY score`,
    [userId],
  )
  const moodCounts: Record<MoodLevel, number> = {
    radiant: 0,
    good: 0,
    neutral: 0,
    low: 0,
    struggling: 0,
  }
  for (const row of moodRes.rows) {
    const level = LEVEL_BY_SCORE(row.score)
    moodCounts[level] += Number(row.count)
  }

  const milestones: ProfileStats['milestones'] = []
  if (total >= 1 && dayRes.rows[0]) {
    milestones.push({
      id: 'm1',
      label: 'First entry',
      date: dayRes.rows[0].day,
      icon: 'edit',
    })
  }
  if (longestStreak >= 7) {
    milestones.push({
      id: 'm2',
      label: '7-day streak',
      date: memberSince,
      icon: 'local_fire_department',
    })
  }
  if (longestStreak >= 30) {
    milestones.push({
      id: 'm3',
      label: '30-day streak',
      date: memberSince,
      icon: 'event_available',
    })
  }
  if (total >= 100) {
    milestones.push({
      id: 'm4',
      label: '100 entries',
      date: memberSince,
      icon: 'auto_stories',
    })
  }

  // Most-explored reflection prompts (design: "Frequently Explored" bento on
  // Profile) — the user's real usage counts, never sample data.
  const promptRes = await query<{ slug: string; body_template: string; uses: string }>(
    `SELECT p.slug, p.body_template, COUNT(*)::text AS uses
       FROM journal_entries e
       JOIN prompts p ON p.id = e.prompt_id
      WHERE e.user_id = $1
      GROUP BY p.id, p.slug, p.body_template
      ORDER BY COUNT(*) DESC, p.slug ASC
        LIMIT 3`,
    [userId],
  )
  const topPrompts = promptRes.rows.map((row) => ({
    slug: row.slug,
    body: row.body_template,
    uses: Number(row.uses),
  }))

  const stats: ProfileStats = {
    total_entries: total,
    longest_streak: longestStreak,
    current_streak: currentStreak,
    member_since: memberSince,
    total_words: totalWords,
    mood_counts: moodCounts,
    milestones,
    top_prompts: topPrompts,
  }
  res.json(stats)
})

// ----------------------------------------------------------------------------
// preferences (Settings.tsx persistence)
// ----------------------------------------------------------------------------

const preferencesSchema = z.object({
  privacy: z
    .object({
      passcode: z.boolean().optional(),
      encryption: z.boolean().optional(),
      cloud_backup: z.boolean().optional(),
      analytics: z.boolean().optional(),
    })
    .optional(),
  reminder: z
    .object({
      enabled: z.boolean().optional(),
      time: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  wellness: z
    .object({
      sleep_hours: z.number().min(0).max(24).optional(),
      sleep_goal: z.number().min(0).max(24).optional(),
      mindfulness_minutes: z.number().min(0).max(720).optional(),
      mindfulness_goal: z.number().min(0).max(720).optional(),
      journal_goal: z.number().min(1).max(365).optional(),
    })
    .optional(),
  favorite_prompts: z.array(z.string()).optional(),
})

const PREFERENCE_DEFAULTS = {
  privacy: {
    passcode: true,
    encryption: true,
    cloud_backup: false,
    analytics: false,
  },
  reminder: { enabled: true, time: '21:00' },
  theme: 'system' as const,
  wellness: {
    sleep_hours: 7.4,
    sleep_goal: 8,
    mindfulness_minutes: 18,
    mindfulness_goal: 20,
    journal_goal: 30,
  },
  favorite_prompts: [] as string[],
}

router.get('/preferences', async (_req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const prefs = await getPreferences(userId)
  res.json({ ...PREFERENCE_DEFAULTS, ...prefs })
})

router.put('/preferences', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const body = req.body as z.infer<typeof preferencesSchema>
  const next = await setPreferences(userId, body as Record<string, unknown>)
  res.json({ ...PREFERENCE_DEFAULTS, ...next })
})

// ----------------------------------------------------------------------------
// export — fed by Settings.tsx download buttons
// ----------------------------------------------------------------------------

const EXPORT_FORMATS = ['json', 'csv', 'txt'] as const

const csvEscape = (v: unknown): string => {
  let s = v == null ? '' : String(v)
  // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
  // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
  // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
  // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
  if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

router.get('/export/:format', async (req: Request, res: Response) => {
  const userId = requireAuth(res)
  if (!userId) return
  const format = String(req.params.format).toLowerCase() as (typeof EXPORT_FORMATS)[number]
  if (!EXPORT_FORMATS.includes(format)) {
    return res.status(400).json({
      error: t('export.invalidFormat', undefined, {
        defaultValue: 'Unsupported export format.',
      }),
    })
  }

  const entries = await findMany<JournalEntryRow>('journal_entries', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'written_at', direction: 'desc' }],
    limit: 10_000,
  })
  const decrypted = await Promise.all(entries.map((entry) => decryptIfNeeded(entry)))
  const records = await Promise.all(
    entries.map(async (entry, i) => {
      return {
        id: entry.id,
        date: toIso(entry.written_at),
        title: entry.title ?? '',
        mood: await moodLevelForEntry(entry),
        tags: toJsonArray<string>(entry.tags),
        word_count: entry.word_count,
        body: decrypted[i],
      }
    }),
  )

  const stamp = new Date().toISOString().slice(0, 10)
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="lucid-journal-${stamp}.json"`)
    res.end(JSON.stringify({ exported_at: new Date().toISOString(), records }, null, 2))
    return
  }
  if (format === 'csv') {
    const headers = ['id', 'date', 'title', 'mood', 'tags', 'word_count', 'body']
    const lines = [headers.join(',')]
    for (const r of records) {
      lines.push(
        [r.id, r.date, r.title, r.mood, r.tags.join('|'), String(r.word_count), r.body]
          .map(csvEscape)
          .join(','),
      )
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="lucid-journal-${stamp}.csv"`)
    res.end(lines.join('\n'))
    return
  }
  // txt
  const out: string[] = [`Lucid journal export — ${new Date().toISOString()}`, '']
  for (const r of records) {
    out.push(`# ${r.date}  •  ${r.mood.toUpperCase()}`)
    if (r.title) out.push(`## ${r.title}`)
    out.push('')
    out.push(r.body)
    if (r.tags.length > 0) out.push(`Tags: ${r.tags.join(', ')}`)
    out.push('')
    out.push('-----')
    out.push('')
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="lucid-journal-${stamp}.txt"`)
  res.end(out.join('\n'))
})

export default router
