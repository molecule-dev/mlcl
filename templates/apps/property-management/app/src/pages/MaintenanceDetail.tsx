import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MaintenanceApi {
  id: string
  title: string
  description?: string | null
  status: 'open' | 'in_progress' | 'completed' | string
  priority: 'low' | 'medium' | 'high' | string
  unit_id?: string | null
  property_id?: string | null
  tenant_id?: string | null
  assignee_id?: string | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
}

interface UnitApi {
  id: string
  unit_number: string
  property_id: string
}
interface PropertyApi {
  id: string
  name: string
}
interface TenantApi {
  id: string
  name: string
}

interface MessageApi {
  id: string
  request_id: string
  body: string
  created_at: string
  author?: string
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: T[]; items?: T[] } | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
}

function unwrapOne<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  const r = res as { data?: T } & T
  if ('data' in r && r.data) return r.data as T
  return r as T
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const PRIORITY_TINT: Record<string, string> = {
  high: 'bg-error-light text-error',
  medium: 'bg-warning-light text-warning',
  low: 'bg-surface-secondary text-foreground',
}

const STATUS_TINT: Record<string, string> = {
  open: 'bg-warning-container text-on-warning-container',
  in_progress: 'bg-info-container text-on-info-container',
  completed: 'bg-success-light text-success',
}

const ACCENT_BORDER: Record<string, string> = {
  high: 'border-error',
  medium: 'border-warning',
  low: 'border-border-secondary',
}

