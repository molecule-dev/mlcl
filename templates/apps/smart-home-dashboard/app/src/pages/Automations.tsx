import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AutomationListItem, AutomationRow } from '../components/AutomationRow.js'
import { unwrapList } from '../utils/httpUnpack.js'

interface AutomationRecord {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  last_triggered?: string | null
  execution_count?: number | null
  trigger?: { label?: string; description?: string } | null
}

export function Automations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [automations, setAutomations] = useState<AutomationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/automations')
      .then((payload) => {
        if (cancelled) return
        const list = unwrapList<AutomationRecord>(payload)
        setAutomations(
          list.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? null,
            enabled: Boolean(r.enabled),
            last_triggered: r.last_triggered ?? null,
            execution_count: r.execution_count ?? 0,
            trigger_label: r.trigger?.label || r.trigger?.description || null,
          })),
        )
        setHasFetched(true)
      })
      .catch(() => {
        if (!cancelled) setHasFetched(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function toggleEnabled(id: string, currentlyEnabled: boolean) {
    const action = currentlyEnabled ? 'disable' : 'enable'
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !currentlyEnabled } : a)),
    )
    try {
      await http.post(`/api/automations/${id}/${action}`, {})
    } catch (error) {
      logError('automations.toggleEnabled', error)
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: currentlyEnabled } : a)),
      )
    }
  }

  async function trigger(id: string) {
    try {
      await http.post(`/api/automations/${id}/trigger`, {})
      setAutomations((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                last_triggered: new Date().toISOString(),
                execution_count: (a.execution_count ?? 0) + 1,
              }
            : a,
        ),
      )
    } catch (_error) {
      // intentional noop — trigger failure is transient; UI returns to previous state
    }
  }

  const visible = automations.filter((a) => {
    if (filter === 'on') return a.enabled
    if (filter === 'off') return !a.enabled
    return true
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(
          cm.flex({ direction: 'row', justify: 'between', align: 'end', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('automations.eyebrow', {}, { defaultValue: 'Routines' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('automations.heading', {}, { defaultValue: 'Automations' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'automations.subheading',
              {},
              { defaultValue: 'When this happens, do that — without the YAML.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'bg-surface-container-lowest rounded-full',
          )}
        >
          {(['all', 'on', 'off'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                filter === opt
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
                'uppercase tracking-widest transition-all',
              )}
              aria-pressed={filter === opt}
            >
              {t(`automations.filter.${opt}`, {}, { defaultValue: opt })}
            </button>
          ))}
          <Link
            to="/automations/new/edit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('ml', 2),
              'bg-primary-container text-on-primary-container uppercase tracking-widest hover:bg-primary/20',
            )}
          >
            {t('automations.newAutomation', {}, { defaultValue: '+ New' })}
          </Link>
        </div>
      </header>

      {loading && !hasFetched ? (
        <p
          data-testid="automations-loading"
          className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('automations.loading', {}, { defaultValue: 'Loading automations…' })}
        </p>
      ) : null}

      <section
        data-testid="automations-list"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
      >
        {visible.map((a) => (
          <AutomationRow key={a.id} automation={a} onToggle={toggleEnabled} onTrigger={trigger} />
        ))}
        {hasFetched && visible.length === 0 ? (
          <p
            data-testid="automations-empty"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {automations.length === 0
              ? t(
                  'automations.empty',
                  {},
                  { defaultValue: 'No automations yet — create your first routine.' },
                )
              : t('automations.emptyFiltered', {}, { defaultValue: 'No matching automations.' })}
          </p>
        ) : null}
      </section>
    </div>
  )
}
