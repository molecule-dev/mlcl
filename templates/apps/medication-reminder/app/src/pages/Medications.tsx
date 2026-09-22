import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Medication {
  id: string
  name: string
  generic_name: string | null
  dose_amount: string
  pill_color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow'
  pill_shape: 'round' | 'oval' | 'capsule' | 'square'
  schedule_summary: string
  count_remaining: number
  refill_due: string | null
  prescriber: string
}

const PILL_COLOR: Record<Medication['pill_color'], string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

export function Medications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/medications')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Medication>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('medications.loadError', {}, { defaultValue: 'Failed to load medications.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('medications.heading', {}, { defaultValue: 'Medications' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'medications.subheading',
              { count: list.length },
              { defaultValue: '{{count}} active medications' },
            )}
          </p>
        </div>
        <Link
          to="/medications/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('medications.addLabel', {}, { defaultValue: 'Add medication' })}
        </Link>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'medications.empty',
            {},
            { defaultValue: 'No medications yet. Add one to start tracking.' },
          )}
        </p>
      ) : (
        <ul className={cm.cn('space-y-2')}>
          {list.map((m) => (
            <li key={m.id}>
              <Link
                to={`/medications/${m.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.shrink0,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(14),
                    cm.w(14),
                    'rounded-full',
                  )}
                  style={{ backgroundColor: PILL_COLOR[m.pill_color], color: 'white' }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')}>medication</span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'truncate')}>
                    {m.name}
                    {m.generic_name ? (
                      <span
                        className={cm.cn(
                          'text-on-surface-variant',
                          cm.fontWeight('normal'),
                          cm.textSize('sm'),
                        )}
                      >
                        {' '}
                        · {m.generic_name}
                      </span>
                    ) : null}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
                    {m.dose_amount} · {m.schedule_summary}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'medications.prescriber',
                      { name: m.prescriber },
                      { defaultValue: 'Rx by {{name}}' },
                    )}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      m.count_remaining < 7 ? 'text-error' : '',
                    )}
                  >
                    {m.count_remaining}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('medications.remaining', {}, { defaultValue: 'remaining' })}
                  </p>
                  {m.refill_due && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        m.count_remaining < 7 ? 'text-warning' : 'text-on-surface-variant',
                        cm.fontWeight('medium'),
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'medications.refillBy',
                        { date: new Date(m.refill_due).toLocaleDateString() },
                        { defaultValue: 'Refill by {{date}}' },
                      )}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
