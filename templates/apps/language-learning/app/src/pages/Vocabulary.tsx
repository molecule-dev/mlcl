import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VocabReviewCard, type VocabWord } from '../components/VocabReviewCard.js'

interface BackendVocab {
  id: string
  word: string
  pronunciation: string | null
  translation: string | null
  example: string | null
  language_code?: string | null
  mastery: number | string
  next_review_iso: string
}

const FILTERS = ['All', 'Due today', 'Mastered', 'Struggling'] as const

function clampMastery(n: number): VocabWord['mastery'] {
  const i = Math.max(0, Math.min(5, Math.round(n)))
  return i as VocabWord['mastery']
}

function adapt(row: BackendVocab): VocabWord {
  return {
    id: String(row.id),
    word: String(row.word ?? ''),
    pronunciation: String(row.pronunciation ?? ''),
    translation: String(row.translation ?? ''),
    example: String(row.example ?? ''),
    mastery: clampMastery(Number(row.mastery ?? 0)),
    nextReviewIso: row.next_review_iso
      ? String(row.next_review_iso).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  }
}

export function Vocabulary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const load = (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    return http
      .get<BackendVocab[] | { data: BackendVocab[] }>('/api/vocabulary')
      .then((res: unknown) => {
        if (signal?.cancelled) return
        const body =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data: BackendVocab[] | { data: BackendVocab[] } }).data
            : (res as BackendVocab[])
        const list = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: unknown })?.data)
            ? (body as { data: BackendVocab[] }).data
            : []
        setItems(list.map(adapt))
      })
      .catch(() => {
        if (!signal?.cancelled)
          setError(t('vocabulary.loadError', {}, { defaultValue: 'Could not load vocabulary.' }))
      })
      .finally(() => {
        if (!signal?.cancelled) setLoading(false)
      })
  }

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => {
      signal.cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const filtered = useMemo(
    () =>
      items.filter((word) => {
        if (activeFilter === 'Due today') return word.nextReviewIso <= today
        if (activeFilter === 'Mastered') return word.mastery >= 4
        if (activeFilter === 'Struggling') return word.mastery <= 2
        return true
      }),
    [items, activeFilter, today],
  )

  const dueCount = items.filter((w) => w.nextReviewIso <= today).length
  const masteredCount = items.filter((w) => w.mastery >= 4).length

  const handleReview = async (word: VocabWord, correct: boolean) => {
    setReviewingId(word.id)
    try {
      await http.post(`/api/vocabulary/${encodeURIComponent(word.id)}/review`, { correct })
      await load()
    } catch (_error) {
      // Surface inline error; failure is communicated to the user via setError.
      setError(t('vocabulary.reviewError', {}, { defaultValue: 'Could not save review.' }))
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
          {t('vocabulary.eyebrow', {}, { defaultValue: 'Spaced repetition' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('vocabulary.heading', {}, { defaultValue: 'Your living vocabulary' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-xl')}>
          {t(
            'vocabulary.subheading',
            {},
            {
              defaultValue:
                'Each word resurfaces on a curve. The harder it is, the sooner it returns.',
            },
          )}
        </p>
      </header>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </p>
      )}

      {/* KPI chips. */}
      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/30',
          )}
        >
          <p className={cm.cn('font-black uppercase tracking-widest text-[10px] opacity-80')}>
            {t('vocabulary.totalLabel', {}, { defaultValue: 'Total words' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tighter tabular-nums mt-1',
            )}
            data-testid="vocab-total"
          >
            {items.length}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border-l-4 border-secondary shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'font-black uppercase tracking-widest text-[10px] text-on-surface-variant',
            )}
          >
            {t('vocabulary.dueLabel', {}, { defaultValue: 'Due today' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tighter tabular-nums mt-1 text-secondary',
            )}
            data-testid="vocab-due"
          >
            {dueCount}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border-l-4 border-success shadow-sm',
          )}
        >
          <p
            className={cm.cn(
              'font-black uppercase tracking-widest text-[10px] text-on-surface-variant',
            )}
          >
            {t('vocabulary.masteredLabel', {}, { defaultValue: 'Mastered' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tighter tabular-nums mt-1 text-success',
            )}
            data-testid="vocab-mastered"
          >
            {masteredCount}
          </p>
        </div>
      </section>

      {/* Filter pills. */}
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            aria-pressed={activeFilter === f}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'transition-all',
              activeFilter === f
                ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30',
            )}
          >
            {t(`vocabulary.filter.${f}`, {}, { defaultValue: f })}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('vocabulary.loading', {}, { defaultValue: 'Loading vocabulary…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'vocabulary.empty',
            {},
            { defaultValue: 'Nothing in this bucket — pick another filter.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
          {filtered.map((w) => (
            <VocabReviewCard
              key={w.id}
              word={w}
              disabled={reviewingId === w.id}
              onReviewCorrect={() => handleReview(w, true)}
              onReviewWrong={() => handleReview(w, false)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Vocabulary
