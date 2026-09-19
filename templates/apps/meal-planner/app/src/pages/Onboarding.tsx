import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const STEPS = ['welcome', 'household', 'diet'] as const
type Step = (typeof STEPS)[number]

/** localStorage key for the plan defaults picked during onboarding. */
export const PLAN_PREFS_KEY = 'simmer:plan-prefs'

export interface PlanPrefs {
  /** Default servings when a recipe joins the plan. */
  householdServings: number
  /** Diet tag used to sort recipe suggestions. */
  diet: 'everything' | 'vegetarian' | 'vegan' | 'gluten-free'
}

export function readPlanPrefs(): PlanPrefs {
  try {
    const raw = window.localStorage.getItem(PLAN_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlanPrefs>
      return {
        householdServings:
          typeof parsed.householdServings === 'number' && parsed.householdServings > 0
            ? parsed.householdServings
            : 2,
        diet: parsed.diet ?? 'everything',
      }
    }
  } catch (_error) {
    // Corrupt or unavailable storage: fall through to defaults.
  }
  return { householdServings: 2, diet: 'everything' }
}

const DIETS: ReadonlyArray<{ key: PlanPrefs['diet']; label: string; emoji: string }> = [
  { key: 'everything', label: 'Eat everything', emoji: '🍽️' },
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'gluten-free', label: 'Gluten-free', emoji: '🌾' },
]

const HOUSEHOLD_OPTIONS = [1, 2, 3, 4, 5, 6]

export function Onboarding() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const step: Step = STEPS[stepIndex] ?? 'welcome'
  const [household, setHousehold] = useState(2)
  const [diet, setDiet] = useState<PlanPrefs['diet']>('everything')

  const finish = (): void => {
    try {
      window.localStorage.setItem(
        PLAN_PREFS_KEY,
        JSON.stringify({ householdServings: household, diet } satisfies PlanPrefs),
      )
    } catch (_error) {
      // Preferences are a nicety — plan defaults fall back to 2 / everything.
    }
    navigate('/plan', { replace: true })
  }

  const next = (): void => {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1)
    else finish()
  }
  const back = (): void => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
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
              🍲
            </div>
            <h1 className={cm.cn(cm.fontWeight('bold'), 'text-4xl tracking-tight text-on-surface')}>
              {t(
                'simmer.onboarding.welcome.heading',
                { app: APP_NAME },
                { defaultValue: 'Welcome to {{app}}' },
              )}
            </h1>
            <p
              className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-md mx-auto mt-3')}
            >
              {t(
                'simmer.onboarding.welcome.body',
                {},
                {
                  defaultValue:
                    'Save the recipes you love, drop them onto the week, and shop from a list that writes itself.',
                },
              )}
            </p>
          </div>
        ) : null}

        {step === 'household' ? (
          <div className={cm.cn('w-full text-center')}>
            <div className={cm.cn('text-6xl mb-4')} aria-hidden="true">
              👨‍👩‍👧‍👦
            </div>
            <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
              {t(
                'simmer.onboarding.household.heading',
                {},
                { defaultValue: 'How many are you cooking for?' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mt-2')}>
              {t(
                'simmer.onboarding.household.body',
                {},
                { defaultValue: "We'll scale recipes and the grocery list to match." },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', gap: 'sm' }),
                cm.sp('mt', 8),
              )}
            >
              {HOUSEHOLD_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  data-mol-id={`onboarding-household-${n}`}
                  aria-pressed={household === n}
                  onClick={() => setHousehold(n)}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                    'w-16 h-16 rounded-2xl border-2 transition-all',
                    household === n
                      ? 'border-primary bg-primary-container text-on-primary-container font-bold'
                      : 'border-outline/40 text-on-surface hover:border-primary/60',
                  )}
                >
                  <span className={cm.cn(cm.textSize('lg'))}>{n}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'diet' ? (
          <div className={cm.cn('w-full text-center')}>
            <div className={cm.cn('text-6xl mb-4')} aria-hidden="true">
              🥗
            </div>
            <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
              {t('simmer.onboarding.diet.heading', {}, { defaultValue: 'Anything to skip?' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mt-2')}>
              {t(
                'simmer.onboarding.diet.body',
                {},
                { defaultValue: 'Recipes tagged to match float to the top of your box.' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                cm.sp('mt', 8),
              )}
            >
              {DIETS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  data-mol-id={`onboarding-diet-${d.key}`}
                  aria-pressed={diet === d.key}
                  onClick={() => setDiet(d.key)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    'w-full max-w-sm rounded-2xl border-2 transition-all text-left',
                    diet === d.key
                      ? 'border-primary bg-primary-container text-on-primary-container font-semibold'
                      : 'border-outline/40 text-on-surface hover:border-primary/60',
                  )}
                >
                  <span className={cm.cn('text-2xl')} aria-hidden="true">
                    {d.emoji}
                  </span>
                  {t(`simmer.onboarding.diet.${d.key}`, {}, { defaultValue: d.label })}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'border-t border-primary-container max-w-2xl mx-auto w-full',
        )}
      >
        <button
          type="button"
          data-mol-id="onboarding-back"
          onClick={back}
          disabled={stepIndex === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            'rounded-lg text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40',
          )}
        >
          {t('simmer.onboarding.back', {}, { defaultValue: 'Back' })}
        </button>
        <button
          type="button"
          data-mol-id="onboarding-next"
          onClick={next}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-full bg-accent text-on-accent hover:bg-accent/90 transition-colors',
          )}
        >
          {stepIndex === STEPS.length - 1
            ? t('simmer.onboarding.start', {}, { defaultValue: 'Start planning' })
            : t('common.continue', {}, { defaultValue: 'Continue' })}
        </button>
      </footer>
    </div>
  )
}
