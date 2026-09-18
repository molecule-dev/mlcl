import { useState } from 'react'
import { useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'

interface CreatedTicket {
  id?: string
  data?: { id?: string }
}

function pickId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as CreatedTicket
  if (typeof o.id === 'string') return o.id
  if (o.data && typeof o.data.id === 'string') return o.data.id
  return null
}

function TicketNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!subject.trim() || !description.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        description: description.trim(),
        priority,
      }
      if (category.trim()) payload.category = category.trim()
      const res = await http.post<unknown>('/api/tickets', payload)
      const id = pickId(res)
      if (id) {
        navigate(`/tickets/${id}`)
        return
      }
      navigate('/tickets')
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('ticketNew.error', {}, { defaultValue: 'Could not create ticket. Try again.' })
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <div className={cm.cn(cm.flex(), cm.minH('screen'))}>
        <SideNavBar />
        <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0 ml-[240px]')}>
          <div
            className={cm.cn(cm.sp('p', 8), cm.maxW('3xl'), cm.mxAuto, cm.w('full'), cm.stack(6))}
          >
            <header className={cm.stack(2)}>
              <h1
                className={cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), 'text-on-surface')}
                data-mol-id="ticket-new-title"
              >
                {t('ticketNew.title', {}, { defaultValue: 'New Ticket' })}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'ticketNew.subtitle',
                  {},
                  {
                    defaultValue:
                      'Capture the customer issue. The ticket will be created in the open state and assigned to you for triage.',
                  },
                )}
              </p>
            </header>

            {error && (
              <div
                role="alert"
                data-mol-id="ticket-new-error"
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg bg-error-container text-on-error-container',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{error}</p>
              </div>
            )}

            <form data-mol-id="ticket-new-form" className={cm.stack(5)} onSubmit={handleSubmit}>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="ticket-subject"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('ticketNew.subjectLabel', {}, { defaultValue: 'Subject' })}
                </label>
                <input
                  id="ticket-subject"
                  data-mol-id="ticket-subject"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t(
                    'ticketNew.subjectPlaceholder',
                    {},
                    { defaultValue: 'Short summary of the issue' },
                  )}
                />
              </div>

              <div className={cm.stack(2)}>
                <label
                  htmlFor="ticket-description"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </label>
                <textarea
                  id="ticket-description"
                  data-mol-id="ticket-description"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full min-h-[160px] rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'ticketNew.descriptionPlaceholder',
                    {},
                    { defaultValue: 'Steps to reproduce, customer context, etc.' },
                  )}
                />
              </div>

              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 4 }))}>
                <div className={cm.cn(cm.stack(2), cm.flex1)}>
                  <label
                    htmlFor="ticket-priority"
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                  >
                    {t('form.priority', {}, { defaultValue: 'Priority' })}
                  </label>
                  <select
                    id="ticket-priority"
                    data-mol-id="ticket-priority"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                    )}
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')
                    }
                  >
                    <option value="low">
                      {t('ticketNew.priority.low', {}, { defaultValue: 'Low' })}
                    </option>
                    <option value="medium">
                      {t('ticketNew.priority.medium', {}, { defaultValue: 'Medium' })}
                    </option>
                    <option value="high">
                      {t('ticketNew.priority.high', {}, { defaultValue: 'High' })}
                    </option>
                    <option value="urgent">
                      {t('ticketNew.priority.urgent', {}, { defaultValue: 'Urgent' })}
                    </option>
                  </select>
                </div>

                <div className={cm.cn(cm.stack(2), cm.flex1)}>
                  <label
                    htmlFor="ticket-category"
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                  >
                    {t('ticketNew.categoryLabel', {}, { defaultValue: 'Category (optional)' })}
                  </label>
                  <input
                    id="ticket-category"
                    data-mol-id="ticket-category"
                    type="text"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                    )}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={t(
                      'ticketNew.categoryPlaceholder',
                      {},
                      { defaultValue: 'e.g. billing, technical, account' },
                    )}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 3 }))}>
                <button
                  type="button"
                  data-mol-id="ticket-new-cancel"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low',
                  )}
                  onClick={() => navigate('/tickets')}
                  disabled={submitting}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-mol-id="ticket-new-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                  )}
                  disabled={submitting || !subject.trim() || !description.trim()}
                >
                  {submitting
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('ticketNew.submit', {}, { defaultValue: 'Create ticket' })}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default TicketNew
export { TicketNew, TicketNew as TicketNewPage }
