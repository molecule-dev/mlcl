import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Habit {
  id: string
  name: string
  emoji: string
  category: 'health' | 'mind' | 'creativity' | 'social' | 'learning'
  cadence: 'daily' | 'weekly'
  current_streak: number
  longest_streak: number
  completed_today: boolean
  created_at: string
}

const CATEGORIES = ['all', 'health', 'mind', 'creativity', 'social', 'learning'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

const CATEGORY_COLOR: Record<Exclude<CategoryFilter, 'all'>, string> = {
  health: 'bg-success-container text-on-success-container',
  mind: 'bg-primary-container text-on-primary-container',
  creativity: 'bg-tertiary-container text-on-tertiary-container',
  social: 'bg-secondary-container text-on-secondary-container',
  learning: 'bg-warning-container text-on-warning-container',
}

export function Habits() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CategoryFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/habits')
      .then((res) => {
        if (!cancelled) setHabits(unwrapList<Habit>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('habits.loadError', {}, { defaultValue: 'Failed to load habits.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (filter === 'all') return habits
    return habits.filter((h) => h.category === filter)
  }, [habits, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('habits.heading', {}, { defaultValue: 'Habits' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'habits.subheading',
              { count: habits.length },
              { defaultValue: '{{count}} tracked' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/habits/new')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
          aria-label={t('habits.addAria', {}, { defaultValue: 'Create new habit' })}
        >
          + {t('habits.addLabel', {}, { defaultValue: 'New habit' })}
        </button>
      </header>

      <nav
        aria-label={t('habits.filterLabel', {}, { defaultValue: 'Filter habits by category' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {CATEGORIES.map((c) => {
          const active = filter === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(
                `habits.filter.${c}`,
                {},
                { defaultValue: c.charAt(0).toUpperCase() + c.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('habits.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('habits.empty', {}, { defaultValue: 'No habits in this category.' })}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 3, gap: 'md' })}>
          {visible.map((h) => (
            <li key={h.id}>
              <Link
                to={`/habits/${h.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  'block hover:bg-surface-container space-y-3',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span aria-hidden="true" className={cm.cn(cm.textSize('2xl'))}>
                    {h.emoji}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded',
                      CATEGORY_COLOR[h.category],
                    )}
                  >
                    {t(`category.${h.category}`, {}, { defaultValue: h.category })}
                  </span>
                </div>
                <div>
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {h.name}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t('habits.cadence', { cadence: h.cadence }, { defaultValue: '{{cadence}}' })}
                  </p>
                </div>
                <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                  <span
                    className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
                    style={{ color: h.current_streak > 0 ? 'var(--color-flame)' : undefined }}
                  >
                    {h.current_streak}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('habits.streakDays', {}, { defaultValue: 'day streak' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', 'ml-auto')}>
                    {t(
                      'habits.longest',
                      { count: h.longest_streak },
                      { defaultValue: 'best {{count}}' },
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
