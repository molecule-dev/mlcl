import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalorieRingCard } from '../components/CalorieRingCard.js'
import { MacrosCard, type MacroValue } from '../components/MacrosCard.js'
import { type FoodEntry, type MealKey, MealSection } from '../components/MealSection.js'
import { NoshTopBar } from '../components/NoshTopBar.js'
import { StreakCard } from '../components/StreakCard.js'
import { type MacroKey, macroProgress } from '../lib/macros.js'

interface NoshUser extends UserProfile {
  firstName?: string
}

interface DiaryApiEntry {
  id: string
  meal_type: string
  food_name: string
  calories: number | string
  is_quick_add?: boolean
}

const WATER_LABEL = 'Water'
const WATER_GOAL = 6

interface DiaryDayResponse {
  entries: DiaryApiEntry[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
  }
}

interface GoalResponse {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

interface StreakResponse {
  current_streak: number
}

const QUICK_ADDS: {
  key: 'water' | 'snack' | 'coffee' | 'tea'
  icon: string
  tone: string
  defaultLabel: string
  calories: number
}[] = [
  { key: 'water', icon: 'water_drop', tone: 'text-info', defaultLabel: 'Water', calories: 0 },
  { key: 'snack', icon: 'cookie', tone: 'text-snacks', defaultLabel: 'Snack', calories: 100 },
  { key: 'coffee', icon: 'local_cafe', tone: 'text-warning', defaultLabel: 'Coffee', calories: 5 },
  {
    key: 'tea',
    icon: 'emoji_food_beverage',
    tone: 'text-success',
    defaultLabel: 'Tea',
    calories: 2,
  },
]

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const toFoodEntry = (e: DiaryApiEntry): FoodEntry => ({
  id: e.id,
  name: e.food_name,
  calories: Math.round(num(e.calories)),
})

const todayDate = (): string => todayDateFrom(new Date())

const greeting = (hours: number): 'morning' | 'afternoon' | 'evening' => {
  if (hours < 12) return 'morning'
  if (hours < 18) return 'afternoon'
  return 'evening'
}

/** Shift a YYYY-MM-DD string by `days` (local calendar, DST-safe). */
const shiftDate = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return todayDateFrom(d)
}

