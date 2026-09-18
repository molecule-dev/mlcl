import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const STEPS = ['welcome', 'goal', 'activity', 'macros'] as const
type Step = (typeof STEPS)[number]

const GOALS = [
  { key: 'lose', icon: 'trending_down', label: 'Lose weight' },
  { key: 'maintain', icon: 'trending_flat', label: 'Maintain' },
  { key: 'gain', icon: 'trending_up', label: 'Gain muscle' },
] as const

const ACTIVITY = [
  {
    key: 'sedentary',
    icon: 'chair',
    label: 'Sedentary',
    body: 'Mostly sitting, light walking',
    multiplier: 1.2,
  },
  {
    key: 'light',
    icon: 'directions_walk',
    label: 'Lightly active',
    body: 'Walks + light exercise 1–3×/wk',
    multiplier: 1.375,
  },
  {
    key: 'moderate',
    icon: 'directions_run',
    label: 'Active',
    body: 'Workouts 3–5×/wk',
    multiplier: 1.55,
  },
  {
    key: 'very',
    icon: 'fitness_center',
    label: 'Very active',
    body: 'Daily training',
    multiplier: 1.9,
  },
] as const

const GOAL_ADJUSTMENT = { lose: -500, maintain: 0, gain: 300 } as const

// Average baseline BMR for a "typical" adult — without
// asking for weight/height/age/sex we cannot be precise. The user
// fine-tunes from /goals afterwards.
const BASELINE_BMR = 1500

function computeTargets(
  goal: (typeof GOALS)[number]['key'],
  activity: (typeof ACTIVITY)[number]['key'],
) {
  const multiplier = ACTIVITY.find((a) => a.key === activity)?.multiplier ?? 1.55
  const tdee = BASELINE_BMR * multiplier
  const calories = Math.round(tdee + GOAL_ADJUSTMENT[goal])
  // Protein scaled by goal — gain/lose both want higher protein than maintain.
  const proteinRatio = goal === 'gain' ? 0.3 : goal === 'lose' ? 0.32 : 0.25
  const fatRatio = 0.25
  const protein = Math.round((calories * proteinRatio) / 4)
  const fat = Math.round((calories * fatRatio) / 9)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)
  return { calories, protein, carbs: Math.max(carbs, 0), fat }
}

