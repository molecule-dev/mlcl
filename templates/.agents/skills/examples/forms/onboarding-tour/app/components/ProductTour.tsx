import { useCallback, useEffect, useRef, useState } from 'react'

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
  /**
   * Whether a step was EVER on screen this mount.
   *
   * The walk below skips a step whose target is missing, and the last step's
   * missing target means "walked off the end, the tour is over". A page that
   * carries NONE of the anchors — the tour is mounted in a layout and the user
   * lands somewhere without the navigation/CTA it points at — then walked all
   * three steps and PERSISTED completion for a tour nobody saw: the dashboard
   * that does have the anchors never offers it again, because
   * `tour_completed_at` is now set. A tour that never appeared is not a tour
   * that finished.
   */
  const showedStep = useRef(false)

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

  /**
   * Whether this mount already started the completion write.
   *
   * `finish` has two callers — the Skip/Done buttons and the walk effect below —
   * and the walk runs on EVERY DOM mutation (that is what makes the tour follow
   * a route change). React commits the `setActive(false)` this schedules in a
   * LATER task, so every mutation batch that arrives before that commit still
   * finds the tour active with the last step's target missing and calls `finish`
   * again: a page that keeps mutating (a spinner, a poll, a toast) issued one
   * `PATCH /api/me` per batch. The completion write is not per-trigger, it is
   * per-mount.
   */
  const finishing = useRef(false)

  // Hooks first — no early return may sit above them.
  const finish = useCallback(async (): Promise<void> => {
    if (finishing.current) return
    finishing.current = true
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
    if (!active || typeof document === 'undefined') return
    const walk = (): void => {
      // No anchor AT ALL on this page: the reader is on a route the tour cannot
      // point at yet. Stay on the FIRST step and leave the tour pending — walking
      // here advanced `stepIdx` through all three steps and pinned it at the LAST
      // one, so the page the reader navigates to next could only ever render that
      // last step (or nothing at all, when its anchor is the missing one): the
      // "leave the tour pending so a page that does still runs it" this effect
      // exists for never happened.
      if (!STEPS.some((step) => document.querySelector(step.selector))) {
        setStepIdx(0)
        return
      }
      if (document.querySelector(STEPS[stepIdx].selector)) {
        showedStep.current = true
        return
      }
      if (stepIdx < STEPS.length - 1) {
        setStepIdx((s) => s + 1)
        return
      }
      // The LAST step's target is missing too, on a page that DOES carry other
      // anchors. Persist completion only when the reader actually saw a step (see
      // `showedStep`) — the walk skipped past the ones that were absent, so a
      // reader who saw none of them has not been shown the tour.
      if (!showedStep.current) return
      void finish()
    }
    walk()
    // The walk's input is the DOM's anchors, and React cannot express "the page
    // under this layout changed" as a dependency: the tour is mounted in a
    // LAYOUT, so a route change re-renders it while `active` and `stepIdx` stay
    // put — a dep-keyed effect (the previous shape) never re-ran, and once the
    // reader had landed on a page without the anchors the tour stayed invisible
    // for the rest of the session. Watching the document covers it: the anchors
    // arrive when the route's element commits, or later when that element
    // renders content it had to load. The walk converges — every branch either
    // changes `stepIdx`/`active` (which re-runs this effect) or returns without
    // touching state — so an observation cannot re-trigger itself.
    const observer = new MutationObserver(walk)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
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