const todayDateFrom = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Today() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<NoshUser>()

  const [date, setDate] = useState<string>(() => todayDate())
  const [diary, setDiary] = useState<DiaryDayResponse | null>(null)
  const [goal, setGoal] = useState<GoalResponse | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const isToday = date === todayDate()

  const name = useMemo(() => {
    const full = (user?.name ?? user?.firstName ?? '') as string
    return full.split(' ')[0] ?? ''
  }, [user])

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([
      http
        .get<DiaryDayResponse>(`/api/diary?date=${date}`)
        .then((r) => (r.data ?? null) as DiaryDayResponse | null),
      http.get<GoalResponse>('/api/goals').then((r) => (r.data ?? null) as GoalResponse | null),
      http
        .get<StreakResponse>('/api/nutrition/streak')
        .then((r) => (r.data ?? null) as StreakResponse | null),
    ])
      .then(([diaryRes, goalRes, streakRes]) => {
        if (cancelled) return
        setDiary(diaryRes ?? { entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        setGoal(goalRes ?? { calories: 2000, protein: 150, carbs: 250, fat: 65 })
        setStreak(streakRes?.current_streak ?? 0)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('nosh.today.loadError', {}, { defaultValue: 'Could not load today.' }),
        )
        setDiary({ entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        setGoal({ calories: 2000, protein: 150, carbs: 250, fat: 65 })
        setStreak(0)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, date, refreshTick])

  const macros: MacroValue[] = useMemo(() => {
    // Fiber was previously omitted here, dropping the stored fiber goal. macroProgress() includes it
    // alongside protein/carbs/fat; we only attach the translated labels.
    const labels: Record<MacroKey, string> = {
      protein: t('nosh.today.macros.protein', {}, { defaultValue: 'Protein' }),
      carbs: t('nosh.today.macros.carbs', {}, { defaultValue: 'Carbs' }),
      fat: t('nosh.today.macros.fat', {}, { defaultValue: 'Fat' }),
      fiber: t('nosh.today.macros.fiber', {}, { defaultValue: 'Fiber' }),
    }
    return macroProgress(diary?.totals, goal).map((m) => ({ ...m, label: labels[m.key] }))
  }, [diary, goal, t])

  const entriesByMeal = useMemo(() => {
    const map: Record<MealKey, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] }
    if (!diary) return map
    for (const e of diary.entries) {
      if (e.food_name === WATER_LABEL) continue
      const k = (e.meal_type === 'snack' ? 'snacks' : e.meal_type) as MealKey
      if (k in map) map[k].push(toFoodEntry(e))
    }
    return map
  }, [diary])

  const waterCount = useMemo(() => {
    if (!diary) return 0
    return diary.entries.filter((e) => e.food_name === WATER_LABEL).length
  }, [diary])

  const consumed = Math.round(num(diary?.totals.calories ?? 0))
  const dailyGoal = Math.max(1, Math.round(goal?.calories ?? 2000))

  const handleQuickAdd = async (item: (typeof QUICK_ADDS)[number]) => {
    try {
      await http.post('/api/diary/quick-add', {
        date,
        meal_type: 'snack',
        calories: item.calories,
        protein: 0,
        carbs: 0,
        fat: 0,
        food_name: item.key === 'water' ? WATER_LABEL : item.defaultLabel,
      })
      track({
        name: 'food.quick_added',
        properties: { item: item.key, calories: item.calories, date },
      })
      setRefreshTick((n) => n + 1)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.today.quickAddError', {}, { defaultValue: 'Could not log quick item.' }),
      )
    }
  }

  const greetKey = greeting(new Date().getHours())
  const greetText = name
    ? t(
        `nosh.today.greet.${greetKey}.named`,
        { name },
        {
          defaultValue:
            greetKey === 'morning'
              ? 'Good morning, {{name}}'
              : greetKey === 'afternoon'
                ? 'Good afternoon, {{name}}'
                : 'Good evening, {{name}}',
        },
      )
    : t(
        `nosh.today.greet.${greetKey}.anon`,
        {},
        {
          defaultValue:
            greetKey === 'morning'
              ? 'Good morning'
              : greetKey === 'afternoon'
                ? 'Good afternoon'
                : 'Good evening',
        },
      )

  const todayStr = useMemo(() => {
    if (isToday) {
      return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    }
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [date, isToday])

  return (
    <>
      <NoshTopBar
        title={greetText}
        eyebrow={
          <>
            <span>{todayStr}</span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full bg-accent-container text-on-accent-container font-semibold uppercase tracking-wider',
              )}
            >
              {isToday
                ? t('nosh.today.todayPill', {}, { defaultValue: 'Today' })
                : t('nosh.today.pastPill', {}, { defaultValue: 'Past day' })}
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'ml-1 inline-flex items-center',
              )}
              role="group"
              aria-label={t('nosh.today.dateNavLabel', {}, { defaultValue: 'Change diary day' })}
            >
              <button
                type="button"
                onClick={() => setDate((d) => shiftDate(d, -1))}
                aria-label={t('nosh.today.prevDay', {}, { defaultValue: 'Previous day' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-9 h-9 rounded-full bg-surface border border-outline/50 hover:bg-surface-variant text-on-surface transition-colors',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDate((d) => shiftDate(d, 1))}
                disabled={isToday}
                aria-label={t('nosh.today.nextDay', {}, { defaultValue: 'Next day' })}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-9 h-9 rounded-full bg-surface border border-outline/50 text-on-surface transition-colors enabled:hover:bg-surface-variant disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                  chevron_right
                </span>
              </button>
              {!isToday ? (
                <button
                  type="button"
                  onClick={() => setDate(todayDate())}
                  className={cm.cn(
                    cm.sp('px', 3),
                    'h-9 rounded-full bg-primary-container text-primary text-xs font-semibold hover:bg-primary-container/70 transition-colors',
                  )}
                >
                  {t('nosh.today.backToToday', {}, { defaultValue: 'Back to today' })}
                </button>
              ) : null}
            </span>
          </>
        }
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        <CalorieRingCard
          consumed={consumed}
          goal={dailyGoal}
          subtitle={t('nosh.today.remaining', {}, { defaultValue: 'calories remaining' })}
        />
        <MacrosCard
          title={t('nosh.today.macroTitle', {}, { defaultValue: 'Macronutrients' })}
          macros={macros}
        />
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <Link
          to="/log"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors shadow-sm',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
            add
          </span>
          {t('nosh.today.addFood', {}, { defaultValue: 'Add food' })}
        </Link>
        <span className={cm.cn('h-6 w-px bg-outline mx-2')} aria-hidden="true" />
        {QUICK_ADDS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => handleQuickAdd(q)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'bg-surface border border-outline/50 hover:bg-surface-variant text-on-surface rounded-full transition-colors',
            )}
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-base ${q.tone}`}>
              {q.icon}
            </span>
            {t(`nosh.today.quickAdd.${q.key}`, {}, { defaultValue: q.defaultLabel })}
          </button>
        ))}
      </div>

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
        {MEAL_KEYS.map((mealKey) => (
          <MealSection
            key={mealKey}
            meal={mealKey}
            title={t(
              `nosh.today.meal.${mealKey}`,
              {},
              { defaultValue: mealKey[0].toUpperCase() + mealKey.slice(1) },
            )}
            icon={
              mealKey === 'breakfast'
                ? 'bakery_dining'
                : mealKey === 'lunch'
                  ? 'lunch_dining'
                  : mealKey === 'dinner'
                    ? 'restaurant'
                    : 'icecream'
            }
            entries={entriesByMeal[mealKey]}
            unit={t('nosh.today.calUnit', {}, { defaultValue: 'cal' })}
            onAdd={() => navigate(`/log?meal=${mealKey === 'snacks' ? 'snacks' : mealKey}`)}
            emptyLabel={t(
              `nosh.today.${mealKey}Empty`,
              {},
              { defaultValue: mealKey === 'dinner' ? "What's for dinner?" : 'Add to log' },
            )}
            emptyHint={t('nosh.today.tapToLog', {}, { defaultValue: 'Tap to log' })}
          />
        ))}
      </div>

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
        <StreakCard
          days={streak ?? 0}
          headline={t(
            'nosh.today.streakHeadline',
            { count: streak ?? 0 },
            { defaultValue: '{{count}}-day streak' },
          )}
          subtitle={t(
            'nosh.today.streakSubtitle',
            {},
            { defaultValue: 'Keep it up — every bite counts.' },
          )}
        />
        <div
          className={cm.cn(
            cm.sp('p', 5),
            'bg-surface rounded-2xl shadow-sm border border-outline/20',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-info')}>
                water_drop
              </span>
              <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('nosh.today.water.title', {}, { defaultValue: 'Water' })}
              </h3>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant tabular-nums',
              )}
              data-testid="water-count"
            >
              {t(
                'nosh.today.water.goal',
                { count: waterCount, goal: WATER_GOAL },
                { defaultValue: '{{count}} / {{goal}}' },
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleQuickAdd(QUICK_ADDS[0])}
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              cm.sp('px', 2),
              'gap-1.5 w-full min-h-[44px] py-1 hover:opacity-80 transition-opacity',
            )}
            aria-label={t('nosh.today.water.add', {}, { defaultValue: 'Log water' })}
            data-testid="water-add-button"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cm.cn(
                  'material-symbols-outlined text-3xl',
                  i <= waterCount ? 'text-info' : 'text-outline',
                )}
              >
                water_drop
              </span>
            ))}
          </button>
        </div>
      </div>
    </>
  )
}