export function Onboarding() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [step, setStep] = useState<Step>('welcome')
  const [goal, setGoal] = useState<(typeof GOALS)[number]['key']>('maintain')
  const [activity, setActivity] = useState<(typeof ACTIVITY)[number]['key']>('moderate')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = useMemo(() => computeTargets(goal, activity), [goal, activity])

  const stepIndex = STEPS.indexOf(step)
  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/goals', {
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
        fiber: 30,
        sodium: 2300,
        sugar: 50,
      })
      navigate('/today', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('nosh.onboarding.saveError', {}, { defaultValue: 'Could not save your goals.' }),
      )
      setSaving(false)
    }
  }

  const next = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1])
    else void finish()
  }
  const back = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1])
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-on-surface antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'border-b border-primary-container',
        )}
      >
        <span className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-primary tracking-tight')}>
          {APP_NAME}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              aria-hidden="true"
              className={cm.cn(
                'h-2 rounded-full transition-all',
                i <= stepIndex ? 'w-8 bg-primary' : 'w-2 bg-outline/40',
              )}
            />
          ))}
        </div>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 12),
          'flex-1 max-w-2xl mx-auto w-full',
        )}
      >
        {step === 'welcome' ? (
          <div className={cm.cn('text-center')}>
            <div className={cm.cn('text-7xl mb-6')} aria-hidden="true">
              🌿
            </div>
            <h1 className={cm.cn(cm.fontWeight('bold'), 'text-4xl tracking-tight text-on-surface')}>
              {t(
                'nosh.onboarding.welcome.heading',
                { app: APP_NAME },
                { defaultValue: 'Welcome to {{app}}' },
              )}
            </h1>
            <p
              className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-md mx-auto mt-3')}
            >
              {t(
                'nosh.onboarding.welcome.body',
                {},
                {
                  defaultValue:
                    'A few quick questions and we will tailor your daily targets — friendly, never strict.',
                },
              )}
            </p>
          </div>
        ) : null}

        {step === 'goal' ? (
          <div className={cm.cn('w-full')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl text-center text-on-surface tracking-tight',
              )}
            >
              {t('nosh.onboarding.goal.heading', {}, { defaultValue: "What's your goal?" })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4 mt-8')}>
              {GOALS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGoal(g.key)}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                    cm.fontWeight('semibold'),
                    'rounded-2xl border-2 transition-colors',
                    goal === g.key
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline bg-surface text-on-surface hover:border-primary/50',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-3xl')}>
                    {g.icon}
                  </span>
                  {t(`nosh.onboarding.goal.${g.key}`, {}, { defaultValue: g.label })}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'activity' ? (
          <div className={cm.cn('w-full')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl text-center text-on-surface tracking-tight',
              )}
            >
              {t('nosh.onboarding.activity.heading', {}, { defaultValue: 'How active are you?' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mt', 8))}>
              {ACTIVITY.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setActivity(a.key)}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'text-left rounded-2xl border-2 transition-colors',
                    activity === a.key
                      ? 'border-primary bg-primary-container'
                      : 'border-outline bg-surface hover:border-primary/50',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-3xl text-primary')}
                  >
                    {a.icon}
                  </span>
                  <div>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                      {t(`nosh.onboarding.activity.${a.key}.label`, {}, { defaultValue: a.label })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(`nosh.onboarding.activity.${a.key}.body`, {}, { defaultValue: a.body })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'macros' ? (
          <div className={cm.cn('w-full text-center')}>
            <div className={cm.cn('text-6xl mb-4')} aria-hidden="true">
              🎯
            </div>
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface tracking-tight')}>
              {t(
                'nosh.onboarding.macros.heading',
                {},
                { defaultValue: "Here's your daily target" },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mt-3')}>
              {t(
                'nosh.onboarding.macros.body',
                {},
                { defaultValue: 'You can fine-tune any of these later from Goals.' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.sp('mt', 8),
                'bg-gradient-to-br from-primary-container to-surface rounded-3xl border border-primary/20 shadow-sm',
              )}
            >
              <p
                className={cm.cn('text-6xl font-extrabold text-primary tabular-nums')}
                data-testid="onboarding-calories"
              >
                {targets.calories.toLocaleString()}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant mt-1',
                )}
              >
                {t('nosh.onboarding.macros.kcal', {}, { defaultValue: 'kcal per day' })}
              </p>
              <div className={cm.cn('grid grid-cols-3 gap-4 mt-6')}>
                {[
                  { key: 'protein', value: targets.protein, tone: 'text-protein' },
                  { key: 'carbs', value: targets.carbs, tone: 'text-carbs' },
                  { key: 'fat', value: targets.fat, tone: 'text-fat' },
                ].map((m) => (
                  <div key={m.key}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        `nosh.onboarding.macros.${m.key}`,
                        {},
                        { defaultValue: m.key[0].toUpperCase() + m.key.slice(1) },
                      )}
                    </p>
                    <p
                      className={cm.cn('text-3xl font-extrabold tabular-nums mt-1', m.tone)}
                      data-testid={`onboarding-${m.key}`}
                    >
                      {m.value}g
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {error ? (
              <p className={cm.cn(cm.sp('mt', 4), 'text-error')} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'border-t border-primary-container bg-surface',
        )}
      >
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'text-on-surface-variant hover:text-primary disabled:opacity-40 transition-colors',
          )}
        >
          {t('nosh.onboarding.back', {}, { defaultValue: 'Back' })}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={saving}
          data-testid={step === 'macros' ? 'onboarding-finish' : 'onboarding-next'}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'bg-accent text-on-accent rounded-full hover:bg-accent/90 disabled:opacity-60 transition-colors shadow-sm',
          )}
        >
          {step === 'macros'
            ? saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('nosh.onboarding.start', {}, { defaultValue: "Let's go" })
            : t('common.continue', {}, { defaultValue: 'Continue' })}
        </button>
      </footer>
    </div>
  )
}
