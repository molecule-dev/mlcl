import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PollStatusPill } from '../components/PollStatusPill.js'
import { type QuestionType, QuestionTypeBadge } from '../components/QuestionTypeBadge.js'
import { unwrap } from '../lib/api.js'

interface PollRow {
  id: string
  title: string
  description?: string | null
  type: QuestionType
  status: 'draft' | 'active' | 'closed'
  options: unknown
  allow_anonymous?: boolean
  max_votes_per_user?: number
}

function normalizeOptions(opts: unknown): { id: string; label: string }[] {
  if (!Array.isArray(opts)) return []
  return opts.map((o, i) => {
    if (typeof o === 'string') return { id: `o-${i}`, label: o }
    if (o && typeof o === 'object' && 'label' in (o as object)) {
      return { id: `o-${i}`, label: String((o as { label: unknown }).label) }
    }
    return { id: `o-${i}`, label: `Option ${i + 1}` }
  })
}

export function Ballot() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [poll, setPoll] = useState<PollRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [multiSelected, setMultiSelected] = useState<Set<number>>(new Set())
  const [openText, setOpenText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await http.get<PollRow>(`/api/polls/${id}`)
      const data = unwrap<PollRow>(res.data)
      setPoll(data ?? null)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 404) {
        setLoadError(t('ballot.notFound', {}, { defaultValue: 'This poll could not be found.' }))
      } else {
        setLoadError((err as Error).message ?? 'Failed to load')
      }
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const options = useMemo(() => normalizeOptions(poll?.options), [poll])

  const canSubmit = useMemo(() => {
    if (!poll || poll.status !== 'active') return false
    if (poll.type === 'single-choice') return selected !== null
    if (poll.type === 'multiple-choice') return multiSelected.size > 0
    if (poll.type === 'ranked') return options.length > 0
    if (poll.type === 'open-text') return openText.trim().length > 0
    return false
  }, [poll, selected, multiSelected, options, openText])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!poll || submitting || !canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: Record<string, unknown> = { poll_id: poll.id }
      if (poll.type === 'single-choice') {
        payload.option_index = selected
      } else if (poll.type === 'multiple-choice') {
        payload.option_index = Array.from(multiSelected.values()).sort()
      } else if (poll.type === 'ranked') {
        payload.ranked_choices = options.map((_, i) => i)
      } else if (poll.type === 'open-text') {
        payload.open_text = openText.trim()
      }
      await http.post('/api/votes', payload)
      track({
        name: 'vote.cast',
        properties: { pollId: poll.id, pollType: poll.type },
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          t('ballot.submitFailed', {}, { defaultValue: 'Failed to submit ballot.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('ballot.loading', {}, { defaultValue: 'Loading ballot…' })}
      </div>
    )
  }

  if (loadError || !poll) {
    return (
      <div
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        <p>
          {loadError ?? t('ballot.notFound', {}, { defaultValue: 'This poll could not be found.' })}
        </p>
        <Link
          to="/dashboard"
          className={cm.cn('mt-4 inline-block font-bold text-primary hover:underline')}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 16),
          cm.flex({ align: 'center', justify: 'center' }),
        )}
      >
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.maxW('xl'),
            'w-full rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary text-center relative overflow-hidden shadow-md shadow-primary/20',
          )}
          data-test="ballot-thanks"
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-surface/10 blur-3xl pointer-events-none',
            )}
          />
          <span
            className={cm.cn(
              'relative inline-grid h-20 w-20 place-items-center rounded-full bg-surface/15 material-symbols-outlined text-[44px]',
            )}
            aria-hidden="true"
          >
            check_circle
          </span>
          <h2
            className={cm.cn(
              cm.sp('mt', 6),
              cm.textSize('3xl'),
              'font-extrabold tracking-tight relative',
            )}
          >
            {t('ballot.thanks', {}, { defaultValue: 'Ballot submitted' })}
          </h2>
          <p className={cm.cn(cm.sp('mt', 3), 'text-on-primary/80 relative')}>
            {t('ballot.thanksBody', {}, { defaultValue: 'Your vote is sealed in the audit log.' })}
          </p>
          <Link
            to={`/polls/${poll.id}/live`}
            className={cm.cn(
              cm.sp('mt', 8),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'relative inline-flex items-center gap-2 rounded-xl bg-surface/95 text-primary hover:bg-surface transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              query_stats
            </span>
            {t('ballot.viewLive', {}, { defaultValue: 'See live results' })}
          </Link>
        </div>
      </div>
    )
  }

  const status = poll.status === 'active' ? 'live' : poll.status === 'closed' ? 'closed' : 'draft'

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 12),
        cm.flex({ direction: 'col', align: 'center' }),
      )}
    >
      <div className={cm.cn(cm.maxW('xl'), 'w-full', cm.stack(8))}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('ballot.eyebrow', {}, { defaultValue: 'Cast your ballot' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
            data-test="ballot-title"
          >
            {poll.title}
          </h1>
          {poll.description ? (
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
              {poll.description}
            </p>
          ) : null}
          <div
            className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <PollStatusPill status={status} emphasis />
            <QuestionTypeBadge type={poll.type} size="md" />
            <span className={cm.cn('text-xs font-mono text-on-surface-variant')}>
              {t('ballot.pollId', { id: poll.id }, { defaultValue: 'poll · {{id}}' })}
            </span>
          </div>
        </div>

        {poll.status !== 'active' ? (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-warning/30 bg-warning/5 text-warning text-sm font-semibold',
            )}
          >
            {poll.status === 'draft'
              ? t(
                  'ballot.notPublished',
                  {},
                  {
                    defaultValue:
                      'This poll is not yet published. Open it from the dashboard to publish before voting.',
                  },
                )
              : t(
                  'ballot.alreadyClosed',
                  {},
                  {
                    defaultValue: 'This poll is closed. View the final results from the dashboard.',
                  },
                )}
          </div>
        ) : null}

        {submitError ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
            )}
            data-test="ballot-error"
          >
            {submitError}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.stack(6),
          )}
        >
          {poll.type === 'open-text' ? (
            <fieldset className={cm.stack(3)}>
              <legend className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('ballot.openLegend', {}, { defaultValue: 'Your response' })}
              </legend>
              <textarea
                value={openText}
                onChange={(e) => setOpenText(e.target.value)}
                rows={6}
                aria-label={t('ballot.openAria', {}, { defaultValue: 'Open response' })}
                placeholder={t(
                  'ballot.openPlaceholder',
                  {},
                  { defaultValue: 'Type your response…' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('base'),
                  'w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
                data-test="ballot-open-text"
              />
            </fieldset>
          ) : (
            <fieldset className={cm.stack(3)}>
              <legend className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {poll.type === 'multiple-choice'
                  ? t('ballot.multiOptions', {}, { defaultValue: 'Pick all that apply' })
                  : poll.type === 'ranked'
                    ? t(
                        'ballot.rankedOptions',
                        {},
                        { defaultValue: 'Submit in this order to log your ranked vote' },
                      )
                    : t('ballot.singleOptions', {}, { defaultValue: 'Cast your vote' })}
              </legend>
              <ul className={cm.stack(3)}>
                {options.map((o, i) => {
                  const isSelected =
                    poll.type === 'multiple-choice' ? multiSelected.has(i) : selected === i
                  return (
                    <li key={o.id}>
                      <label
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 4),
                          'flex items-start gap-4 rounded-xl border-2 cursor-pointer transition-all min-h-[64px]',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                            : 'border-outline-variant/40 hover:border-primary/50',
                        )}
                      >
                        <input
                          type={poll.type === 'multiple-choice' ? 'checkbox' : 'radio'}
                          name="ballot"
                          value={i}
                          checked={isSelected}
                          onChange={() => {
                            if (poll.type === 'multiple-choice') {
                              const next = new Set(multiSelected)
                              if (next.has(i)) next.delete(i)
                              else if (next.size < (poll.max_votes_per_user ?? 1)) next.add(i)
                              setMultiSelected(next)
                            } else {
                              setSelected(i)
                            }
                          }}
                          className="sr-only"
                          data-test={`ballot-option-${i}`}
                        />
                        <span
                          className={cm.cn(
                            'mt-0.5 grid h-6 w-6 place-items-center transition-colors shrink-0',
                            poll.type === 'multiple-choice' ? 'rounded-md' : 'rounded-full',
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'border-2 border-outline-variant/50',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected ? (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          ) : null}
                        </span>
                        <div className={cm.cn('flex-1')}>
                          <p className={cm.cn('text-base font-extrabold text-on-surface')}>
                            {o.label}
                          </p>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'w-full rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-40 transition-opacity',
            )}
            data-test="ballot-submit"
          >
            {submitting
              ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
              : t('ballot.submit', {}, { defaultValue: 'Submit ballot' })}
          </button>

          <p className={cm.cn('text-center text-xs text-on-surface-variant')}>
            {t(
              'ballot.legal',
              {},
              {
                defaultValue:
                  'Encrypted in transit. Stored for the audit window per your jurisdiction.',
              },
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
