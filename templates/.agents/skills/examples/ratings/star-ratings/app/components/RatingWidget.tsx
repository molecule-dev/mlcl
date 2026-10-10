import { useCallback, useEffect, useRef, useState } from 'react'

import { RatingDisplay } from '@molecule/app-rating-display-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function RatingWidget({ subjectId, canRate }: { subjectId: string; canRate: boolean }) {
  const { t } = useTranslation()
  const [average, setAverage] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [myStars, setMyStars] = useState<number | null>(null)
  const [rateFailed, setRateFailed] = useState(false)

  // Every in-flight summary request takes a ticket; only the newest ticket may
  // write state. Two of these can overlap (a subject change, or the refresh a
  // rating triggers) and the LATE response would otherwise win, showing another
  // subject's average — or an average from before the rating the user just cast.
  const summarySeq = useRef(0)

  const loadSummary = useCallback(async (): Promise<void> => {
    const ticket = ++summarySeq.current
    try {
      const r = (await (await fetch(`/api/ratings/avg/${subjectId}`)).json()) as {
        average?: number
        count?: number
      }
      if (ticket !== summarySeq.current) return // superseded by a newer request
      // Coerce the body to the state's shape: an error body's undefined
      // average would crash the summary's toFixed on the next render.
      setAverage(typeof r.average === 'number' ? r.average : null)
      setCount(typeof r.count === 'number' ? r.count : 0)
    } catch (_error) {
      // A failed load keeps the last synced summary (or the empty state).
    }
  }, [subjectId])

  useEffect(() => {
    // A different subject's summary must not be shown while its own loads.
    setAverage(null)
    setCount(0)
    void loadSummary()
    return () => {
      // Invalidate whatever this subject still has in flight.
      summarySeq.current++
    }
  }, [loadSummary])

  async function rate(stars: number): Promise<void> {
    const previous = myStars
    setRateFailed(false)
    setMyStars(stars)
    // The optimistic star is rolled back when the POST fails — a rejected
    // fetch or a !ok response must not leave the rating lit as if it were
    // recorded. (The shared display's onChange discards the returned promise,
    // so an escaping rejection would be unhandled.)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId, stars }),
      })
      if (!res.ok) {
        setMyStars(previous)
        setRateFailed(true)
        return
      }
      // Resync through the same ticketed loader the initial load uses, so this
      // refresh cannot be overtaken by — or overtake — another summary request.
      await loadSummary()
    } catch (_error) {
      setMyStars(previous)
      setRateFailed(true)
    }
  }

  const displayValue = myStars ?? Math.round(average ?? 0)

  return (
    <div className={cm.flex({ direction: 'row', gap: 'sm', align: 'center' })}>
      <RatingDisplay value={displayValue} onChange={canRate ? rate : undefined} />
      {rateFailed ? (
        <span className={cm.cn(cm.textSize('sm'), cm.textError)}>
          {t('rating.rateFailed', undefined, { defaultValue: 'Not saved — try again' })}
        </span>
      ) : null}
      {average === null ? (
        <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('rating.empty', undefined, { defaultValue: 'No ratings yet — be the first' })}
        </span>
      ) : (
        <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t(
            'rating.summary',
            { average: average.toFixed(1), count },
            {
              defaultValue: '{{average}} ({{count}} reviews)',
            },
          )}
        </span>
      )}
    </div>
  )
}