export function MaintenanceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [ticket, setTicket] = useState<MaintenanceApi | null>(null)
  const [property, setProperty] = useState<PropertyApi | null>(null)
  const [unit, setUnit] = useState<UnitApi | null>(null)
  const [tenant, setTenant] = useState<TenantApi | null>(null)
  const [messages, setMessages] = useState<MessageApi[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [completing, setCompleting] = useState(false)

  const loadTicket = async () => {
    if (!id) return
    setLoading(true)
    try {
      const tRes = await http.get<MaintenanceApi>(`/api/maintenance/${id}`).catch(() => null)
      const tk = unwrapOne<MaintenanceApi>(tRes)
      if (!tk?.id) {
        setError(t('maintenanceDetail.notFound', {}, { defaultValue: 'Work order not found' }))
        setLoading(false)
        return
      }
      setTicket(tk)
      const [unitRes, propertyRes, tenantRes, msgRes] = await Promise.all([
        tk.unit_id
          ? http.get<UnitApi>(`/api/units/${tk.unit_id}`).catch(() => null)
          : Promise.resolve(null),
        tk.property_id
          ? http.get<PropertyApi>(`/api/properties/${tk.property_id}`).catch(() => null)
          : Promise.resolve(null),
        tk.tenant_id
          ? http.get<TenantApi>(`/api/tenants/${tk.tenant_id}`).catch(() => null)
          : Promise.resolve(null),
        http.get(`/api/maintenance/${id}/messages`).catch(() => null),
      ])
      const u = unwrapOne<UnitApi>(unitRes)
      setUnit(u)
      let p = unwrapOne<PropertyApi>(propertyRes)
      if (!p && u?.property_id) {
        try {
          p = unwrapOne<PropertyApi>(
            await http.get<PropertyApi>(`/api/properties/${u.property_id}`),
          )
        } catch (_error) {
          // optional fallback fetch — ignore if it fails, property just won't display
        }
      }
      setProperty(p)
      setTenant(unwrapOne<TenantApi>(tenantRes))
      setMessages(unwrapList<MessageApi>(msgRes))
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]) // loadTicket is stable within this render; only re-run when id changes

  const postUpdate = async () => {
    if (!id || !comment.trim()) return
    setPosting(true)
    try {
      const res = await http.post(`/api/maintenance/${id}/messages`, { body: comment.trim() })
      const created = unwrapOne<MessageApi>(res)
      if (created?.id) {
        setMessages((prev) => [...prev, created])
      } else {
        await loadTicket()
      }
      setComment('')
    } catch (_error) {
      // keep comment so the user can retry; post failure is transient
    } finally {
      setPosting(false)
    }
  }

  const markComplete = async () => {
    if (!id) return
    setCompleting(true)
    try {
      await http.put(`/api/maintenance/${id}/complete`, {})
      track({ name: 'maintenance.completed', properties: { ticket_id: id } })
      await loadTicket()
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}
      >
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
          data-testid="maintenance-detail-error"
        >
          {error ?? t('maintenanceDetail.notFound', {}, { defaultValue: 'Work order not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'maintenanceDetail.notFoundBody',
            {},
            {
              defaultValue:
                'It may have been removed, or the link is incorrect. Head back to your work orders.',
            },
          )}
        </p>
        <Link
          to="/maintenance"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.sp('mt', 4),
            cm.fontWeight('semibold'),
            'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90',
          )}
        >
          {t('maintenanceDetail.backToList', {}, { defaultValue: 'Back to maintenance' })}
        </Link>
      </div>
    )
  }

  const accent = ACCENT_BORDER[ticket.priority] ?? ACCENT_BORDER.low
  const propertyLabel = property?.name ?? '—'
  const unitLabel = unit?.unit_number ?? '—'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(6))}>
      <nav className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        <Link to="/maintenance" className={'hover:text-primary'}>
          {t('maintenanceDetail.breadcrumb', {}, { defaultValue: 'Maintenance' })}
        </Link>
        <span className={cm.sp('mx', 2)}>/</span>
        <span className="text-on-surface" data-testid="maintenance-detail-id">
          #{id}
        </span>
      </nav>

      <header
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-2xl border-l-4 shadow-sm',
          accent,
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <span
            data-testid="maintenance-priority"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'text-[10px] font-black uppercase tracking-widest',
              PRIORITY_TINT[ticket.priority] ?? PRIORITY_TINT.low,
            )}
          >
            {t(`maintenance.priority.${ticket.priority}`, {}, { defaultValue: ticket.priority })}
          </span>
          <span
            data-testid="maintenance-status"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'text-[10px] font-black uppercase tracking-widest',
              STATUS_TINT[ticket.status] ?? STATUS_TINT.open,
            )}
          >
            {t(`maintenance.column.${ticket.status}`, {}, { defaultValue: ticket.status })}
          </span>
        </div>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 4), 'font-extrabold tracking-tight')}
          data-testid="maintenance-title"
        >
          {ticket.title}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {propertyLabel} ·{' '}
          {t('maintenanceDetail.unit', { unit: unitLabel }, { defaultValue: 'Unit {{unit}}' })}
          {tenant?.name ? ` · ${tenant.name}` : ''}
          {ticket.created_at ? ` · ${fmtDateTime(ticket.created_at)}` : ''}
        </p>
        {ticket.description && (
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 6),
              'text-on-surface leading-relaxed',
            )}
          >
            {ticket.description}
          </p>
        )}
      </header>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
          {t('maintenanceDetail.timelineHeading', {}, { defaultValue: 'Updates' })}
        </h2>
        {messages.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('py', 6),
              'text-on-surface-variant text-center',
            )}
            data-testid="maintenance-messages-empty"
          >
            {t(
              'maintenanceDetail.noUpdates',
              {},
              { defaultValue: 'No updates yet — post the first one below.' },
            )}
          </p>
        ) : (
          <ol className={cm.cn(cm.stack(4), 'relative')} data-testid="maintenance-messages">
            {messages.map((m) => (
              <li key={m.id} className={cm.flex({ align: 'start', gap: 'md' })}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'shrink-0 bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">comment</span>
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface whitespace-pre-wrap')}>
                    {m.body}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant tabular-nums',
                    )}
                  >
                    {fmtDateTime(m.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), cm.fontWeight('bold'))}>
          {t('maintenanceDetail.commentsHeading', {}, { defaultValue: 'Add update' })}
        </h2>
        <textarea
          data-testid="maintenance-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={cm.cn(
            cm.w('full'),
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 ring-primary/30 resize-y min-h-[120px]',
          )}
          placeholder={t(
            'maintenanceDetail.commentPlaceholder',
            {},
            { defaultValue: 'Add a note or update for this work order…' },
          )}
        />
        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'xs' }), cm.sp('mt', 3))}>
          {ticket.status !== 'completed' && (
            <button
              type="button"
              data-testid="maintenance-mark-complete"
              onClick={markComplete}
              disabled={completing}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container disabled:opacity-50',
              )}
            >
              {completing
                ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                : t('maintenanceDetail.markComplete', {}, { defaultValue: 'Mark complete' })}
            </button>
          )}
          <button
            type="button"
            data-testid="maintenance-post-update"
            onClick={postUpdate}
            disabled={posting || !comment.trim()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {posting
              ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
              : t('maintenanceDetail.postUpdate', {}, { defaultValue: 'Post update' })}
          </button>
        </div>
      </section>
    </div>
  )
}
