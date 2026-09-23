import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const PERKS = [
  {
    icon: 'payments',
    title: 'Set your own rate',
    body: `Most ${APP_NAME} tutors earn $40–$120 / hour. We never take a cut from upsells.`,
  },
  {
    icon: 'schedule',
    title: 'Teach when you want',
    body: 'Block off hours that work for you. Learners can only book your open slots.',
  },
  {
    icon: 'workspace_premium',
    title: 'Build a verified rep',
    body: 'Real student reviews, badge tiers, and discoverability you actually own.',
  },
]

const SUBJECT_OPTIONS = [
  'Math',
  'Science',
  'Languages',
  'Coding',
  'Music',
  'Test prep',
  'Humanities',
  'Business',
] as const

type TutorRow = { id: string }

export function BecomeTutor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const [name, setName] = useState((user?.name as string | undefined) ?? '')
  const [email, setEmail] = useState((user?.email as string | undefined) ?? '')
  const [rate, setRate] = useState(60)
  const [pitch, setPitch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const toggleSubject = (subject: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(subject)) next.delete(subject)
      else next.add(subject)
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const subjectsArray = Array.from(selected)
      const response = (await http.post<TutorRow>('/api/tutors', {
        display_name: name.trim() || (user?.email ?? 'New Tutor'),
        headline: pitch.split('\n')[0]?.slice(0, 120) || undefined,
        bio: pitch.trim() || undefined,
        hourly_rate: Math.max(0, Math.round(rate)),
        subject: subjectsArray[0],
        subjects: subjectsArray,
      })) as { data?: TutorRow | null }
      if (response.data?.id) {
        setSubmitted(true)
        void track({
          name: 'tutor.profile_created',
          properties: { tutorId: response.data.id },
        })
        setTimeout(() => navigate(`/tutor/${response.data!.id}`), 1200)
      } else {
        setErrorMessage(
          t('becomeTutor.form.error', {}, { defaultValue: 'Could not submit application.' }),
        )
      }
    } catch (err) {
      setErrorMessage(
        (err as { message?: string }).message ??
          t('becomeTutor.form.error', {}, { defaultValue: 'Could not submit application.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
          cm.sp('p', 10),
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--mol-color-primary) 50%, #0d9488 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div className={cm.cn('relative z-10 max-w-2xl', cm.stack(3))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest opacity-85',
            )}
          >
            {t(
              'becomeTutor.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Teach on {{appName}}' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'font-display text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[0.95]',
            )}
          >
            {t(
              'becomeTutor.headline',
              {},
              { defaultValue: 'Earn doing what you love. Teach on your schedule.' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'opacity-90')}>
            {t(
              'becomeTutor.subhead',
              {},
              {
                defaultValue:
                  'Apply in 5 minutes. Once verified, you’ll show up in search and start booking sessions.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3 mt-10 relative z-10')}
        >
          {PERKS.map((p) => (
            <div
              key={p.icon}
              className={cm.cn(cm.sp('p', 5), 'rounded-2xl backdrop-blur-md')}
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-2xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {p.icon}
              </span>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.sp('mt', 2),
                  'font-display tracking-tight',
                )}
              >
                {t(`becomeTutor.perk.${p.icon}.title`, {}, { defaultValue: p.title })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'opacity-85')}>
                {t(`becomeTutor.perk.${p.icon}.body`, {}, { defaultValue: p.body })}
              </p>
            </div>
          ))}
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.maxW('2xl'), 'mx-auto w-full', cm.stack(6))}
      >
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(5),
            'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'font-display tracking-tight',
            )}
          >
            {t('becomeTutor.form.title', {}, { defaultValue: 'Tell us about you' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <Field label={t('form.fullName', {}, { defaultValue: 'Full name' })}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant/30 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
              />
            </Field>
            <Field label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cm.cn(
                  cm.w('full'),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border border-outline-variant/30 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
              />
            </Field>
          </div>

          <FieldGroup
            label={t('becomeTutor.form.subjects', {}, { defaultValue: 'Subjects you teach' })}
          >
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
              {SUBJECT_OPTIONS.map((s) => {
                const active = selected.has(s)
                const label = t(`becomeTutor.subject.${s}`, {}, { defaultValue: s })
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    aria-label={label}
                    aria-pressed={active}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded-full px-4 py-2 transition-colors',
                      active
                        ? 'text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                    )}
                    style={active ? { backgroundColor: 'var(--mol-color-primary)' } : undefined}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <Field
            label={t(
              'becomeTutor.form.rate',
              { rate },
              { defaultValue: 'Hourly rate ($/hr): {{rate}}' },
            )}
          >
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className={cm.cn('accent-primary w-full')}
            />
          </Field>

          <Field label={t('becomeTutor.form.pitch', {}, { defaultValue: 'Your pitch (optional)' })}>
            <textarea
              rows={4}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={t(
                'becomeTutor.form.pitchPlaceholder',
                {},
                {
                  defaultValue:
                    'A few sentences students would see on your profile. Keep it specific and warm.',
                },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant/30 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            data-testid="become-tutor-submit"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              'rounded-full py-4 text-on-primary transition-transform hover:scale-[1.02] disabled:opacity-60',
            )}
            style={{ backgroundColor: 'var(--mol-color-primary)' }}
          >
            {submitting
              ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
              : t('becomeTutor.form.submit', {}, { defaultValue: 'Submit application' })}
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              arrow_forward
            </span>
          </button>
          {errorMessage && (
            <p
              role="alert"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('p', 4),
                'rounded-xl text-center bg-warning-light text-warning border border-amber-200',
              )}
            >
              {errorMessage}
            </p>
          )}
          {submitted && (
            <p
              role="status"
              data-testid="become-tutor-submitted"
              className={cm.cn(cm.textSize('sm'), cm.sp('p', 4), 'rounded-xl text-center')}
              style={{
                backgroundColor: 'var(--chalk-available-light)',
                color: 'var(--chalk-available)',
              }}
            >
              {t(
                'becomeTutor.form.submitted',
                {},
                { defaultValue: 'Application submitted. Redirecting to your profile…' },
              )}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <label className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div role="group" aria-label={label} className={cm.stack(2)}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
