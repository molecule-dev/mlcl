import { useEffect, useState } from 'react'

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

  useEffect(() => {
    fetch(`/api/ratings/avg/${subjectId}`)
      .then((r) => r.json())
      // Coerce the body to the state's shape: an error body's undefined
      // average would crash the summary's toFixed on the next render.
      .then((d) => {
        setAverage(typeof d.average === 'number' ? d.average : null)
        setCount(typeof d.count === 'number' ? d.count : 0)
      })
      .catch(() => {
        // A failed load keeps the empty state (average stays null).
      })
  }, [subjectId])

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
      const r = (await (await fetch(`/api/ratings/avg/${subjectId}`)).json()) as {
        average?: number
        count?: number
      }
      setAverage(typeof r.average === 'number' ? r.average : null)
      setCount(typeof r.count === 'number' ? r.count : 0)
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
