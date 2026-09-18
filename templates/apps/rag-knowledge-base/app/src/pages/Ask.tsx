import { useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnswerCard, type AnswerCitation } from '../components/AnswerCard.js'
import { EngramHeroCard } from '../components/EngramHeroCard.js'
import { EngramMetricTile } from '../components/EngramMetricTile.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface AskStats {
  questions_today: number
  questions_change_pct: number
  avg_relevance_pct: number
  avg_response_ms: number
  cited_docs_today: number
  history_7d?: Array<{ date: string; count: number }>
}

interface QAEntryRecord {
  id: string
  question: string
  answer?: string
  answer_md?: string
  paragraphs?: string[]
  citations?: AnswerCitation[]
  response_time_ms?: number
  response_ms?: number
  model?: string
  created_at: string
}

interface CurrentAnswer {
  question: string
  paragraphs: string[]
  citations: AnswerCitation[]
  responseTime?: string
  modelName?: string
}

const EMPTY_STATS: AskStats = {
  questions_today: 0,
  questions_change_pct: 0,
  avg_relevance_pct: 0,
  avg_response_ms: 0,
  cited_docs_today: 0,
  history_7d: [],
}

const SAMPLE_PROMPTS = [
  { key: 'refund', defaultText: 'What\u2019s our refund policy for annual customers?' },
  { key: 'sla', defaultText: 'What SLA do we promise for enterprise plans?' },
  { key: 'data', defaultText: 'How is customer data handled when an account is deleted?' },
  { key: 'oauth', defaultText: 'How does our OAuth callback flow work?' },
] as const

function entryToAnswer(entry: QAEntryRecord): CurrentAnswer {
  const responseMs = entry.response_time_ms ?? entry.response_ms
  const fallbackBody = entry.answer ?? entry.answer_md ?? ''
  const paragraphs =
    entry.paragraphs && entry.paragraphs.length
      ? entry.paragraphs
      : fallbackBody
        ? fallbackBody
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
        : []
  return {
    question: entry.question,
    paragraphs,
    citations: entry.citations ?? [],
    responseTime: responseMs ? `${responseMs} ms` : undefined,
    modelName: entry.model,
  }
}

