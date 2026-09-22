import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeridianAppShell } from '../components/MeridianAppShell.js'
import type { EmailRow } from '../lib/api.js'
import { deriveInitials, ensureArray } from '../lib/api.js'
import { readPrefs, withSignature } from '../lib/preferences.js'

interface ComposeState {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  thread_id: string | null
}

const EMPTY: ComposeState = { to: [], cc: [], bcc: [], subject: '', body: '', thread_id: null }

export function Compose() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const draftId = params.get('draft')
  const replyId = params.get('reply')
  const forwardId = params.get('forward')

  const [state, setState] = useState<ComposeState>(EMPTY)
  const [recipientInput, setRecipientInput] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [draftRowId, setDraftRowId] = useState<string | null>(null)
  const [savingStatus, setSavingStatus] = useState<string>('')
  const [sendStatus, setSendStatus] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<string | null>(null)

  // Hydrate from existing draft / reply target / forward target, applying the
  // saved signature (Settings → Signatures) to new/reply/forward bodies. A loaded
  // draft keeps its stored body as-is (it already contains any signature).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const signature = readPrefs().signature
        if (draftId) {
          const res = await http.get<EmailRow>(`/api/drafts/${draftId}`)
          const row = ((res as { data?: EmailRow }).data ?? res) as EmailRow
          if (cancelled) return
          setState({
            to: ensureArray(row.to),
            cc: ensureArray(row.cc),
            bcc: ensureArray(row.bcc),
            subject: row.subject ?? '',
            body: row.body ?? '',
            thread_id: row.thread_id ?? null,
          })
          setDraftRowId(row.id)
        } else if (replyId) {
          const res = await http.get<EmailRow>(`/api/emails/${replyId}`)
          const row = ((res as { data?: EmailRow }).data ?? res) as EmailRow
          if (cancelled) return
          const subj = row.subject?.startsWith('Re: ') ? row.subject : `Re: ${row.subject ?? ''}`
          setState({
            to: row.from ? [row.from] : [],
            cc: [],
            bcc: [],
            subject: subj,
            body: withSignature(
              `\n\nOn ${new Date(row.created_at).toLocaleString()}, ${row.from} wrote:\n> ${(row.body ?? '').replace(/\n/g, '\n> ')}`,
              signature,
            ),
            thread_id: row.thread_id ?? row.id,
          })
        } else if (forwardId) {
          const res = await http.get<EmailRow>(`/api/emails/${forwardId}`)
          const row = ((res as { data?: EmailRow }).data ?? res) as EmailRow
          if (cancelled) return
          const subj = row.subject?.startsWith('Fwd: ') ? row.subject : `Fwd: ${row.subject ?? ''}`
          setState({
            to: [],
            cc: [],
            bcc: [],
            subject: subj,
            body: withSignature(
              `\n\n----- Forwarded message -----\nFrom: ${row.from}\nSubject: ${row.subject ?? ''}\n\n${row.body ?? ''}`,
              signature,
            ),
            thread_id: null,
          })
        } else if (signature.trim()) {
          // Brand-new message: seed the body with just the signature.
          setState((prev) => ({ ...prev, body: withSignature('', signature) }))
        }
      } catch (err) {
        console.error('compose:hydrate', err)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftId, replyId, forwardId, http])

  // Auto-save draft every 5 seconds if any field is non-empty.
  useEffect(() => {
    const dirty = state.subject.trim() || state.body.trim() || state.to.length > 0
    if (!dirty) return
    const timer = setTimeout(async () => {
      try {
        setSavingStatus(t('common.savingEllipsis', {}, { defaultValue: 'Saving…' }))
        if (draftRowId) {
          await http.put(`/api/drafts/${draftRowId}`, {
            to: state.to,
            cc: state.cc,
            bcc: state.bcc,
            subject: state.subject,
            body: state.body,
            thread_id: state.thread_id,
          })
        } else {
          const res = await http.post<EmailRow>('/api/drafts', {
            to: state.to,
            cc: state.cc,
            bcc: state.bcc,
            subject: state.subject,
            body: state.body,
            thread_id: state.thread_id,
          })
          const row = ((res as { data?: EmailRow }).data ?? res) as EmailRow
          if (row?.id) {
            setDraftRowId(row.id)
            // First commit of a draft is the meaningful funnel point;
            // subsequent PUT autosaves don't re-fire the event.
            track({ name: 'draft.saved', properties: { draft_id: row.id } })
          }
        }
        setSavingStatus(
          t(
            'meridian.compose.savedAt',
            { time: new Date().toLocaleTimeString() },
            { defaultValue: 'Draft saved at {{time}}' },
          ),
        )
      } catch (err) {
        setSavingStatus(t('meridian.compose.saveFailed', {}, { defaultValue: 'Auto-save failed' }))
        console.error('compose:autosave', err)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [state, draftRowId, http, t])

  const addRecipient = useCallback(() => {
    const value = recipientInput.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setErrors(
        t(
          'meridian.compose.invalidEmail',
          { value },
          { defaultValue: '"{{value}}" is not a valid email' },
        ),
      )
      return
    }
    setErrors(null)
    setState((prev) => ({ ...prev, to: prev.to.includes(value) ? prev.to : [...prev.to, value] }))
    setRecipientInput('')
  }, [recipientInput, t])

  const removeRecipient = useCallback((email: string) => {
    setState((prev) => ({ ...prev, to: prev.to.filter((r) => r !== email) }))
  }, [])

  const send = useCallback(async () => {
    setErrors(null)
    if (state.to.length === 0) {
      setErrors(
        t(
          'meridian.compose.needRecipient',
          {},
          { defaultValue: 'Add at least one recipient first.' },
        ),
      )
      return
    }
    if (!state.subject.trim()) {
      setErrors(t('meridian.compose.needSubject', {}, { defaultValue: 'Add a subject first.' }))
      return
    }
    setSending(true)
    try {
      const res = await http.post<{
        id?: string
        delivery?: string
        delivery_error?: string | null
      }>('/api/emails/send', {
        to: state.to,
        cc: state.cc,
        bcc: state.bcc,
        subject: state.subject,
        body: state.body,
        thread_id: state.thread_id,
      })
      const data = ((
        res as { data?: { delivery?: string; delivery_error?: string | null; id?: string } }
      ).data ?? (res as { delivery?: string; delivery_error?: string | null; id?: string })) as {
        delivery?: string
        delivery_error?: string | null
        id?: string
      }
      if (draftRowId) {
        try {
          await http.delete(`/api/drafts/${draftRowId}`)
        } catch (_error) {
          // discard error: draft cleanup best-effort
        }
      }
      const delivery = data.delivery ?? 'sent'
      const deliveryError = data.delivery_error ?? null
      if (delivery === 'failed') {
        setSendStatus(
          t(
            'meridian.compose.sentWithError',
            { error: deliveryError ?? 'unknown' },
            { defaultValue: 'Saved to Sent, but delivery failed: {{error}}' },
          ),
        )
      } else {
        setSendStatus(t('meridian.compose.sent', {}, { defaultValue: 'Sent successfully.' }))
        track({
          name: 'email.sent',
          properties: {
            email_id: data.id ?? null,
            recipient_count: state.to.length + state.cc.length + state.bcc.length,
            kind: 'compose',
          },
        })
        setTimeout(() => navigate('/inbox'), 800)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed'
      setErrors(message)
    } finally {
      setSending(false)
    }
  }, [state, http, draftRowId, navigate, t])

  const recipients = useMemo(
    () => state.to.map((r) => ({ name: r, initials: deriveInitials(r) })),
    [state.to],
  )

  const discard = useCallback(async () => {
    if (draftRowId) {
      try {
        await http.delete(`/api/drafts/${draftRowId}`)
        track({ name: 'draft.deleted', properties: { draft_id: draftRowId } })
      } catch (_error) {
        // best-effort discard
      }
    }
    navigate('/drafts')
  }, [draftRowId, http, navigate])

  return (
    <MeridianAppShell hideSidebar>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'h-full bg-surface-container-lowest overflow-hidden',
        )}
        data-mol-id="page-compose"
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            'h-14 border-b border-outline-variant/40 bg-surface shrink-0',
          )}
        >
          <Link
            to="/inbox"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
            data-mol-id="compose-back"
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_back
            </span>
            {t('common.back', {}, { defaultValue: 'Back' })}
          </Link>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
            data-mol-id="compose-saving"
          >
            {savingStatus && (
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                cloud_done
              </span>
            )}
            {savingStatus}
          </span>
        </header>

        <div className={cm.cn(cm.flex1, cm.sp('p', 8), 'overflow-y-auto')}>
          <article
            className={cm.cn(
              cm.maxW('4xl'),
              cm.mxAuto,
              cm.flex({ direction: 'col' }),
              'rounded-3xl bg-surface border border-outline-variant/40 shadow-xl shadow-primary/5 overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 6),
                cm.sp('py', 4),
                'border-b border-outline-variant/40 bg-gradient-to-br from-primary/5 to-secondary/5',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl bg-gradient-to-br from-primary to-secondary text-white',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    edit
                  </span>
                </span>
                <span>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                    {t('meridian.compose.title', {}, { defaultValue: 'New message' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {state.thread_id
                      ? t(
                          'meridian.compose.replyTo',
                          { id: state.thread_id },
                          { defaultValue: 'Reply in thread {{id}}' },
                        )
                      : t(
                          'meridian.compose.newMessage',
                          {},
                          { defaultValue: 'Composing a new message' },
                        )}
                  </p>
                </span>
              </span>
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col' }))}>
              {/* Recipients */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'border-b border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant w-12 mt-2',
                  )}
                >
                  {t('meridian.compose.to', {}, { defaultValue: 'To' })}
                </span>
                <div
                  className={cm.cn(
                    cm.flex({ wrap: 'wrap', gap: 'xs' }),
                    cm.flex1,
                    'min-h-[40px] items-center',
                  )}
                >
                  {recipients.map((r) => (
                    <span
                      key={r.name}
                      data-mol-id="compose-recipient-chip"
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.fontWeight('medium'),
                        cm.textSize('sm'),
                        'rounded-full bg-primary/10 text-primary-dark border border-primary/20',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.w(5),
                          cm.h(5),
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.fontWeight('bold'),
                          'rounded-full bg-gradient-to-br from-primary to-secondary text-white text-[10px]',
                        )}
                      >
                        {r.initials}
                      </span>
                      {r.name}
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.name)}
                        className={'text-primary/60 hover:text-primary'}
                        aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
                      >
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
                        e.preventDefault()
                        addRecipient()
                      } else if (e.key === 'Backspace' && !recipientInput && state.to.length > 0) {
                        const last = state.to[state.to.length - 1]
                        if (last) removeRecipient(last)
                      }
                    }}
                    onBlur={addRecipient}
                    placeholder={t(
                      'meridian.compose.addRecipient',
                      {},
                      { defaultValue: 'Add another recipient' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 1),
                      cm.textSize('sm'),
                      'min-w-[200px] border-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-on-surface-variant',
                    )}
                    data-mol-id="compose-to-input"
                  />
                </div>
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant hover:text-on-surface mt-2',
                    )}
                  >
                    {t('meridian.compose.toggleCc', {}, { defaultValue: 'Cc/Bcc' })}
                  </button>
                )}
              </div>

              {showCc && (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    'border-b border-outline-variant/40',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant w-12 mt-2',
                    )}
                  >
                    {t('meridian.compose.cc', {}, { defaultValue: 'Cc' })}
                  </span>
                  <input
                    type="text"
                    value={state.cc.join(', ')}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        cc: e.target.value.split(/[,\s]+/).filter(Boolean),
                      }))
                    }
                    placeholder={t(
                      'meridian.compose.ccPlaceholder',
                      {},
                      { defaultValue: 'cc@example.com' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('p', 1),
                      cm.textSize('sm'),
                      'border-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-on-surface-variant',
                    )}
                    data-mol-id="compose-cc-input"
                  />
                </div>
              )}

              {/* Subject */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'border-b border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant w-12',
                  )}
                >
                  {t('meridian.compose.subject', {}, { defaultValue: 'Subj' })}
                </span>
                <input
                  type="text"
                  value={state.subject}
                  onChange={(e) => setState((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder={t(
                    'meridian.compose.subjectPlaceholder',
                    {},
                    { defaultValue: 'Subject' },
                  )}
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('p', 1),
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'border-none bg-transparent focus:ring-0 focus:outline-none text-on-surface',
                  )}
                  data-mol-id="compose-subject"
                />
              </div>

              {/* Body */}
              <textarea
                rows={14}
                value={state.body}
                onChange={(e) => setState((prev) => ({ ...prev, body: e.target.value }))}
                placeholder={t(
                  'meridian.compose.bodyPlaceholder',
                  {},
                  { defaultValue: 'Write your message…' },
                )}
                data-mol-id="compose-body"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  cm.textSize('base'),
                  'min-h-[320px] border-none bg-transparent focus:ring-0 focus:outline-none resize-none placeholder:text-on-surface-variant text-on-surface leading-relaxed',
                )}
              />

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  'border-t border-outline-variant/40 bg-surface',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}>
                  {errors && (
                    <span className="text-error" data-mol-id="compose-error">
                      {errors}
                    </span>
                  )}
                  {!errors && sendStatus && (
                    <span className="text-success" data-mol-id="compose-status">
                      {sendStatus}
                    </span>
                  )}
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={discard}
                    data-mol-id="compose-discard"
                    className={cm.cn(
                      cm.sp('p', 2),
                      cm.cursorPointer,
                      'rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors',
                    )}
                    aria-label={t(
                      'meridian.compose.discard',
                      {},
                      { defaultValue: 'Discard draft' },
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending}
                    data-mol-id="compose-send"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow',
                    )}
                  >
                    {sending
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('common.send', {}, { defaultValue: 'Send' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      send
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </MeridianAppShell>
  )
}

export default Compose
