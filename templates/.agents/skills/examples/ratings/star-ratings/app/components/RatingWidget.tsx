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
  // Whether the last summary load FAILED. Without it a failed load was
  // indistinguishable from an empty subject: the catch kept "the empty state",
  // so a 500 (or an offline fetch) on the first load rendered "No ratings yet —
  // be the first" over a subject that has ratings. The flag is only shown when
  // there is no synced summary to keep (a failed REFRESH must not replace one).
  const [summaryFailed, setSummaryFailed] = useState(false)

  // Every in-flight summary request takes a ticket; only the newest ticket may
  // write state. Two of these can overlap (a subject change, or the refresh a
  // rating triggers) and the LATE response would otherwise win, showing another
  // subject's average — or an average from before the rating the user just cast.
  const summarySeq = useRef(0)

  // The same ticket discipline for the rating POSTs themselves: only the newest
  // may roll its optimistic star back or report a failure (see `rate`).
  const rateSeq = useRef(0)

  // The star value the SERVER last recorded (null = no rating), or null while
  // nothing has been confirmed for this subject. The failure rollback below
  // restores THIS, never the click-time value: `previous` (what the rollback
  // used to restore) was read from `myStars`, which by then may itself be an
  // OPTIMISTIC value from an earlier POST that also failed — clicking 3★ then
  // 5★ with both POSTs failing rolled back to 3★, a rating nothing ever
  // recorded. The recorded value is set only by a successful POST (and reset
  // with the rest of the subject's state below), so a rollback restores what
  // the server actually has.
  const recordedStars = useRef<number | null>(null)

  // The subject the CURRENT render belongs to. A rating cast on subject A must
  // not resync into subject B's state when the user switches subjects while
  // the POST is in flight: the ticket only serializes against EARLIER
  // requests, so A's trailing summary refresh would take the NEWEST ticket and
  // overwrite B's summary with A's average.
  const mountedForRef = useRef(subjectId)
  mountedForRef.current = subjectId

  const loadSummary = useCallback(async (): Promise<void> => {
    const ticket = ++summarySeq.current
    try {
      const res = await fetch(`/api/ratings/avg/${subjectId}`)
      // A non-2xx is a FAILED load, not an empty subject: a 500 whose body is
      // `{ error }` still parses, so without this gate its missing fields
      // reached state as "no average, no count" and the widget replaced the
      // summary with "No ratings yet — be the first" over a subject that has
      // ratings (and that the reader may have just voted on). Same rule the
      // sibling slices apply to their own loads, and the one the catch below
      // documents.
      if (!res.ok) {
        if (ticket === summarySeq.current) setSummaryFailed(true)
        return
      }
      const r = (await res.json()) as {
        average?: number | null
        count?: number
      }
      if (ticket !== summarySeq.current) return // superseded by a newer request
      // A 2xx proves the route ANSWERED, not that the body is the summary: `{}`
      // (the mock server's unmatched-fixture answer) and a proxy's rewrite both
      // parse. Installed as state they read as "no ratings" — the same wrong
      // answer as the failed load above.
      //
      // `average: null` with a numeric `count` is NOT one of those bodies: it is
      // the real handler's answer for a subject nobody has rated yet
      // (`api/handlers/ratings.ts` answers `{ average: null, count: 0 }`).
      // Requiring a NUMBER average rejected it, so every unrated subject showed
      // "Could not load the ratings — refresh to try again." and the empty state
      // below it was unreachable.
      if (typeof r.count !== 'number' || (r.average !== null && typeof r.average !== 'number')) {
        setSummaryFailed(true)
        return
      }
      setSummaryFailed(false)
      setAverage(r.average)
      setCount(r.count)
    } catch (_error) {
      // A failed load keeps the last synced summary — and, when there is none to
      // keep, says the load failed instead of "No ratings yet" (see
      // summaryFailed).
      if (ticket === summarySeq.current) setSummaryFailed(true)
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
    setSummaryFailed(false)
    // Nothing is recorded for the new subject yet — a rollback here must land
    // on "no rating", never on the previous subject's value.
    recordedStars.current = null
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
    // rollback would restore a value from before the 3★ click even though the
    // server recorded 5★. Only the newest may roll back or report the failure.
    const ticket = ++rateSeq.current
    setRateFailed(false)
    setMyStars(stars)
    // The optimistic star is rolled back when the POST fails — a rejected
    // fetch or a !ok response must not leave the rating lit as if it were
    // recorded. The rollback lands on the last SERVER-RECORDED value (see
    // recordedStars), never on the click-time `myStars`: between this click
    // and its failure that value may itself have been optimistic — and if the
    // earlier POST that set it also failed, restoring it shows a rating the
    // server never kept. (The shared display's onChange discards the returned
    // promise, so an escaping rejection would be unhandled.)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: subjectId, stars }),
      })
      if (!res.ok) {
        if (ticket !== rateSeq.current) return
        setMyStars(recordedStars.current)
        setRateFailed(true)
        return
      }
      // The user switched subjects while the POST ran: the rating landed on
      // the subject we LEFT, whose state this render no longer owns —
      // refreshing here would take the newest ticket and overwrite the new
      // subject's summary with the old one's (see mountedForRef). The recorded
      // value stays the new subject's too: this success belongs to the old one.
      if (mountedForRef.current !== subjectId) return
      recordedStars.current = stars
      // Resync through the same ticketed loader the initial load uses, so this
      // refresh cannot be overtaken by — or overtake — another summary request.
      await loadSummary()
    } catch (_error) {
      if (ticket !== rateSeq.current) return
      setMyStars(recordedStars.current)
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
      {average === null && summaryFailed ? (
        <span
          className={cm.cn(cm.textSize('sm'), cm.textError)}
          data-mol-id="rating-summary-failed"
        >
          {t('rating.summaryFailed', undefined, {
            defaultValue: 'Could not load the ratings — refresh to try again.',
          })}
        </span>
      ) : average === null ? (
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
