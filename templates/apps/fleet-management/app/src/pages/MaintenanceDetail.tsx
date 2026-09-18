import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface MaintenanceDetail {
  id: string
  vehicle_plate: string
  vehicle_id: string
  type: string
  description: string
  scheduled_for: string
  status: string
  technician: string | null
  parts: { name: string; sku: string; cost: number; quantity: number }[]
  labor_hours: number
  labor_rate: number
  notes: string
  events: { id: string; timestamp: string; description: string }[]
}

export function MaintenanceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [item, setItem] = useState<MaintenanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/maintenance/${id}`)
      .then((res) => {
        if (!cancelled) setItem(unwrapSingle<MaintenanceDetail>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('maintenanceDetail.loadError', {}, { defaultValue: 'Failed to load work order.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!item)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('maintenanceDetail.notFound', {}, { defaultValue: 'Work order not found.' })}
      </p>
    )

  const partsCost = item.parts.reduce((s, p) => s + p.cost * p.quantity, 0)
  const laborCost = item.labor_hours * item.labor_rate
  const totalCost = partsCost + laborCost

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/maintenance"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('maintenanceDetail.backLink', {}, { defaultValue: 'All maintenance' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.fontWeight('medium'),
            'uppercase tracking-wider',
          )}
        >
          {t('maintenanceDetail.label', {}, { defaultValue: 'Work order' })} ·{' '}
          <span className="font-mono">{item.id}</span>
        </p>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
          {item.description}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
          <Link to={`/vehicles/${item.vehicle_id}`} className="font-mono underline">
            {item.vehicle_plate}
          </Link>
          {' · '}
          {item.type}
          {' · '}
          {t(
            'maintenanceDetail.scheduledFor',
            { date: new Date(item.scheduled_for).toLocaleDateString() },
            { defaultValue: 'Scheduled {{date}}' },
          )}
        </p>
        {item.technician && (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}>
            {t(
              'maintenanceDetail.technicianLabel',
              { name: item.technician },
              { defaultValue: 'Technician: {{name}}' },
            )}
          </p>
        )}
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
          )}
        >
          {t('maintenanceDetail.partsHeading', {}, { defaultValue: 'Parts' })}
        </h2>
        <ul className={'space-y-1'}>
          {item.parts.map((p, i) => (
            <li
              key={i}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
                style={{ width: '120px' }}
              >
                {p.sku}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'truncate')}>{p.name}</span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'shrink-0')}>
                ×{p.quantity}
              </span>
              <span
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'shrink-0 font-mono')}
              >
                ${(p.cost * p.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className={'border-t border-outline-variant pt-3 space-y-1'}>
          <KV
            label={t('maintenanceDetail.partsTotal', {}, { defaultValue: 'Parts total' })}
            value={`$${partsCost.toFixed(2)}`}
          />
          <KV
            label={t(
              'maintenanceDetail.laborLabel',
              { hours: item.labor_hours, rate: item.labor_rate },
              { defaultValue: 'Labor ({{hours}}h × ${{rate}}/h)' },
            )}
            value={`$${laborCost.toFixed(2)}`}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', justify: 'between' }),
              cm.fontWeight('bold'),
              cm.textSize('base'),
            )}
          >
            <span>{t('maintenanceDetail.totalLabel', {}, { defaultValue: 'Total estimate' })}</span>
            <span className="font-mono">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
            cm.sp('mb', 3),
          )}
        >
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </h2>
        <ol className={'space-y-2'}>
          {item.events.map((e) => (
            <li key={e.id} className={cm.flex({ align: 'start', gap: 'md' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
                style={{ width: '120px' }}
              >
                {new Date(e.timestamp).toLocaleDateString()}
              </span>
              <p className={cm.cn(cm.textSize('sm'))}>{e.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {item.notes && (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
              cm.sp('mb', 2),
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'whitespace-pre-wrap')}>{item.notes}</p>
        </section>
      )}
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span className={cm.cn(cm.textSize('sm'), 'font-mono')}>{value}</span>
    </div>
  )
}
