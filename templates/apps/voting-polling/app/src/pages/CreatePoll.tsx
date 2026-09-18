import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type QuestionType, QuestionTypeBadge } from '../components/QuestionTypeBadge.js'
import { unwrap } from '../lib/api.js'

const QUESTION_TYPES: { type: QuestionType; defaultLabel: string; defaultBlurb: string }[] = [
  {
    type: 'single-choice',
    defaultLabel: 'Single choice',
    defaultBlurb: 'One winner, ranked by tally.',
  },
  {
    type: 'multiple-choice',
    defaultLabel: 'Multiple choice',
    defaultBlurb: 'Pick all that apply, votes cap configurable.',
  },
  {
    type: 'ranked',
    defaultLabel: 'Ranked',
    defaultBlurb: 'Order preferences — instant runoff scoring.',
  },
  {
    type: 'open-text',
    defaultLabel: 'Open text',
    defaultBlurb: 'Free response with sentiment + word cloud.',
  },
]

interface CreatedPoll {
  id: string
  title: string
  status: string
}

export function CreatePoll() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<QuestionType>('single-choice')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [quorumPct, setQuorumPct] = useState(60)
  const [maxVotes, setMaxVotes] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateOption(index: number, value: string) {
    setOptions(options.map((o, i) => (i === index ? value : o)))
  }

  function addOption() {
    setOptions([...options, ''])
  }

  function removeOption(index: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  async function persist(intent: 'draft' | 'publish'): Promise<CreatedPoll | null> {
    setSubmitting(true)
    setError(null)
    try {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        setError(
          t(
            'createPoll.error.titleRequired',
            {},
            { defaultValue: 'Please enter a question title.' },
          ),
        )
        return null
      }
      const cleanOpts = options.map((o) => o.trim()).filter(Boolean)
      if (type !== 'open-text' && cleanOpts.length < 2) {
        setError(
          t(
            'createPoll.error.optionsRequired',
            {},
            { defaultValue: 'At least two non-empty options are required.' },
          ),
        )
        return null
      }
      const payload: Record<string, unknown> = {
        title: trimmedTitle,
        type,
        allow_anonymous: allowAnonymous,
        max_votes_per_user: type === 'multiple-choice' ? Math.max(maxVotes, 1) : 1,
      }
      if (quorumPct > 0) payload.quorum_threshold = quorumPct
      if (type !== 'open-text') payload.options = cleanOpts
      const created = await http.post<{ data?: CreatedPoll } | CreatedPoll>('/api/polls', payload)
      const poll = unwrap<CreatedPoll>(created.data)
      if (!poll?.id) {
        setError(
          t('createPoll.error.createFailed', {}, { defaultValue: 'Could not save the poll.' }),
        )
        return null
      }
      if (intent === 'publish') {
        await http.post<unknown>(`/api/polls/${poll.id}/publish`, {})
      }
      return poll
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          t(
            'createPoll.error.unknown',
            {},
            { defaultValue: 'Something went wrong saving the poll.' },
          ),
      )
      return null
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const poll = await persist('publish')
    if (poll) navigate(`/polls/${poll.id}/live`, { replace: true })
  }

  async function handleSaveDraft() {
    if (submitting) return
    const poll = await persist('draft')
    if (poll) navigate(`/polls/${poll.id}`, { replace: true })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('createPoll.eyebrow', {}, { defaultValue: 'New ballot' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('createPoll.heading', {}, { defaultValue: 'Open the floor' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
            {t(
              'createPoll.subheading',
              {},
              {
                defaultValue:
                  'Configure the question, eligibility, and quorum threshold — publish when ready.',
              },
            )}
          </p>
        </div>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            close
          </span>
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </Link>
      </header>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
          data-test="createpoll-error"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.stack(8),
        )}
      >
        <section className={cm.stack(3)}>
          <label
            htmlFor="poll-title"
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
          >
            {t('createPoll.titleLabel', {}, { defaultValue: 'Question' })}
          </label>
          <input
            id="poll-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'createPoll.titlePlaceholder',
              {},
              { defaultValue: 'e.g. Adopt the revised 2026 charter?' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 4),
              cm.textSize('lg'),
              'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
            )}
          />
        </section>

        <section className={cm.stack(3)}>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('createPoll.typeLabel', {}, { defaultValue: 'Question type' })}
          </p>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {QUESTION_TYPES.map((qt) => {
              const selected = qt.type === type
              return (
                <button
                  key={qt.type}
                  type="button"
                  onClick={() => setType(qt.type)}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl text-left border transition-all',
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                      : 'border-outline-variant/30 hover:border-primary/50',
                  )}
                  aria-pressed={selected}
                  data-test={`createpoll-type-${qt.type}`}
                >
                  <QuestionTypeBadge type={qt.type} />
                  <p
                    className={cm.cn(
                      cm.sp('mt', 3),
                      cm.textSize('sm'),
                      'font-extrabold text-on-surface',
                    )}
                  >
                    {t(`createPoll.type.${qt.type}.label`, {}, { defaultValue: qt.defaultLabel })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
                    {t(`createPoll.type.${qt.type}.blurb`, {}, { defaultValue: qt.defaultBlurb })}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {type !== 'open-text' ? (
          <section className={cm.stack(3)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('createPoll.optionsLabel', {}, { defaultValue: 'Options' })}
            </p>
            <ul className={cm.stack(3)} data-test="createpoll-options">
              {options.map((opt, i) => (
                <li key={i} className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums shrink-0',
                    )}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    aria-label={t(
                      'createPoll.optionAria',
                      { number: i + 1 },
                      { defaultValue: 'Option {{number}}' },
                    )}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={t(
                      'createPoll.optionPlaceholder',
                      { number: i + 1 },
                      { defaultValue: 'Option {{number}}' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'flex-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className={cm.cn(
                      'grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error disabled:opacity-30 transition-colors',
                    )}
                    aria-label={t('createPoll.removeOption', {}, { defaultValue: 'Remove option' })}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addOption}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 self-start rounded-full bg-primary/10 text-primary uppercase tracking-widest hover:bg-primary/15 transition-colors',
              )}
              data-test="createpoll-add-option"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                add
              </span>
              {t('createPoll.addOption', {}, { defaultValue: 'Add option' })}
            </button>
          </section>
        ) : null}

        <section className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <label
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-outline-variant/30 flex items-center gap-3',
            )}
          >
            <input
              type="checkbox"
              checked={allowAnonymous}
              onChange={(e) => setAllowAnonymous(e.target.checked)}
              className={cm.cn('accent-primary h-4 w-4')}
              data-test="createpoll-anonymous"
            />
            <div>
              <p className={cm.cn('text-sm font-extrabold text-on-surface')}>
                {t('createPoll.anonymousLabel', {}, { defaultValue: 'Allow anonymous voting' })}
              </p>
              <p className={cm.cn('text-xs text-on-surface-variant')}>
                {t(
                  'createPoll.anonymousHint',
                  {},
                  {
                    defaultValue: 'Voter names hidden in audit log; tallies remain authenticated.',
                  },
                )}
              </p>
            </div>
          </label>
          <label
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl border border-outline-variant/30 flex flex-col gap-2',
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('createPoll.quorumLabel', {}, { defaultValue: 'Quorum threshold' })}
            </span>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <input
                type="range"
                min={0}
                max={100}
                value={quorumPct}
                aria-label={t('createPoll.quorumLabel', {}, { defaultValue: 'Quorum threshold' })}
                onChange={(e) => setQuorumPct(Number(e.target.value))}
                className={cm.cn('flex-1 accent-primary')}
                data-test="createpoll-quorum"
              />
              <span
                className={cm.cn(
                  'font-mono text-base font-extrabold tabular-nums text-on-surface w-12 text-right',
                )}
              >
                {quorumPct}%
              </span>
            </div>
            <p className={cm.cn('text-xs text-on-surface-variant')}>
              {t(
                'createPoll.quorumHint',
                {},
                {
                  defaultValue:
                    'Result auto-certifies when this share of the eligible roll has voted.',
                },
              )}
            </p>
          </label>
        </section>

        {type === 'multiple-choice' ? (
          <section className={cm.stack(2)}>
            <label
              htmlFor="poll-max-votes"
              className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
            >
              {t('createPoll.maxVotesLabel', {}, { defaultValue: 'Max selections per voter' })}
            </label>
            <input
              id="poll-max-votes"
              type="number"
              min={1}
              max={20}
              value={maxVotes}
              onChange={(e) => setMaxVotes(Number(e.target.value))}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'w-32 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
              )}
            />
          </section>
        ) : null}

        <footer
          className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}
        >
          <p className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'createPoll.footnote',
              {},
              {
                defaultValue:
                  'Drafts are saved automatically. Publish to open the ballot to voters.',
              },
            )}
          </p>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors',
              )}
              data-test="createpoll-save-draft"
            >
              {t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-opacity',
              )}
              data-test="createpoll-publish"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                publish
              </span>
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('createPoll.publish', {}, { defaultValue: 'Publish ballot' })}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
