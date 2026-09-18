/**
 * Queries handler — natural-language ad-hoc query endpoint.
 *
 * Calls Anthropic if a bonded `ai/anthropic` provider is available and
 * `ANTHROPIC_API_KEY` is set; otherwise returns a deterministic
 * synthetic shape so the QueryEditor page works in offline / demo
 * scenarios. The response shape matches the frontend `QueryResult`
 * contract regardless of source.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { get } from '@molecule/api-bond'
import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const askSchema = z.object({
  prompt: z.string().min(1).max(2000),
})

interface QueryResult {
  question: string
  generated_sql: string
  chart_type: 'bar' | 'line' | 'scatter' | 'table'
  series: { label: string; value: number }[]
  rows: { col: string; values: (string | number)[] }[]
  insight: string
  source: 'ai' | 'synth'
}

/** djb2 string hash → stable non-negative integer. */
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Deterministic synthesizer used as a fallback when the AI bond is not
 * available or returns malformed JSON. Same prompt → same shape.
 */
function synthesize(prompt: string): QueryResult {
  const seed = hashStr(prompt)
  const lower = prompt.toLowerCase()

  const isTrend = /\b(over time|trend|month|week|day|quarter|year|growth|change|history)\b/.test(
    lower,
  )
  const isCorrelation = /\b(correlation|relationship|vs\.?|versus|between)\b/.test(lower)
  const chart_type: QueryResult['chart_type'] = isCorrelation ? 'scatter' : isTrend ? 'line' : 'bar'

  const dimension = /\bcustomer|account|company|client\b/.test(lower)
    ? 'segment'
    : /\bproduct|sku|item\b/.test(lower)
      ? 'product_code'
      : /\bregion|country|geo\b/.test(lower)
        ? 'region_code'
        : /\bchannel|source|campaign\b/.test(lower)
          ? 'channel'
          : 'bucket'

  const measure = /\brevenue|sales|amount|gmv|spend|cost\b/.test(lower)
    ? 'amount_cents'
    : /\bsession|visit|user|signup|active\b/.test(lower)
      ? 'event_count'
      : /\bchurn|retention|conversion|rate\b/.test(lower)
        ? 'rate_bps'
        : 'value'

  const table = /\bevent|signup|session|click|view\b/.test(lower)
    ? 'events'
    : /\border|payment|invoice|charge|transaction\b/.test(lower)
      ? 'transactions'
      : /\buser|account|customer|member\b/.test(lower)
        ? 'accounts'
        : 'metrics'

  const series: { label: string; value: number }[] = []
  for (let i = 0; i < 8; i++) {
    const noise = ((seed >> (i * 3)) & 0x3ff) + 1
    const base = chart_type === 'line' ? (i + 1) * 1200 + noise * 8 : 5_000 + noise * 12 + i * 137
    const label =
      chart_type === 'line'
        ? `period_${(i + 1).toString().padStart(2, '0')}`
        : `${dimension}_${(i + 1).toString().padStart(2, '0')}`
    series.push({ label, value: chart_type === 'line' ? base : Math.max(base - i * 350, 50) })
  }

  if (chart_type === 'bar') series.sort((a, b) => b.value - a.value)

  const generated_sql =
    chart_type === 'line'
      ? `SELECT date_trunc('month', occurred_at) AS period,\n       SUM(${measure}) AS total\nFROM ${table}\nWHERE occurred_at >= NOW() - INTERVAL '8 months'\nGROUP BY 1\nORDER BY 1 ASC;`
      : `SELECT ${dimension},\n       SUM(${measure}) AS total\nFROM ${table}\nWHERE occurred_at >= NOW() - INTERVAL '90 days'\nGROUP BY 1\nORDER BY total DESC\nLIMIT 8;`

  const rows = [
    { col: dimension, values: series.map((s) => s.label) },
    { col: measure, values: series.map((s) => s.value) },
  ]

  const top = series[0]
  const totalSum = series.reduce((acc, s) => acc + s.value, 0) || 1
  const topShare = Math.round((top.value / totalSum) * 100)
  const insight =
    chart_type === 'line'
      ? `Recent trend rises ${Math.round(((series[7].value - series[0].value) / Math.max(series[0].value, 1)) * 100)}% across the window. Period \`${top.label}\` is the strongest contributor.`
      : `\`${top.label}\` accounts for ${topShare}% of total ${measure}. Top three \`${dimension}\` values capture ${Math.round((series.slice(0, 3).reduce((acc, s) => acc + s.value, 0) / totalSum) * 100)}%.`

  return {
    question: prompt,
    generated_sql,
    chart_type,
    series,
    rows,
    insight,
    source: 'synth',
  }
}

interface AiProvider {
  generateText?: (args: { prompt: string; system?: string; maxTokens?: number }) => Promise<string>
  generate?: (args: { prompt: string; system?: string; maxTokens?: number }) => Promise<string>
}

const SYSTEM_PROMPT = `You are Clarion, a data analyst assistant. The user asks an analytical question.
Respond with a single JSON object (no prose, no markdown fences) matching this TypeScript shape:

{
  "generated_sql": "<SELECT statement, hypothetical-schema is fine>",
  "chart_type":    "bar" | "line" | "scatter" | "table",
  "series":        [{"label": "<short label>", "value": <number>}, ... up to 8 items],
  "rows":          [{"col": "<column name>", "values": [<string|number>, ... 8 items]}, ... 1-3 entries],
  "insight":       "<one sentence summary referencing concrete numbers from your series>"
}

Use realistic-looking-but-deterministic numbers. Never include the question itself in the JSON.`

async function tryAi(prompt: string): Promise<QueryResult | null> {
  const provider = get<AiProvider>('ai', 'anthropic')
  if (!provider) return null
  const fn = provider.generateText ?? provider.generate
  if (!fn) return null
  if (!process.env.ANTHROPIC_API_KEY) return null
  let text: string
  try {
    text = await fn({ prompt, system: SYSTEM_PROMPT, maxTokens: 1200 })
  } catch (err) {
    console.warn('queries.ts: AI call failed, falling back to synth.', err)
    return null
  }
  // Strip stray code fences if the model includes them despite the system prompt.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  try {
    const parsed = JSON.parse(cleaned) as Partial<QueryResult>
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.series) || !Array.isArray(parsed.rows)) return null
    return {
      question: prompt,
      generated_sql: String(parsed.generated_sql ?? ''),
      chart_type:
        parsed.chart_type === 'line' ||
        parsed.chart_type === 'scatter' ||
        parsed.chart_type === 'table'
          ? parsed.chart_type
          : 'bar',
      series: parsed.series.slice(0, 12).map((s) => ({
        label: String((s as { label?: unknown }).label ?? ''),
        value: Number((s as { value?: unknown }).value ?? 0) || 0,
      })),
      rows: parsed.rows.slice(0, 6).map((r) => ({
        col: String((r as { col?: unknown }).col ?? ''),
        values: Array.isArray((r as { values?: unknown }).values)
          ? (r as { values: unknown[] }).values
              .slice(0, 12)
              .map((v) => (typeof v === 'number' ? v : String(v)))
          : [],
      })),
      insight: String(parsed.insight ?? ''),
      source: 'ai',
    }
  } catch (err) {
    console.warn('queries.ts: AI returned malformed JSON, falling back to synth.', err)
    return null
  }
}

router.post('/', validateBody(askSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof askSchema>
  const aiResult = await tryAi(body.prompt)
  res.json(aiResult ?? synthesize(body.prompt))
})

export default router
