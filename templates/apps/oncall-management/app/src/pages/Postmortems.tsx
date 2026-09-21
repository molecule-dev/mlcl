import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface IncidentOption {
  id: string
  title: string
  service: string
}

interface PostmortemRow {
  id: string
  incident_id: string
  title: string
  summary: string
  contributing_factors: string[]
  status: 'draft' | 'published'
  open_action_items: number
  incident: {
    id: string
    title: string
    severity: Severity
    status: string
    service: string
    triggered_at: string
    resolved_at: string | null
  } | null
}

export function Postmortems() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [postmortems, setPostmortems] = useState<PostmortemRow[]>([])
  const [incidents, setIncidents] = useState<IncidentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incidentId, setIncidentId] = useState('')

  const refetch = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/postmortems')
      .then((res) => setPostmortems(unwrapList<PostmortemRow>(res)))
      .catch(() =>
        setError(t('postmortems.loadError', {}, { defaultValue: "Couldn't load postmortems." })),
      )
      .finally(() => setLoading(false))
  }, [http, t])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    http
      .get('/api/incidents?status=resolved&limit=100')
      .then((res) => {
        setIncidents(
          unwrapList<IncidentOption>(res).map((i) => ({
            id: i.id,
            title: i.title,
            service: i.service,
          })),
        )
      })
      .catch(() => {})
  }, [http])

  /** Resolved incidents that don't have a postmortem yet. */
  const candidates = useMemo(() => {
    const withPm = new Set(postmortems.map((pm) => pm.incident_id))
    return incidents.filter((i) => !withPm.has(i.id))
  }, [incidents, postmortems])

  const onCreate = async () => {
    if (!incidentId) return
    setSaving(true)
    setError(null)
    try {
      const res = await http.post('/api/postmortems', { incident_id: incidentId })
      const created = res.data as { id?: string } | undefined
      setIncidentId('')
      if (created?.id) {
        void track({
          name: 'postmortem.created',
          properties: { postmortem_id: created.id, incident_id: incidentId },
        })
        navigate(`/postmortems/${created.id}`)
        return
      }
      await refetch()
    } catch (_error) {
      setError(t('postmortems.createError', {}, { defaultValue: "Couldn't start the postmortem." }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('postmortems.eyebrow', {}, { defaultValue: '$ klaxon retro ls' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('nav.postmortems', {}, { defaultValue: 'Postmortems' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'postmortems.subheading',
            {},
            { defaultValue: 'Blameless reviews: what broke, why, and who is fixing it.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('postmortems.loading', {}, { defaultValue: 'Loading postmortems…' })}
        </p>
      ) : postmortems.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            history_edu
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'postmortems.empty',
              {},
              { defaultValue: 'No postmortems yet — resolve an incident and write the first one.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-4 mb-8')}>
          {postmortems.map((pm) => (
            <li key={pm.id}>
              <Link
                to={`/postmortems/${pm.id}`}
                data-mol-id={`postmortem-card-${pm.id}`}
                className={cm.cn('block rounded-xl p-5 transition-all hover:-translate-y-0.5')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className={cm.cn('flex items-center gap-2 flex-wrap mb-2')}>
                  <span
                    className={cm.cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor:
                        pm.status === 'published'
                          ? 'var(--color-severity-resolved-light)'
                          : 'var(--color-severity-warning-light)',
                      color:
                        pm.status === 'published'
                          ? 'var(--color-severity-resolved)'
                          : 'var(--color-severity-warning)',
                    }}
                  >
                    {pm.status}
                  </span>
                  {pm.incident ? <SeverityPill severity={pm.incident.severity} /> : null}
                  {pm.open_action_items > 0 ? (
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: 'var(--color-severity-new-light)',
                        color: 'var(--color-severity-new)',
                      }}
                    >
                      {t(
                        'postmortems.openItems',
                        { count: pm.open_action_items },
                        { defaultValue: '{{count}} open item(s)' },
                      )}
                    </span>
                  ) : null}
                </div>
                <h2
                  className={cm.cn('text-lg font-bold tracking-tight')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {pm.title}
                </h2>
                <p
                  className={cm.cn('mt-1 text-sm line-clamp-2 max-w-3xl')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {pm.summary}
                </p>
                {pm.incident ? (
                  <p
                    className={cm.cn('mt-2 font-mono text-[11px]')}
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {pm.incident.service} · {pm.contributing_factors.length}{' '}
                    {t('postmortems.factors', {}, { defaultValue: 'contributing factors' })}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section
        className={cm.cn('rounded-xl p-5')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2
          className={cm.cn('text-lg font-bold tracking-tight mb-2')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('postmortems.startNew', {}, { defaultValue: 'Start a postmortem' })}
        </h2>
        <p className={cm.cn('text-sm mb-4')} style={{ color: 'var(--color-text-secondary)' }}>
          {t(
            'postmortems.startHint',
            {},
            { defaultValue: 'Pick a resolved incident without a review yet.' },
          )}
        </p>
        {candidates.length === 0 ? (
          <p
            className={cm.cn('font-mono text-xs')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'postmortems.noCandidates',
              {},
              { defaultValue: 'Every resolved incident already has a postmortem.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
            <select
              value={incidentId}
              onChange={(e) => setIncidentId(e.target.value)}
              aria-label={t('postmortems.pickIncident', {}, { defaultValue: 'Pick an incident' })}
              className={cm.cn('px-3 py-2 rounded-md text-sm outline-none flex-1 min-w-[16rem]')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-mol-id="postmortem-incident-select"
            >
              <option value="">
                {t(
                  'postmortems.pickIncidentOption',
                  {},
                  { defaultValue: 'Pick a resolved incident…' },
                )}
              </option>
              {candidates.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!incidentId || saving}
              onClick={onCreate}
              data-mol-id="postmortem-create-submit"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
              )}
              style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
            >
              {saving
                ? t('postmortems.creating', {}, { defaultValue: 'Creating…' })
                : t('postmortems.createSubmit', {}, { defaultValue: 'Create postmortem' })}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
