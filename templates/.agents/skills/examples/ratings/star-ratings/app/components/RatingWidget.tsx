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

  useEffect(() => {
    fetch(`/api/ratings/avg/${subjectId}`)
      .then((r) => r.json())
      .then((d) => {
        setAverage(d.average)
        setCount(d.count)
      })
  }, [subjectId])

  async function rate(stars: number): Promise<void> {
    setMyStars(stars)
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, stars }),
    })
    const r = await fetch(`/api/ratings/avg/${subjectId}`).then((x) => x.json())
    setAverage(r.average)
    setCount(r.count)
  }

  const displayValue = myStars ?? Math.round(average ?? 0)

  return (
    <div className={cm.flex({ direction: 'row', gap: 'sm', align: 'center' })}>
      <RatingDisplay value={displayValue} onChange={canRate ? rate : undefined} />
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
