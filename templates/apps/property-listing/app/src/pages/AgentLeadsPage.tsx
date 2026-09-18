/**
 * AgentLeadsPage — `/admin/leads`
 *
 * Lists buyer/renter contact requests addressed to the authenticated agent
 * (rows in the `leads` table where agent_id = session.userId). Includes a
 * status filter, a search box (matches name/email/property), and an
 * inline status update via PUT /api/leads/:id.
 *
 * Backend wiring:
 *   - GET /api/leads?status=...
 *   - PUT /api/leads/:id  { status }
 *   - DELETE /api/leads/:id
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TopAppBar from '../components/TopAppBar.js'

interface Lead {
  id: string
  agent_id?: string
  property_id?: string | null
  name: string
  email: string
  phone?: string
  message?: string
  source?: string
  status: 'new' | 'contacted' | 'qualified' | 'lost'
  created_at?: string
}

const STATUS_OPTIONS: Array<Lead['status'] | 'all'> = [
  'all',
  'new',
  'contacted',
  'qualified',
  'lost',
]

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (res && typeof res === 'object') {
    const inner = (res as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
    if (inner && typeof inner === 'object' && Array.isArray((inner as { data?: unknown }).data)) {
      return (inner as { data: T[] }).data
    }
  }
  return []
}

function statusBadgeClass(status: Lead['status'], cm: ReturnType<typeof getClassMap>): string {
  switch (status) {
    case 'new':
      return cm.cn('bg-secondary-container text-on-secondary-container')
    case 'contacted':
      return cm.cn('bg-warning-light text-warning')
    case 'qualified':
      return cm.cn('bg-success-light text-success')
    case 'lost':
      return cm.cn('bg-rose-100 text-error')
    default:
      return cm.cn('bg-surface-secondary text-foreground')
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function AgentLeadsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url =
        filter === 'all' ? '/api/leads?limit=200' : `/api/leads?status=${filter}&limit=200`
      const res = await http.get(url)
      setLeads(unwrapList<Lead>(res))
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to load leads')
      setError(t('leads.loadError', {}, { defaultValue: 'Unable to load leads.' }))
    } finally {
      setLoading(false)
    }
  }, [http, filter, t])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.message ?? '').toLowerCase().includes(q),
    )
  }, [leads, search])

  const updateStatus = async (id: string, status: Lead['status']) => {
    setBusyId(id)
    const previous = leads
    setLeads((xs) => xs.map((l) => (l.id === id ? { ...l, status } : l)))
    try {
      await http.put(`/api/leads/${id}`, { status })
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to update lead status')
      setLeads(previous)
      alert(t('leads.updateError', {}, { defaultValue: 'Failed to update lead.' }))
    } finally {
      setBusyId(null)
    }
  }

  const deleteLead = async (id: string) => {
    if (!window.confirm(t('leads.deleteConfirm', {}, { defaultValue: 'Delete this lead?' }))) return
    setBusyId(id)
    const previous = leads
    setLeads((xs) => xs.filter((l) => l.id !== id))
    try {
      await http.delete(`/api/leads/${id}`)
    } catch (err: unknown) {
      logError(err instanceof Error ? err : 'Failed to delete lead')
      setLeads(previous)
      alert(t('leads.deleteError', {}, { defaultValue: 'Failed to delete lead.' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')} data-mol-id="page-agent-leads">
      <h1 className={cm.srOnly}>{t('agentLeads.pageTitle', {}, { defaultValue: 'Leads' })}</h1>
      <SideNavBar />
      <TopAppBar />
      <main className={cm.cn(cm.sp('pr', 12), 'pl-64 pb-20 pt-8')}>
        <div className={cm.stack(8)}>
          <header className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-on-surface',
                )}
              >
                {t('leads.heading', {}, { defaultValue: 'Leads' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'leads.subheading',
                  {},
                  { defaultValue: 'Inquiries from prospective buyers and renters.' },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-success')}>
              {leads.length}
            </div>
          </header>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
            <div className={cm.cn('flex-1 min-w-64 relative')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline',
                )}
              >
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.roundedFull,
                  'bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 transition-all',
                )}
                placeholder={t('leads.searchPlaceholder', {}, { defaultValue: 'Search leads…' })}
                type="text"
                data-mol-id="leads-search"
              />
            </div>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                data-mol-id={`filter-${opt}`}
                className={cm.cn(
                  'px-5 py-2 rounded-full text-sm font-semibold transition-colors',
                  filter === opt
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-success-light',
                )}
              >
                {opt === 'all' ? t('status.all', {}, { defaultValue: 'All' }) : opt}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              className={cm.cn(cm.flex({ justify: 'center', align: 'center' }), cm.sp('py', 16))}
            >
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  'border-4 border-emerald-600 border-t-transparent animate-spin',
                )}
                aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
              />
            </div>
          ) : error ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-xl bg-error-container text-on-error-container',
              )}
              role="alert"
            >
              <p className={cm.fontWeight('semibold')}>{error}</p>
              <button
                onClick={fetchLeads}
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'bg-primary text-on-primary rounded-xl hover:opacity-90',
                )}
              >
                {t('common.retry', {}, { defaultValue: 'Retry' })}
              </button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
                'rounded-xl bg-surface-container-low text-on-surface-variant text-center',
              )}
              data-mol-id="empty-leads"
            >
              <span className={cm.cn('material-symbols-outlined text-5xl text-success/30')}>
                inbox
              </span>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-success')}>
                {leads.length === 0
                  ? t('leads.emptyTitle', {}, { defaultValue: 'No leads yet' })
                  : t('leads.noMatchTitle', {}, { defaultValue: 'No leads match your search' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {leads.length === 0
                  ? t(
                      'leads.emptyHint',
                      {},
                      {
                        defaultValue:
                          'When prospects submit a contact form on your listings, they appear here.',
                      },
                    )
                  : t(
                      'leads.noMatchHint',
                      {},
                      { defaultValue: 'Try a different search or status.' },
                    )}
              </p>
            </div>
          ) : (
            <section className={cm.stack(3)} data-mol-id="leads-list">
              {filteredLeads.map((lead) => (
                <article
                  key={lead.id}
                  data-mol-id={`lead-card-${lead.id}`}
                  className={cm.cn(
                    cm.grid({ cols: 12 }),
                    cm.sp('p', 6),
                    'gap-x-4 bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow items-center',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'col-span-3')}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.h(10),
                        cm.w(10),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'bg-primary-container text-on-primary-container',
                      )}
                    >
                      {getInitials(lead.name)}
                    </div>
                    <div>
                      <h3
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        {lead.name}
                      </h3>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {lead.email}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn('col-span-3')}>
                    {lead.message ? (
                      <p
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant line-clamp-2')}
                      >
                        {lead.message}
                      </p>
                    ) : (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                        {t('leads.noMessage', {}, { defaultValue: '(no message)' })}
                      </p>
                    )}
                  </div>
                  <div className={cm.cn('col-span-2')}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-md',
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-wider',
                        statusBadgeClass(lead.status, cm),
                      )}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'col-span-2 text-on-surface-variant')}>
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : ''}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'end', gap: 'sm', align: 'center' }),
                      'col-span-2',
                    )}
                  >
                    <select
                      disabled={busyId === lead.id}
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                      data-mol-id={`status-select-${lead.id}`}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'bg-surface-container-low border border-border rounded-md text-on-surface',
                      )}
                    >
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="qualified">qualified</option>
                      <option value="lost">lost</option>
                    </select>
                    <button
                      type="button"
                      disabled={busyId === lead.id}
                      onClick={() => deleteLead(lead.id)}
                      data-mol-id={`delete-lead-${lead.id}`}
                      aria-label={t('leads.delete', {}, { defaultValue: 'Delete lead' })}
                      className={cm.cn(
                        cm.sp('p', 2),
                        'bg-surface-container-low rounded-lg hover:bg-error-container/30 transition-colors text-error disabled:opacity-50',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default AgentLeadsPage
export { AgentLeadsPage, AgentLeadsPage as AgentLeadsPagePage }
