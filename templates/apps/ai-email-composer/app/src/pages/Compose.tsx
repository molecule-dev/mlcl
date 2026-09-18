import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AiSuggestionPanel } from '../components/AiSuggestionPanel.js'
import type { Tone } from '../components/TonePillRow.js'
import { TonePillRow } from '../components/TonePillRow.js'
import { loadPreferences } from '../lib/preferences.js'

interface DraftRecord {
  id: string
  subject: string
  body: string
  recipients: unknown
  cc?: unknown
  bcc?: unknown
  status: string
  tone?: string | null
}

interface ComposeResponse {
  body: string
}

interface AdjustToneResponse {
  draft: DraftRecord
}

interface SummaryResponse {
  summary: string
}

interface SendResponse {
  success: boolean
  recipients: string[]
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
    } catch (_error) {
      // JSON.parse failed — value is not a JSON array; fall back to empty list
      return []
    }
  }
  return []
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown; response?: { data?: { error?: unknown } } }
    if (typeof maybe.message === 'string') return maybe.message
    const apiErr = maybe.response?.data?.error
    if (typeof apiErr === 'string') return apiErr
  }
  return fallback
}

function splitRecipients(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((piece) => piece.trim())
    .filter(Boolean)
}

export function Compose() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [params] = useSearchParams()

  const [draftId, setDraftId] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<string[]>([])
  const [recipientInput, setRecipientInput] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  // Start in the user's saved default tone (Settings → Preferences) rather than
  // a hardcoded one, so their preference actually drives new drafts.
  const [tone, setTone] = useState<Tone>(() => loadPreferences().defaultTone)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  // Hydrate from `?draft=ID` (continue editing), `?reply=SENT_ID` (follow up
  // to a previously-sent email — same recipient, "Re:" subject, quoted body),
  // or `?forward=SENT_ID` (forward — empty recipients, "Fwd:" subject,
  // quoted body). Each opens a fresh composer; existing user-typed state is
  // overwritten because the user is opting into a new compose context.
  useEffect(() => {
    const draftIdParam = params.get('draft')
    const replyId = params.get('reply')
    const forwardId = params.get('forward')
    if (!draftIdParam && !replyId && !forwardId) return
    let cancelled = false
    ;(async () => {
      try {
        if (draftIdParam) {
          const response = await http.get<DraftRecord>(`/drafts/${draftIdParam}`)
          if (cancelled) return
          const d = response.data
          setDraftId(d.id)
          setSubject(d.subject ?? '')
          setBody(d.body ?? '')
          setRecipients(parseList(d.recipients))
          setCc(parseList(d.cc).join(', '))
          setBcc(parseList(d.bcc).join(', '))
          if (d.tone) setTone(d.tone as Tone)
          return
        }
        const sentId = replyId ?? forwardId
        if (!sentId) return
        interface SentRowShape {
          id: string
          draft_id: string
          recipient_email: string
        }
        const sentResp = await http.get<SentRowShape>(`/sent-emails/${sentId}`)
        if (cancelled) return
        const sent = sentResp.data
        const draftResp = await http.get<DraftRecord>(`/drafts/${sent.draft_id}`)
        if (cancelled) return
        const original = draftResp.data
        const origSubject = original.subject ?? ''
        const origBody = original.body ?? ''
        // Reply uses "Re:" prefix and pre-fills the original recipient. Forward
        // uses "Fwd:" prefix and starts with no recipients (the user picks).
        if (replyId) {
          setSubject(/^Re:\s/i.test(origSubject) ? origSubject : `Re: ${origSubject}`)
          setRecipients(sent.recipient_email ? [sent.recipient_email] : [])
        } else {
          setSubject(/^Fwd:\s/i.test(origSubject) ? origSubject : `Fwd: ${origSubject}`)
          setRecipients([])
        }
        setBody(
          `\n\n--- ${replyId ? 'On previous send, you wrote' : 'Forwarded message'} ---\n${origBody}`,
        )
        setDraftId(null)
      } catch (err) {
        if (!cancelled) setErrorMessage(getErrorMessage(err, 'Could not load draft.'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, params])

  const addRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && recipientInput.trim()) {
      e.preventDefault()
      const newOnes = splitRecipients(recipientInput)
      setRecipients((prev) => Array.from(new Set([...prev, ...newOnes])))
      setRecipientInput('')
    }
  }

  const flushRecipientInput = () => {
    if (!recipientInput.trim()) return
    const newOnes = splitRecipients(recipientInput)
    if (newOnes.length === 0) return
    setRecipients((prev) => Array.from(new Set([...prev, ...newOnes])))
    setRecipientInput('')
  }

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email))
  }

  const ensureDraftSaved = async (): Promise<DraftRecord> => {
    flushRecipientInput()
    const payload = {
      subject,
      body,
      recipients,
      cc: splitRecipients(cc),
      bcc: splitRecipients(bcc),
      tone,
    }
    if (draftId) {
      const response = await http.put<DraftRecord>(`/drafts/${draftId}`, payload)
      return response.data
    }
    const response = await http.post<DraftRecord>('/drafts', payload)
    setDraftId(response.data.id)
    return response.data
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const saved = await ensureDraftSaved()
      setStatusMessage(t('compose.savedAt', { id: saved.id }, { defaultValue: 'Draft saved' }))
    } catch (err) {
      setErrorMessage(
        getErrorMessage(err, t('compose.saveFailed', {}, { defaultValue: 'Could not save draft' })),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiCompose = async () => {
    if (!aiPrompt.trim()) return
    setIsGenerating(true)
    setErrorMessage(null)
    try {
      const response = await http.post<ComposeResponse>('/drafts/compose', {
        prompt: aiPrompt,
        tone,
      })
      setBody(response.data.body ?? body)
      setAiPrompt('')
      setStatusMessage(
        t(
          'compose.aiReady',
          {},
          { defaultValue: 'Draft ready — review and send when you are happy with it.' },
        ),
      )
    } catch (err) {
      setErrorMessage(
        getErrorMessage(
          err,
          t('compose.aiFailed', {}, { defaultValue: 'Could not compose draft' }),
        ),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdjustTone = async (newTone: Tone) => {
    setTone(newTone)
    if (!body.trim()) return
    setIsAdjusting(true)
    setErrorMessage(null)
    try {
      const draft = await ensureDraftSaved()
      const response = await http.post<AdjustToneResponse>(`/drafts/${draft.id}/adjust-tone`, {
        tone: newTone,
      })
      if (response.data.draft?.body) setBody(response.data.draft.body)
      setStatusMessage(
        t('compose.toneAdjusted', { tone: newTone }, { defaultValue: 'Rewrote in {{tone}} tone.' }),
      )
    } catch (err) {
      setErrorMessage(
        getErrorMessage(
          err,
          t('compose.toneFailed', {}, { defaultValue: 'Could not adjust tone' }),
        ),
      )
    } finally {
      setIsAdjusting(false)
    }
  }

  const handleSummarize = async () => {
    if (!body.trim()) return
    setIsSummarizing(true)
    setErrorMessage(null)
    setSummary(null)
    try {
      const draft = await ensureDraftSaved()
      const response = await http.post<SummaryResponse>(`/drafts/${draft.id}/summarize`)
      setSummary(response.data.summary ?? '')
    } catch (err) {
      setErrorMessage(
        getErrorMessage(
          err,
          t('compose.summarizeFailed', {}, { defaultValue: 'Could not summarize' }),
        ),
      )
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleSend = async () => {
    flushRecipientInput()
    if (recipients.length === 0) {
      setErrorMessage(
        t(
          'compose.recipientsRequired',
          {},
          { defaultValue: 'Add at least one recipient before sending.' },
        ),
      )
      return
    }
    if (!subject.trim()) {
      setErrorMessage(
        t('compose.subjectRequired', {}, { defaultValue: 'Add a subject before sending.' }),
      )
      return
    }
    setIsSending(true)
    setErrorMessage(null)
    try {
      const draft = await ensureDraftSaved()
      // Append the user's saved signature (Settings → Preferences) at send time
      // so it lands on every outgoing message without being baked into the
      // editable draft body. Previously the signature was stored + previewed but
      // never actually sent.
      const signature = loadPreferences().signature.trim()
      await http.post<SendResponse>(`/drafts/${draft.id}/send`, signature ? { signature } : {})
      setStatusMessage(t('compose.sent', {}, { defaultValue: 'Sent! Tracking it on the inbox.' }))
      navigate('/inbox?folder=sent')
    } catch (err) {
      setErrorMessage(
        getErrorMessage(err, t('compose.sendFailed', {}, { defaultValue: 'Could not send email' })),
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      data-mol-id="compose-page"
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 8),
        cm.maxW('7xl'),
        'mx-auto',
        cm.grid({ gap: 'lg' }),
        'grid-cols-1 lg:grid-cols-12 items-start',
      )}
    >
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'lg:col-span-8 bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('compose.eyebrow', {}, { defaultValue: 'New message' })}
            </p>
            <h1
              className={cm.cn(cm.textSize('2xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
            >
              {t('compose.heading', {}, { defaultValue: 'Compose' })}
            </h1>
          </div>
          <div className={cm.flex({ gap: 'sm' })}>
            <button
              type="button"
              data-mol-id="compose-save-draft"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg border border-outline hover:bg-surface-container-low transition-colors disabled:opacity-50',
              )}
            >
              {isSaving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
            </button>
            <button
              type="button"
              data-mol-id="compose-send"
              onClick={handleSend}
              disabled={isSending}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg text-white transition-all hover:shadow-md active:scale-95 disabled:opacity-50',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                send
              </span>
              {isSending
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('common.send', {}, { defaultValue: 'Send' })}
            </button>
          </div>
        </header>

        {(statusMessage || errorMessage) && (
          <div
            data-mol-id={errorMessage ? 'compose-error' : 'compose-status'}
            role={errorMessage ? 'alert' : 'status'}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mb', 4),
              cm.textSize('sm'),
              'rounded-lg',
              errorMessage
                ? 'bg-error-container text-on-error-container'
                : 'bg-success/10 text-success',
            )}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        <div className={cm.cn(cm.sp('mb', 4))}>
          <label
            htmlFor="compose-to"
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.toLabel', {}, { defaultValue: 'To' })}
          </label>
          <div
            data-mol-id="compose-recipients"
            className={cm.cn(
              cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.sp('mt', 2),
              'bg-surface-container-low rounded-lg border border-outline-variant/40 focus-within:border-primary',
            )}
          >
            {recipients.map((email) => (
              <span
                key={email}
                data-mol-id="compose-recipient-chip"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  'bg-primary/10 text-primary font-semibold',
                )}
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  aria-label={t(
                    'compose.removeRecipient',
                    { email },
                    { defaultValue: 'Remove {{email}}' },
                  )}
                  className={cm.cn('hover:opacity-70')}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    close
                  </span>
                </button>
              </span>
            ))}
            <input
              id="compose-to"
              data-mol-id="compose-to-input"
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={addRecipient}
              onBlur={flushRecipientInput}
              placeholder={t(
                'auth.passwordPlaceholderNameExample',
                {},
                { defaultValue: 'name@example.com' },
              )}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'flex-1 min-w-[160px] bg-transparent border-none outline-none focus:ring-0 placeholder:text-on-surface-variant',
              )}
            />
            <button
              type="button"
              data-mol-id="compose-toggle-cc-bcc"
              onClick={() => setShowCcBcc((v) => !v)}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:opacity-80',
              )}
            >
              {showCcBcc
                ? t('compose.hideCcBcc', {}, { defaultValue: 'Hide Cc / Bcc' })
                : t('compose.showCcBcc', {}, { defaultValue: 'Add Cc / Bcc' })}
            </button>
          </div>
        </div>

        {showCcBcc && (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 4))}>
            <input
              type="email"
              data-mol-id="compose-cc-input"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder={t('compose.ccPlaceholder', {}, { defaultValue: 'Cc — comma separated' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-low rounded-lg border border-outline-variant/40 outline-none focus:border-primary',
              )}
            />
            <input
              type="email"
              data-mol-id="compose-bcc-input"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder={t(
                'compose.bccPlaceholder',
                {},
                { defaultValue: 'Bcc — comma separated' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-low rounded-lg border border-outline-variant/40 outline-none focus:border-primary',
              )}
            />
          </div>
        )}

        <div className={cm.sp('mb', 4)}>
          <label
            htmlFor="compose-subject"
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.subjectLabel', {}, { defaultValue: 'Subject' })}
          </label>
          <input
            id="compose-subject"
            data-mol-id="compose-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t(
              'compose.subjectPlaceholder',
              {},
              { defaultValue: 'A clear, specific subject line' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 2),
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              cm.w('full'),
              'bg-surface-container-low rounded-lg border border-outline-variant/40 outline-none focus:border-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="compose-body"
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.bodyLabel', {}, { defaultValue: 'Body' })}
          </label>
          <textarea
            id="compose-body"
            data-mol-id="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder={t(
              'compose.bodyPlaceholder',
              { app: APP_NAME },
              {
                defaultValue: `Write your message — or click "Compose with ${APP_NAME}" to draft one for you.`,
              },
            )}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.sp('mt', 2),
              cm.w('full'),
              'bg-surface rounded-lg border border-outline-variant/40 outline-none focus:border-primary leading-relaxed text-base',
            )}
            style={{ fontFamily: 'Newsreader, Georgia, serif', lineHeight: 1.75 }}
          />
        </div>

        {summary && (
          <div
            data-mol-id="compose-summary"
            className={cm.cn(
              cm.sp('p', 4),
              cm.sp('mt', 4),
              'rounded-xl bg-info/10 border-l-2 border-info text-on-surface',
            )}
          >
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-info mb-2')}>
              {t('form.summary', {}, { defaultValue: 'Summary' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{summary}</p>
          </div>
        )}
      </section>

      <aside className={cm.cn('lg:col-span-4', cm.flex({ direction: 'col', gap: 'lg' }))}>
        <AiSuggestionPanel
          subtitle={t(
            'compose.copilotSubtitle',
            { app: APP_NAME },
            { defaultValue: `Steer the draft — ${APP_NAME} rewrites in seconds.` },
          )}
        >
          <div>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
              )}
            >
              {t('compose.toneLabel', {}, { defaultValue: 'Tone' })}
            </p>
            <TonePillRow value={tone} onChange={(next) => void handleAdjustTone(next)} />
            {isAdjusting && (
              <p
                data-mol-id="compose-tone-busy"
                className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}
              >
                {t('compose.adjustingTone', {}, { defaultValue: 'Rewriting in selected tone…' })}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="compose-ai-prompt"
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 block',
              )}
            >
              {t('compose.draftFromIdea', {}, { defaultValue: 'Draft from a quick prompt' })}
            </label>
            <textarea
              id="compose-ai-prompt"
              data-mol-id="compose-ai-prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder={t(
                'compose.aiPromptPlaceholder',
                {},
                {
                  defaultValue:
                    'e.g. "Polite follow-up after no reply for two weeks, keep it short."',
                },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.w('full'),
                'bg-surface rounded-lg border border-outline-variant/40 outline-none focus:border-primary',
              )}
            />
            <button
              type="button"
              data-mol-id="compose-ai-button"
              onClick={handleAiCompose}
              disabled={isGenerating || !aiPrompt.trim()}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.w('full'),
                'rounded-xl text-white transition-all hover:shadow-md disabled:opacity-50',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                auto_awesome
              </span>
              {isGenerating
                ? t('compose.generating', {}, { defaultValue: 'Composing…' })
                : t(
                    'compose.composeWithAi',
                    { app: APP_NAME },
                    { defaultValue: `Compose with ${APP_NAME}` },
                  )}
            </button>
          </div>
        </AiSuggestionPanel>

        <AiSuggestionPanel
          title={t('compose.suggestionsTitle', {}, { defaultValue: 'Smart suggestions' })}
          subtitle={t(
            'compose.suggestionsSubtitle',
            {},
            { defaultValue: 'One-tap rewrites for the current draft.' },
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <button
              type="button"
              data-mol-id="compose-suggestion-summarize"
              onClick={handleSummarize}
              disabled={isSummarizing || !body.trim()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface text-left hover:bg-surface-container transition-colors border border-outline-variant/30 disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base text-primary')}
                aria-hidden="true"
              >
                short_text
              </span>
              {isSummarizing
                ? t('compose.summarizing', {}, { defaultValue: 'Summarizing…' })
                : t(
                    'compose.suggestion.summarize',
                    {},
                    { defaultValue: 'Summarize current draft' },
                  )}
            </button>
            <button
              type="button"
              data-mol-id="compose-suggestion-friendly"
              onClick={() => void handleAdjustTone('friendly')}
              disabled={isAdjusting || !body.trim()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface text-left hover:bg-surface-container transition-colors border border-outline-variant/30 disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base text-primary')}
                aria-hidden="true"
              >
                translate
              </span>
              {t(
                'compose.suggestion.friendly',
                {},
                { defaultValue: 'Translate to a Friendly tone' },
              )}
            </button>
            <button
              type="button"
              data-mol-id="compose-suggestion-concise"
              onClick={() => void handleAdjustTone('concise')}
              disabled={isAdjusting || !body.trim()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface text-left hover:bg-surface-container transition-colors border border-outline-variant/30 disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base text-primary')}
                aria-hidden="true"
              >
                rule
              </span>
              {t(
                'compose.suggestion.concise',
                {},
                { defaultValue: 'Tighten and shorten the draft' },
              )}
            </button>
          </div>
        </AiSuggestionPanel>
      </aside>
    </div>
  )
}

export default Compose
export { Compose as ComposePage }
