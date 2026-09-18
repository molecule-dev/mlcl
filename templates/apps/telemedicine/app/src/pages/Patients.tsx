import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Patient {
  id: string
  name: string
  dob: string
  age: number
  sex: 'M' | 'F' | 'X'
  primary_concern: string
  last_visit: string | null
  next_visit: string | null
  flag: 'none' | 'overdue' | 'urgent' | 'new'
}

const FLAG_COLOR: Record<Patient['flag'], string> = {
  none: 'bg-surface-container text-on-surface',
  overdue: 'bg-warning-container text-on-warning-container',
  urgent: 'bg-error-container text-on-error-container',
  new: 'bg-info-container text-on-info-container',
}

export function Patients() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/patients')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Patient>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('patients.loadError', {}, { defaultValue: 'Failed to load patients.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.primary_concern.toLowerCase().includes(q),
    )
  }, [list, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('patients.eyebrow', {}, { defaultValue: 'Care roster' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('patients.heading', {}, { defaultValue: 'Patients' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'patients.subheading',
              { count: list.length },
              { defaultValue: '{{count}} active patients' },
            )}
          </p>
          {!loading && !error && list.length > 0
            ? (() => {
                const urgent = list.filter((p) => p.flag === 'urgent').length
                const overdue = list.filter((p) => p.flag === 'overdue').length
                const newCount = list.filter((p) => p.flag === 'new').length
                return (
                  <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
                    {urgent > 0 ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'bg-error-light text-error uppercase tracking-wider',
                        )}
                      >
                        {t(
                          'patients.urgentCount',
                          { count: urgent },
                          { defaultValue: '{{count}} urgent' },
                        )}
                      </span>
                    ) : null}
                    {overdue > 0 ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'bg-warning-light text-warning uppercase tracking-wider',
                        )}
                      >
                        {t(
                          'patients.overdueCount',
                          { count: overdue },
                          { defaultValue: '{{count}} overdue' },
                        )}
                      </span>
                    ) : null}
                    {newCount > 0 ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'bg-info-container text-on-info-container uppercase tracking-wider',
                        )}
                      >
                        {t(
                          'common.countNew',
                          { count: newCount },
                          { defaultValue: '{{count}} new' },
                        )}
                      </span>
                    ) : null}
                  </div>
                )
              })()
            : null}
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'patients.searchPlaceholder',
              {},
              { defaultValue: 'Search by name or concern…' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'border border-outline-variant rounded-md',
            )}
            style={{ minWidth: '260px' }}
          />
        </div>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('patients.empty', {}, { defaultValue: 'No patients match.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {visible.map((p) => (
            <li key={p.id}>
              <Link
                to={`/records?patient_id=${p.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'md' }),
                  'hover:bg-surface-container',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.h(11),
                    cm.w(11),
                    'rounded-full bg-primary-container text-on-primary-container shrink-0',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {p.name
                      .split(' ')
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}>
                    {p.name}{' '}
                    <span
                      className={cm.cn(
                        'text-on-surface-variant',
                        cm.fontWeight('normal'),
                        cm.textSize('sm'),
                      )}
                    >
                      · {p.age} · {p.sex}
                    </span>
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'truncate')}>
                    {p.primary_concern}
                  </p>
                </div>
                <div className={cm.cn(cm.shrink0, cm.textCenter)}>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {p.last_visit
                      ? t(
                          'patients.lastVisit',
                          { date: new Date(p.last_visit).toLocaleDateString() },
                          { defaultValue: 'Last {{date}}' },
                        )
                      : t('patients.firstVisit', {}, { defaultValue: 'First visit pending' })}
                  </p>
                  {p.next_visit && (
                    <p
                      className={cm.cn(cm.textSize('xs'), cm.textPrimary, cm.fontWeight('medium'))}
                    >
                      {t(
                        'patients.nextVisit',
                        { date: new Date(p.next_visit).toLocaleDateString() },
                        { defaultValue: 'Next {{date}}' },
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded shrink-0',
                    FLAG_COLOR[p.flag],
                  )}
                >
                  {t(`patients.flag.${p.flag}`, {}, { defaultValue: p.flag })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
