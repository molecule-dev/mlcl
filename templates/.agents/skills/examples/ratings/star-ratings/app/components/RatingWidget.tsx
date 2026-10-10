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

  // The same ticket discipline for the rating POSTs themselves: only the newest
  // may roll its optimistic star back or report a failure (see `rate`).
  const rateSeq = useRef(0)

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
    // A different subject's state must not be shown while its own loads: the
    // summary AND the viewer's own rating are per-subject. Leaving `myStars`
    // set made the new subject display the PREVIOUS subject's stars as the
    // viewer's rating (displayValue prefers myStars over the average).
    setAverage(null)
    setCount(0)
    setMyStars(null)
    setRateFailed(false)
    void loadSummary()
    return () => {
      // Invalidate whatever this subject still has in flight — including a
      // rating POST, whose failure rollback must not reach the new subject.
      summarySeq.current++
      rateSeq.current++
    }
  }, [loadSummary])

  async function rate(stars: number): Promise<void> {
    // Every rating takes a ticket so a SUPERSEDED request cannot write state:
    // clicking 3★ then 5★ starts two POSTs, and if the 3★ one fails last, its
    // rollback would restore the value from before the 3★ click (often "no
    // rating") even though the server recorded 5★. Only the newest may roll
    // back or report the failure.
    const ticket = ++rateSeq.current
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
        if (ticket !== rateSeq.current) return
        setMyStars(previous)
        setRateFailed(true)
        return
      }
      // Resync through the same ticketed loader the initial load uses, so this
      // refresh cannot be overtaken by — or overtake — another summary request.
      await loadSummary()
    } catch (_error) {
      if (ticket !== rateSeq.current) return
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
