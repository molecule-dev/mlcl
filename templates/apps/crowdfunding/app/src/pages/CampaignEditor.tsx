import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { api } from '../lib/api.js'

const STEPS = ['basics', 'rewards', 'story', 'review'] as const

type StepKey = (typeof STEPS)[number]

interface DraftTier {
  title: string
  description: string
  amount: string
  max_backers: string
  estimated_delivery: string
}

const EMPTY_TIER: DraftTier = {
  title: '',
  description: '',
  amount: '',
  max_backers: '',
  estimated_delivery: '',
}

export function CampaignEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [step, setStep] = useState<StepKey>('basics')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Tech')
  const [goal, setGoal] = useState('25000')
  const [duration, setDuration] = useState('30')
  const [tagline, setTagline] = useState('')
  const [story, setStory] = useState('')
  const [tiers, setTiers] = useState<DraftTier[]>([{ ...EMPTY_TIER }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100

  const stepLabels: Record<StepKey, string> = {
    basics: t('campaignEditor.step.basics', {}, { defaultValue: 'Basics' }),
    rewards: t('campaignEditor.step.rewards', {}, { defaultValue: 'Rewards' }),
    story: t('campaignEditor.step.story', {}, { defaultValue: 'Story' }),
    review: t('campaignEditor.step.review', {}, { defaultValue: 'Review' }),
  }

  const updateTier = (i: number, patch: Partial<DraftTier>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  const addTier = () => setTiers((prev) => [...prev, { ...EMPTY_TIER }])
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i))

  const validateAndAdvance = (): boolean => {
    setError(null)
    if (step === 'basics') {
      if (!title.trim()) {
        setError(t('campaignEditor.error.title', {}, { defaultValue: 'Title is required' }))
        return false
      }
      if (!Number(goal) || Number(goal) <= 0) {
        setError(
          t('campaignEditor.error.goal', {}, { defaultValue: 'Goal must be a positive number' }),
        )
        return false
      }
      if (!Number(duration) || Number(duration) <= 0) {
        setError(
          t(
            'campaignEditor.error.duration',
            {},
            { defaultValue: 'Duration must be a positive number' },
          ),
        )
        return false
      }
    }
    if (step === 'rewards') {
      const validTiers = tiers.filter((t) => t.title.trim() && Number(t.amount) > 0)
      if (validTiers.length === 0) {
        setError(
          t(
            'campaignEditor.error.tiers',
            {},
            { defaultValue: 'Add at least one reward tier with a title and amount' },
          ),
        )
        return false
      }
    }
    return true
  }

  const handleNext = async () => {
    if (!validateAndAdvance()) return
    if (step !== 'review') {
      const next = STEPS[stepIndex + 1]
      if (next) setStep(next)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const endDate = new Date(
        Date.now() + Math.max(1, Number(duration)) * 86_400_000,
      ).toISOString()
      const created = await api.createCampaign(http, {
        title: title.trim(),
        description: story.trim() || tagline.trim(),
        goal_amount: Number(goal),
        end_date: endDate,
        category,
      })
      const validTiers = tiers.filter((t) => t.title.trim() && Number(t.amount) > 0)
      for (const tier of validTiers) {
        await api.createTier(http, {
          campaign_id: created.id,
          title: tier.title.trim(),
          description: tier.description.trim(),
          amount: Number(tier.amount),
          max_backers: tier.max_backers ? Number(tier.max_backers) : null,
          estimated_delivery: tier.estimated_delivery.trim() || null,
        })
      }
      await api.publishCampaign(http, created.id)
      navigate(`/campaign/${created.id}/manage`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('campaignEditor.error.publish', {}, { defaultValue: 'Failed to create campaign' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.mxAuto,
        cm.w('full'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.stack(8),
      )}
      data-mol-id="page-campaign-editor"
    >
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('campaignEditor.eyebrow', {}, { defaultValue: 'New campaign' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('campaignEditor.heading', {}, { defaultValue: 'Set the stage for your launch' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'campaignEditor.subheading',
            {},
            { defaultValue: 'A guided wizard — every step polished before backers see it.' },
          )}
        </p>
      </header>

      <div className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'gap-4')}>
          {STEPS.map((s, i) => {
            const reached = i <= stepIndex
            return (
              <button
                key={s}
                type="button"
                // Only already-reached steps are clickable — advancing goes
                // through the Continue button so each step gets validated.
                onClick={() => i <= stepIndex && setStep(s)}
                disabled={i > stepIndex}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full transition-all',
                  reached
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container text-on-surface-variant cursor-not-allowed',
                )}
                data-mol-id={`step-${s}`}
              >
                <span
                  className={cm.cn(
                    cm.w(6),
                    cm.h(6),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    reached
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {i + 1}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {stepLabels[s]}
                </span>
              </button>
            )
          })}
        </div>
        <div className={cm.cn('h-1 rounded-full bg-surface-container overflow-hidden')}>
          <div
            className={cm.cn(cm.h(1), cm.roundedFull, 'bg-primary transition-all duration-500')}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <form
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(6),
          'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
        )}
        onSubmit={(e) => {
          e.preventDefault()
          void handleNext()
        }}
      >
        {step === 'basics' && (
          <div className={cm.stack(5)}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('campaignEditor.basics.title', {}, { defaultValue: 'Campaign basics' })}
            </h2>
            <FieldText
              id="title"
              label={t('form.title', {}, { defaultValue: 'Title' })}
              value={title}
              onChange={setTitle}
              placeholder={t(
                'campaignEditor.basics.titlePlaceholder',
                {},
                { defaultValue: 'A short, memorable name' },
              )}
            />
            <FieldText
              id="tagline"
              label={t('campaignEditor.basics.taglineLabel', {}, { defaultValue: 'Tagline' })}
              value={tagline}
              onChange={setTagline}
              placeholder={t(
                'campaignEditor.basics.taglinePlaceholder',
                {},
                { defaultValue: 'One sentence that hooks a backer' },
              )}
            />
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}>
              <FieldSelect
                id="category"
                label={t('form.category', {}, { defaultValue: 'Category' })}
                value={category}
                onChange={setCategory}
                options={['Tech', 'Design', 'Film', 'Games', 'Music', 'Food', 'Art']}
              />
              <FieldText
                id="goal"
                label={t('campaignEditor.basics.goalLabel', {}, { defaultValue: 'Goal (USD)' })}
                value={goal}
                onChange={setGoal}
                placeholder="25000"
                inputMode="numeric"
              />
              <FieldText
                id="duration"
                label={t(
                  'campaignEditor.basics.durationLabel',
                  {},
                  { defaultValue: 'Duration (days)' },
                )}
                value={duration}
                onChange={setDuration}
                placeholder="30"
                inputMode="numeric"
              />
            </div>
          </div>
        )}

        {step === 'rewards' && (
          <div className={cm.stack(5)} data-mol-id="editor-tiers">
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('campaignEditor.rewards.title', {}, { defaultValue: 'Reward tiers' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'campaignEditor.rewards.body',
                {},
                {
                  defaultValue:
                    'Add reward tiers, set delivery dates, and limit founders editions.',
                },
              )}
            </p>
            {tiers.map((tier, i) => (
              <div
                key={i}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(3),
                  'rounded-lg border border-outline-variant bg-surface-container-low',
                )}
                data-mol-id={`tier-row-${i}`}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('campaignEditor.rewards.tier', { n: i + 1 }, { defaultValue: 'Tier {{n}}' })}
                  </span>
                  {tiers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className={cm.cn(cm.textSize('xs'), 'text-error hover:underline')}
                      data-mol-id={`tier-remove-${i}`}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  ) : null}
                </div>
                <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
                  <FieldText
                    id={`tier-title-${i}`}
                    label={t('form.title', {}, { defaultValue: 'Title' })}
                    value={tier.title}
                    onChange={(v) => updateTier(i, { title: v })}
                    placeholder={t(
                      'campaignEditor.rewards.titlePlaceholder',
                      {},
                      { defaultValue: 'Early Bird' },
                    )}
                  />
                  <FieldText
                    id={`tier-amount-${i}`}
                    label={t(
                      'campaignEditor.rewards.amountLabel',
                      {},
                      { defaultValue: 'Amount (USD)' },
                    )}
                    value={tier.amount}
                    onChange={(v) => updateTier(i, { amount: v })}
                    inputMode="numeric"
                    placeholder="120"
                  />
                </div>
                <FieldText
                  id={`tier-desc-${i}`}
                  label={t('form.description', {}, { defaultValue: 'Description' })}
                  value={tier.description}
                  onChange={(v) => updateTier(i, { description: v })}
                  placeholder={t(
                    'campaignEditor.rewards.descPlaceholder',
                    {},
                    { defaultValue: 'What backers get at this tier' },
                  )}
                />
                <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
                  <FieldText
                    id={`tier-max-${i}`}
                    label={t(
                      'campaignEditor.rewards.maxLabel',
                      {},
                      { defaultValue: 'Max backers (optional)' },
                    )}
                    value={tier.max_backers}
                    onChange={(v) => updateTier(i, { max_backers: v })}
                    inputMode="numeric"
                    placeholder="500"
                  />
                  <FieldText
                    id={`tier-eta-${i}`}
                    label={t(
                      'campaignEditor.rewards.etaLabel',
                      {},
                      { defaultValue: 'Estimated delivery' },
                    )}
                    value={tier.estimated_delivery}
                    onChange={(v) => updateTier(i, { estimated_delivery: v })}
                    placeholder={t(
                      'campaignEditor.rewards.etaPlaceholder',
                      {},
                      { defaultValue: 'Mar 2027' },
                    )}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addTier}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                'rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
              )}
              data-mol-id="editor-add-tier"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                add_circle
              </span>
              {t('campaignEditor.rewards.addAnother', {}, { defaultValue: 'Add another tier' })}
            </button>
          </div>
        )}

        {step === 'story' && (
          <div className={cm.stack(4)}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('campaignEditor.story.title', {}, { defaultValue: 'Tell your story' })}
            </h2>
            <textarea
              rows={10}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                cm.fontWeight('medium'),
                'rounded-lg border border-outline-variant bg-surface-container-low resize-y text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
              placeholder={t(
                'campaignEditor.story.placeholder',
                {},
                { defaultValue: 'Why does this matter? Who will you delight?' },
              )}
              data-mol-id="editor-story"
            />
          </div>
        )}

        {step === 'review' && (
          <div className={cm.stack(4)} data-mol-id="editor-review">
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('campaignEditor.review.title', {}, { defaultValue: 'Almost ready to launch' })}
            </h2>
            <ul className={cm.stack(2)}>
              <ReviewRow
                label={t('form.title', {}, { defaultValue: 'Title' })}
                value={title || '—'}
              />
              <ReviewRow
                label={t('form.category', {}, { defaultValue: 'Category' })}
                value={category}
              />
              <ReviewRow
                label={t('campaignEditor.review.goalLabel', {}, { defaultValue: 'Goal' })}
                value={`$${Number(goal).toLocaleString()}`}
              />
              <ReviewRow
                label={t('form.duration', {}, { defaultValue: 'Duration' })}
                value={t(
                  'campaignEditor.review.durationValue',
                  { count: Number(duration) },
                  { defaultValue: '{{count}} days' },
                )}
              />
              <ReviewRow
                label={t('campaignEditor.review.tiersLabel', {}, { defaultValue: 'Reward tiers' })}
                value={String(tiers.filter((t) => t.title.trim() && Number(t.amount) > 0).length)}
              />
            </ul>
          </div>
        )}

        {error ? (
          <div className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="editor-error">
            {error}
          </div>
        ) : null}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('pt', 4),
            'border-t border-outline-variant',
          )}
        >
          <button
            type="button"
            onClick={() => stepIndex > 0 && setStep(STEPS[stepIndex - 1])}
            disabled={stepIndex === 0}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant rounded-lg hover:bg-surface-container disabled:opacity-40',
            )}
          >
            {t('campaignEditor.back', {}, { defaultValue: '← Back' })}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg text-white shadow-sm hover:shadow-md active:scale-95 transition-all disabled:opacity-50',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            }}
            data-mol-id="editor-next"
          >
            {submitting
              ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
              : step === 'review'
                ? t('campaignEditor.publish', {}, { defaultValue: 'Publish campaign' })
                : t('common.continue', {}, { defaultValue: 'Continue' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function FieldText({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric'
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('medium'),
          'rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
        )}
      />
    </div>
  )
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: ReadonlyArray<string>
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('medium'),
          'rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('py', 3),
        'border-b border-outline-variant',
      )}
    >
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <span className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{value}</span>
    </li>
  )
}

export default CampaignEditor
