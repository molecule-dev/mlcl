import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { JOB_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDateTime, formatMoney } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ChecklistItem {
  id: string
  label: string
  done: boolean
  done_at: string | null
}

interface Note {
  id: string
  author: string
  body: string
  created_at: string
}

interface Job {
  id: string
  customer_id: string
  customer: string
  quote_id: string | null
  title: string
  description: string
  address: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  technician_id: string | null
  technician: string | null
  checklist: ChecklistItem[]
  notes: Note[]
}

interface Technician {
  id: string
  name: string
  trade: string
  active: boolean
  active_jobs: number
}

interface InvoiceRecord {
  id: string
  number: string
  status: string
  total_cents: number
  customer_id: string
  job_id: string | null
}

/** Next status action the workflow offers, in order. */
function nextActions(status: string): Array<{ to: string; label: string; primary?: boolean }> {
  switch (status) {
    case 'scheduled':
      return [
        { to: 'en_route', label: 'Start travel', primary: true },
        { to: 'in_progress', label: 'Start work now' },
      ]
    case 'en_route':
      return [{ to: 'in_progress', label: 'Start work', primary: true }]
    case 'in_progress':
      return [{ to: 'completed', label: 'Complete job', primary: true }]
    default:
      return []
  }
}

export function JobDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [assignTech, setAssignTech] = useState('')
  const [assignStart, setAssignStart] = useState('')
  const [assignEnd, setAssignEnd] = useState('')
  const [newChecklist, setNewChecklist] = useState('')
  const [newNote, setNewNote] = useState('')
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [jobRes, techRes, invoiceRes] = await Promise.all([
        http.get(`/api/jobs/${id}`),
        http.get('/api/technicians'),
        http.get('/api/invoices'),
      ])
      setJob(unwrapSingle<Job>(jobRes))
      setTechnicians(unwrapList<Technician>(techRes))
      setInvoices(unwrapList<InvoiceRecord>(invoiceRes))
      setError(null)
    } catch (_error) {
      setError(t('jobs.detail.loadError', {}, { defaultValue: 'Failed to load job.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(next: string) {
    if (!id || acting) return
    setActing(true)
    setError(null)
    try {
      await http.post(`/api/jobs/${id}/status`, { status: next })
      track({
        name: next === 'completed' ? 'job.completed' : 'job.status_changed',
        properties: { job_id: id, status: next },
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  async function assign() {
    if (!id || acting) return
    setActing(true)
    setError(null)
    try {
      await http.post(`/api/jobs/${id}/assign`, {
        technician_id: assignTech || null,
        scheduled_start: assignStart ? new Date(assignStart).toISOString() : undefined,
        scheduled_end: assignEnd ? new Date(assignEnd).toISOString() : undefined,
      })
      track({
        name: 'job.scheduled',
        properties: { job_id: id, technician_id: assignTech || null },
      })
      setAssignTech('')
      setAssignStart('')
      setAssignEnd('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  async function toggleChecklist(itemId: string) {
    if (!id) return
    try {
      await http.post(`/api/jobs/${id}/checklist/${itemId}/toggle`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function addChecklistItem(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newChecklist.trim()) return
    try {
      await http.post(`/api/jobs/${id}/checklist`, { label: newChecklist.trim() })
      setNewChecklist('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newNote.trim()) return
    try {
      await http.post(`/api/jobs/${id}/notes`, { body: newNote.trim() })
      setNewNote('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function generateInvoice() {
    if (!id || acting) return
    setActing(true)
    setInvoiceMsg(null)
    setError(null)
    try {
      const res = await http.post(`/api/jobs/${id}/invoice`)
      const created = unwrapSingle<{ id?: string; number?: string }>(res)
      track({ name: 'invoice.created', properties: { job_id: id, invoice_id: created?.id } })
      if (created?.id) {
        navigate(`/invoices/${created.id}`)
        return
      }
      setInvoiceMsg(t('jobs.detail.invoiceCreated', {}, { defaultValue: 'Invoice created.' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActing(false)
    }
  }

  if (loading && !job) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('jobs.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error && !job) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link to="/jobs" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('jobs.backToList', {}, { defaultValue: 'Back to jobs' })}
        </Link>
      </div>
    )
  }
  if (!job) return null

  const doneCount = job.checklist.filter((c) => c.done).length
  const isOpen =
    job.status === 'scheduled' || job.status === 'en_route' || job.status === 'in_progress'
  const assignOpen = isOpen

  /** This job's dossier documents: the source quote + generated invoices. */
  const dossier: { href: string; icon: string; label: string; meta: string }[] = []
  if (job.quote_id) {
    dossier.push({
      href: `/quotes/${job.quote_id}`,
      icon: 'description',
      label: t('jobs.detail.dossierQuote', {}, { defaultValue: 'Source quote' }),
      meta: t('jobs.detail.dossierQuoteMeta', {}, { defaultValue: 'Approved estimate & scope' }),
    })
  }
  for (const inv of invoices.filter((i) => i.job_id === job.id)) {
    dossier.push({
      href: `/invoices/${inv.id}`,
      icon: 'receipt_long',
      label: inv.number,
      meta: formatMoney(inv.total_cents),
    })
  }

  /** Customer ledger for the jobsite environment panel. */
  const customerInvoices = invoices.filter((i) => i.customer_id === job.customer_id)
  const customerBilled = customerInvoices
    .filter((i) => i.status !== 'draft')
    .reduce((sum, i) => sum + i.total_cents, 0)
  const customerOutstanding = customerInvoices
    .filter((i) => i.status === 'sent')
    .reduce((sum, i) => sum + i.total_cents, 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <nav>
        <Link to="/jobs" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('jobs.backToList', {}, { defaultValue: 'Back to jobs' })}
        </Link>
      </nav>

      <header className={cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{job.title}</h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <Link to={`/customers/${job.customer_id}`} className={'hover:underline'}>
              {job.customer}
            </Link>
            {job.quote_id ? (
              <>
                {' · '}
                <Link to={`/quotes/${job.quote_id}`} className={'hover:underline'}>
                  {t('jobs.detail.fromQuote', {}, { defaultValue: 'from quote' })}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <StatusBadge
          status={job.status}
          tone={JOB_TONE[job.status] ?? 'neutral'}
          translationKeyPrefix="jobs.status"
        />
      </header>

      <div className={cm.grid({ cols: 3, gap: 'md' })}>
        <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('jobs.detail.window', {}, { defaultValue: 'Schedule window' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'))}>
            {formatDateTime(job.scheduled_start) ||
              t('jobs.unscheduled', {}, { defaultValue: 'Unscheduled' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {job.scheduled_end
              ? t(
                  'jobs.detail.until',
                  { at: formatDateTime(job.scheduled_end) },
                  { defaultValue: 'until {{at}}' },
                )
              : ''}
          </p>
        </section>
        <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('jobs.detail.technician', {}, { defaultValue: 'Technician' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'))}>{job.technician ?? '—'}</p>
        </section>
        <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(2))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('jobs.detail.address', {}, { defaultValue: 'Service address' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'))}>{job.address || '—'}</p>
        </section>
      </div>

      {job.description ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
            {t('jobs.detail.description', {}, { defaultValue: 'Description' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{job.description}</p>
        </section>
      ) : null}

      <section data-mol-id="job-jobsite-environment" className={cm.cn(cm.card(), cm.stack(3))}>
        <h2
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'border-b border-outline-variant font-display',
          )}
        >
          <span
            className="material-symbols-outlined text-base align-middle mr-2 text-primary"
            aria-hidden="true"
          >
            cottage
          </span>
          {t(
            'jobs.detail.environmentHeading',
            {},
            { defaultValue: 'Jobsite Environment & Customer Ledger' },
          )}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.sp('p', 5))}>
          <div className={cm.stack(2)}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('jobs.detail.environmentSite', {}, { defaultValue: 'Jobsite environment' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'))}>{job.address || '—'}</p>
            {job.description ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {job.description}
              </p>
            ) : null}
            {job.technician ? (
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">
                  engineering
                </span>
                {t(
                  'jobs.detail.environmentTech',
                  { name: job.technician },
                  { defaultValue: 'Lead tech: {{name}}' },
                )}
              </p>
            ) : null}
          </div>
          <div className={cm.stack(2)}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('jobs.detail.environmentLedger', {}, { defaultValue: 'Customer ledger' })}
            </h3>
            <Link
              to={`/customers/${job.customer_id}`}
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'hover:underline')}
            >
              {job.customer}
            </Link>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'jobs.detail.environmentBilled',
                { amount: formatMoney(customerBilled) },
                { defaultValue: 'Billed to date: {{amount}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'jobs.detail.environmentOutstanding',
                { amount: formatMoney(customerOutstanding) },
                { defaultValue: 'Outstanding: {{amount}}' },
              )}
            </p>
          </div>
        </div>
      </section>

      {assignOpen ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
            {t('jobs.detail.assignHeading', {}, { defaultValue: 'Dispatch' })}
          </h2>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('jobs.detail.technician', {}, { defaultValue: 'Technician' })}
              </span>
              <select
                value={assignTech}
                onChange={(e) => setAssignTech(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full',
                )}
              >
                <option value="">
                  {t('jobs.detail.unassigned', {}, { defaultValue: 'Unassigned' })}
                </option>
                {technicians
                  .filter((tech) => tech.active)
                  .map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} · {tech.trade} ·{' '}
                      {t(
                        'technicians.openJobs',
                        { count: tech.active_jobs },
                        { defaultValue: '{{count}} open' },
                      )}
                    </option>
                  ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('jobs.detail.start', {}, { defaultValue: 'Start' })}
              </span>
              <input
                type="datetime-local"
                value={assignStart}
                onChange={(e) => setAssignStart(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('jobs.detail.end', {}, { defaultValue: 'End' })}
              </span>
              <input
                type="datetime-local"
                value={assignEnd}
                onChange={(e) => setAssignEnd(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md w-full',
                )}
              />
            </label>
            <div className={cm.flex({ align: 'end' })}>
              <button
                type="button"
                disabled={acting || (!assignTech && !assignStart)}
                onClick={assign}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {t('jobs.detail.assign', {}, { defaultValue: 'Assign' })}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(4))}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('jobs.detail.checklist', {}, { defaultValue: 'Checklist' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'jobs.detail.checklistProgress',
              { done: doneCount, total: job.checklist.length },
              { defaultValue: '{{done}} of {{total}} done' },
            )}
          </span>
        </div>
        {job.checklist.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('jobs.detail.checklistEmpty', {}, { defaultValue: 'No checklist items yet.' })}
          </p>
        ) : (
          <ul className={cm.stack(1)}>
            {job.checklist.map((item) => (
              <li key={item.id}>
                <label className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklist(item.id)}
                    aria-label={item.label}
                    className={cm.cn(cm.h(5), cm.w(5))}
                  />
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      item.done ? 'line-through text-on-surface-variant' : '',
                    )}
                  >
                    {item.label}
                  </span>
                </label>
                {item.done && item.done_at ? (
                  <span
                    className={cm.cn(cm.textSize('xs'), cm.sp('ml', 6), 'text-on-surface-variant')}
                  >
                    {formatDateTime(item.done_at)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addChecklistItem} className={cm.flex({ gap: 'sm' })}>
          <input
            type="text"
            value={newChecklist}
            onChange={(e) => setNewChecklist(e.target.value)}
            placeholder={t(
              'jobs.detail.checklistPlaceholder',
              {},
              { defaultValue: 'Add a checklist item…' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md flex-1 min-w-0',
            )}
          />
          <button
            type="submit"
            disabled={!newChecklist.trim()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md disabled:opacity-50',
            )}
          >
            {t('common.add', {}, { defaultValue: 'Add' })}
          </button>
        </form>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), cm.stack(4))}>
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {t('jobs.detail.notes', {}, { defaultValue: 'Notes timeline' })}
        </h2>
        {job.notes.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('jobs.detail.notesEmpty', {}, { defaultValue: 'No notes yet.' })}
          </p>
        ) : (
          <ul className={cm.stack(3)}>
            {job.notes.map((n) => (
              <li key={n.id} className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-col sm:flex-row')}>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'w-32 shrink-0')}
                >
                  {n.author}
                </span>
                <span className={cm.flex1}>
                  <span className={cm.cn(cm.textSize('sm'))}>{n.body}</span>
                  <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                    {formatDateTime(n.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addNote} className={cm.flex({ gap: 'sm' })}>
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t(
              'jobs.detail.notePlaceholder',
              {},
              { defaultValue: 'Add a note for the timeline…' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md flex-1 min-w-0',
            )}
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md disabled:opacity-50',
            )}
          >
            {t('jobs.detail.addNote', {}, { defaultValue: 'Post' })}
          </button>
        </form>
      </section>

      <section data-mol-id="job-dossier-documents" className={cm.cn(cm.card(), cm.stack(3))}>
        <h3
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'border-b border-outline-variant font-display',
          )}
        >
          <span
            className="material-symbols-outlined text-base align-middle mr-2 text-primary"
            aria-hidden="true"
          >
            attachment
          </span>
          {t('jobs.detail.dossierHeading', {}, { defaultValue: 'Attached Dossier Documents' })}
        </h3>
        {dossier.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 5), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'jobs.detail.dossierEmpty',
              {},
              {
                defaultValue:
                  'No documents filed yet — the approved quote and the generated invoice attach here automatically.',
              },
            )}
          </p>
        ) : (
          <ul>
            {dossier.map((doc) => (
              <li key={doc.href} className={'border-b border-outline-variant last:border-b-0'}>
                <Link
                  to={doc.href}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'h-8 w-8 shrink-0 bg-primary-container text-on-primary-container',
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      {doc.icon}
                    </span>
                  </span>
                  <span className={cm.flex1}>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {doc.label}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant')}>
                      {doc.meta}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && job ? (
        <p className={'text-error text-sm'} role="alert">
          {error}
        </p>
      ) : null}
      {invoiceMsg ? <p className={'text-success text-sm'}>{invoiceMsg}</p> : null}

      <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
        {isOpen
          ? nextActions(job.status).map((action) => (
              <button
                key={action.to}
                type="button"
                disabled={acting}
                onClick={() => setStatus(action.to)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  action.primary
                    ? 'bg-primary text-on-primary rounded-md disabled:opacity-50'
                    : 'border border-outline-variant rounded-md disabled:opacity-50',
                )}
              >
                {t(`jobs.action.${action.to}`, {}, { defaultValue: action.label })}
              </button>
            ))
          : null}
        {isOpen ? (
          <button
            type="button"
            disabled={acting}
            onClick={() => setStatus('cancelled')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md text-error disabled:opacity-50',
            )}
          >
            {t('jobs.action.cancelled', {}, { defaultValue: 'Cancel job' })}
          </button>
        ) : null}
        {job.status === 'completed' ? (
          <button
            type="button"
            disabled={acting}
            onClick={generateInvoice}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-success text-on-success rounded-md disabled:opacity-50',
            )}
          >
            {t('jobs.detail.generateInvoice', {}, { defaultValue: 'Generate invoice' })}
          </button>
        ) : null}
      </div>
    </div>
  )
}
