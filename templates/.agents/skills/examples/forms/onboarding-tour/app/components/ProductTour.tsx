import { useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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
    fetch('/api/me')
      .then((r) => r.json())
      .then((u: { tour_completed_at?: string | null }) => {
        if (!u.tour_completed_at) setActive(true)
      })
  }, [])

  if (!active) return null

  async function finish(): Promise<void> {
    setActive(false)
    await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tour_completed_at: new Date().toISOString() }),
    })
  }

  const step = STEPS[stepIdx]
  const target = typeof document !== 'undefined' ? document.querySelector(step.selector) : null
  if (!target) {
    // Skip steps whose target isn't on screen.
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((s) => s + 1)
      return null
    }
    void finish()
    return null
  }

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
