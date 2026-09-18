import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function SessionSummary() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { deckId = '' } = useParams<{ deckId: string }>()

  return (
    <div
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 16),
        cm.maxW('2xl'),
        cm.mxAuto,
        cm.textCenter,
        'space-y-6',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {t('sessionSummary.label', {}, { defaultValue: 'Session complete' })}
      </p>
      <h1
        className={cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'))}
        style={{ color: 'var(--mol-color-primary)' }}
      >
        {t('sessionSummary.heading', {}, { defaultValue: 'Well done.' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant', cm.maxW('2xl'), cm.mxAuto)}>
        {t(
          'sessionSummary.body',
          {},
          {
            defaultValue:
              'Memory rewards consistency, not heroic effort. The 14 minutes you spent today are worth more than 4 hours next week.',
          },
        )}
      </p>
      <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'center' })}>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'border border-outline-variant rounded-md',
          )}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
        <Link
          to={`/decks/${deckId}`}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('sessionSummary.deckLink', {}, { defaultValue: 'Back to deck' })}
        </Link>
      </div>
    </div>
  )
}
