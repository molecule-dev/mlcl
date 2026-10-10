import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type TourStep = {
  selector: string // e.g. '[data-tour="nav-search"]'
  titleKey: string
  bodyKey: string
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav-search"]',
    titleKey: 'tour.search.title',
    bodyKey: 'tour.search.body',
  },
  { selector: '[data-tour="primary-cta"]', titleKey: 'tour.cta.title', bodyKey: 'tour.cta.body' },
  {
    selector: '[data-tour="settings"]',
    titleKey: 'tour.settings.title',
    bodyKey: 'tour.settings.body',
  },
]

export function ProductTour() {
  const { t } = useTranslation()
  const [stepIdx, setStepIdx] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    // `res.ok` gates the body: a 401 (signed out) or 500 still resolves with a
    // JSON body (`{ error }`), which `r.json()` parses happily and which carries
    // no `tour_completed_at` — so the tour would be OFFERED to a signed-out
    // visitor instead of staying hidden as the `.catch` below intends.
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((u: { tour_completed_at?: string | null }) => {
        if (!u.tour_completed_at) setActive(true)
      })
      .catch(() => {
        // A failed /api/me reads the same as "tour already completed": the
        // tour simply stays hidden. The rejection must not escape the effect.
      })
  }, [])

  // Hooks first — no early return may sit above them.
  const finish = useCallback(async (): Promise<void> => {
    setActive(false)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_completed_at: new Date().toISOString() }),
      })
    } catch (_error) {
      // The tour is already dismissed; a failed PATCH only means it re-offers
      // on the next visit. The rejection must not escape the click handler.
    }
  }, [])

  // Skip steps whose target isn't on screen, and finish the tour when the last
  // one's target is missing too. This decision lives in an EFFECT, not the
  // render body: the render-phase version called setState — and, on the last
  // step, `finish()`, whose PATCH /api/me fired DURING render. React may
  // render a component twice (StrictMode, concurrent rendering), so the
  // completion PATCH could run twice, and a discarded render must never reach
  // the network.
  useEffect(() => {
    if (!active) return
    if (document.querySelector(STEPS[stepIdx].selector)) return
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((s) => s + 1)
      return
    }
    void finish()
  }, [active, stepIdx, finish])

  if (!active) return null

  const step = STEPS[stepIdx]
  const target = typeof document !== 'undefined' ? document.querySelector(step.selector) : null
  if (!target) return null

  return (
    <div
      className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }))}
      style={{ zIndex: 50 }}
      role="dialog"
      aria-label={t('tour.label', undefined, { defaultValue: 'Quick tour' })}
    >
      <div
        className={cm.cn(
          cm.card(),
          cm.sp('p', 6),
          cm.maxW('md'),
          cm.flex({ direction: 'col', gap: 'md' }),
        )}
        style={{ width: '100%' }}
      >
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t(step.titleKey, undefined, { defaultValue: 'Tour step' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t(step.bodyKey, undefined, { defaultValue: '' })}
        </p>
        <div className={cm.flex({ direction: 'row', gap: 'sm', justify: 'between' })}>
          <button onClick={finish} className={cm.button({ variant: 'ghost', size: 'sm' })}>
            {t('tour.skip', undefined, { defaultValue: 'Skip' })}
          </button>
          {stepIdx < STEPS.length - 1 ? (
            <button
              onClick={() => setStepIdx((s) => s + 1)}
              className={cm.button({ variant: 'solid', size: 'sm' })}
            >
              {t('tour.next', undefined, { defaultValue: 'Next' })}
            </button>
          ) : (
            <button onClick={finish} className={cm.button({ variant: 'solid', size: 'sm' })}>
              {t('tour.done', undefined, { defaultValue: 'Done' })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