export function Ask() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [question, setQuestion] = useState('')
  const [stats, setStats] = useState<AskStats>(EMPTY_STATS)
  const [answer, setAnswer] = useState<CurrentAnswer | null>(null)
  const [recent, setRecent] = useState<QAEntryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refreshStatsAndHistory = () =>
    Promise.all([
      http.get('/api/qa/stats').catch(() => null),
      http.get('/api/qa/history').catch(() => null),
    ]).then(([sRes, hRes]) => {
      const fetchedStats = unwrapSingle<AskStats>(sRes)
      const fetchedHistory = unwrapList<QAEntryRecord>(hRes)
      if (fetchedStats) setStats(fetchedStats)
      setRecent(fetchedHistory.slice(0, 5))
      // Surface the most recent answer so a returning user sees their last
      // question instead of an empty hero card.
      if (!answer && fetchedHistory.length) {
        setAnswer(entryToAnswer(fetchedHistory[0]))
      }
    })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/qa/stats').catch(() => null),
      http.get('/api/qa/history').catch(() => null),
    ]).then(([sRes, hRes]) => {
      if (cancelled) return
      const fetchedStats = unwrapSingle<AskStats>(sRes)
      const fetchedHistory = unwrapList<QAEntryRecord>(hRes)
      if (fetchedStats) setStats(fetchedStats)
      setRecent(fetchedHistory.slice(0, 5))
      if (fetchedHistory.length) {
        setAnswer(entryToAnswer(fetchedHistory[0]))
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  async function ask(q: string) {
    if (!q.trim()) return
    setAskError(null)
    setLoading(true)
    try {
      const res = await http.post('/api/qa/ask', { question: q.trim() })
      const entry = unwrapSingle<QAEntryRecord>(res)
      if (entry) {
        setAnswer(entryToAnswer(entry))
        await refreshStatsAndHistory()
      } else {
        setAskError(
          t(
            'ask.error.noAnswer',
            {},
            { defaultValue: 'The model returned no answer. Please try again.' },
          ),
        )
      }
    } catch (err) {
      setAskError(
        err instanceof Error
          ? err.message
          : t('ask.error.failed', {}, { defaultValue: 'Failed to reach the assistant.' }),
      )
    } finally {
      setLoading(false)
      setQuestion('')
    }
  }

  const view = stats

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('ask.eyebrow', {}, { defaultValue: 'Today \u00b7 Semantic Q&A' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('ask.heading', {}, { defaultValue: 'Ask your knowledge base' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'ask.subheading',
            {},
            {
              defaultValue:
                'Plain-language questions in. Cited answers out. Hover any source to preview the matching chunk.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(question)
          }}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            'rounded-full bg-surface-container border-2 border-outline-variant focus-within:border-primary focus-within:shadow-md transition-all',
          )}
          data-testid="ask-form"
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            style={{ fontSize: 24 }}
            aria-hidden="true"
          >
            manage_search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t(
              'ask.placeholder',
              {},
              { defaultValue: 'Ask anything about your knowledge base\u2026' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.fontWeight('medium'),
              'bg-transparent border-none focus:ring-0 outline-none text-on-surface placeholder:text-outline/60 text-lg py-3',
            )}
            disabled={loading}
            data-testid="ask-input"
          />
          <kbd
            className={cm.cn(
              cm.textSize('xs'),
              'hidden sm:inline-block rounded-md bg-surface-container-high px-2 py-0.5 font-mono text-on-surface-variant',
            )}
          >
            {t('ask.shortcut', {}, { defaultValue: '\u2318K' })}
          </kbd>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            data-testid="ask-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full text-white shrink-0 hover:opacity-90 disabled:opacity-50 transition-opacity bg-primary',
            )}
          >
            {loading
              ? t('ask.searching', {}, { defaultValue: 'Searching\u2026' })
              : t('ask.submit', {}, { defaultValue: 'Ask' })}
          </button>
        </form>

        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 4))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest font-bold text-on-surface-variant mr-2 self-center',
            )}
            style={{ fontSize: 10 }}
          >
            {t('ask.tryLabel', {}, { defaultValue: 'Try' })}
          </span>
          {SAMPLE_PROMPTS.map((p) => {
            const text = t(`ask.sample.${p.key}`, {}, { defaultValue: p.defaultText })
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setQuestion(text)
                  inputRef.current?.focus()
                }}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded-full font-semibold border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
                )}
              >
                {text}
              </button>
            )
          })}
        </div>

        {askError ? (
          <p
            data-testid="ask-error"
            className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error')}
          >
            {askError}
          </p>
        ) : null}
      </section>

      <section
        className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
      >
        <EngramHeroCard
          questionsAnswered={view.questions_today}
          changePercent={view.questions_change_pct}
          avgRelevance={view.avg_relevance_pct}
          history={view.history_7d}
        />
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:col-span-4')}>
          <EngramMetricTile
            label={t('ask.metric.relevance', {}, { defaultValue: 'Top-1 relevance' })}
            value={`${view.avg_relevance_pct.toFixed(1)}%`}
            icon="verified"
            tone="success"
            meter={view.avg_relevance_pct}
          />
          <EngramMetricTile
            label={t('ask.metric.latency', {}, { defaultValue: 'P50 latency' })}
            value={`${view.avg_response_ms} ms`}
            icon="bolt"
            tone="info"
            caption={t(
              'ask.metric.latencyCaption',
              {},
              { defaultValue: 'Embedding + retrieval + generation' },
            )}
          />
        </div>
      </section>

      {answer ? (
        <div data-testid="ask-answer">
          <AnswerCard
            question={answer.question}
            paragraphs={answer.paragraphs}
            citations={answer.citations}
            responseTime={answer.responseTime}
            modelName={answer.modelName}
          />
        </div>
      ) : (
        <div
          data-testid="ask-empty"
          className={cm.cn(
            cm.sp('py', 16),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
            'rounded-3xl border border-dashed border-outline-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            style={{ fontSize: 48 }}
            aria-hidden="true"
          >
            forum
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'ask.empty',
              {},
              {
                defaultValue:
                  'Ask a question to see a cited answer drawn from your indexed documents.',
              },
            )}
          </p>
        </div>
      )}

      {recent.length > 0 ? (
        <section className={cm.stack(4)}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
            {t('ask.recent.heading', {}, { defaultValue: 'Recent questions' })}
          </h2>
          <ul data-testid="ask-recent" className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {recent.map((r) => (
              <li
                key={r.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
                )}
              >
                <p
                  className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface line-clamp-1')}
                >
                  {r.question}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant line-clamp-2',
                  )}
                >
                  {r.answer ?? r.answer_md ?? ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
