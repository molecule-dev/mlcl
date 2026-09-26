import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface AuthUserShape {
  name?: string
  email?: string
}

interface MeResponse {
  id: string
  name: string | null
  email: string | null
  planKey: string | null
  householdSize: number
  goalKwhPerMonth: number
}

interface Achievement {
  key: string
  defaultLabel: string
  icon: string
  tint: string
}

const ACHIEVEMENTS: readonly Achievement[] = [
  {
    key: 'solar',
    defaultLabel: 'Solar Self-Sufficient · 30 days',
    icon: 'solar_power',
    tint: 'text-warning',
  },
  { key: 'savings', defaultLabel: '$200 saved this month', icon: 'savings', tint: 'text-success' },
  {
    key: 'peak',
    defaultLabel: 'Avoided 4 peak windows',
    icon: 'trending_down',
    tint: 'text-primary',
  },
] as const

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AuthUserShape>()
  const http = useHttpClient()

  const [householdSize, setHouseholdSize] = useState('3')
  const [goalKwh, setGoalKwh] = useState('600')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<MeResponse>('/api/me')
      .then((payload) => {
        if (cancelled) return
        const body = unwrapSingle<MeResponse>(payload)
        if (body) {
          setHouseholdSize(String(body.householdSize ?? 3))
          setGoalKwh(String(body.goalKwhPerMonth ?? 600))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('profile.loadError', {}, { defaultValue: 'Could not load profile preferences.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedAt(null)
    const householdNum = Number(householdSize)
    const goalNum = Number(goalKwh)
    if (!Number.isFinite(householdNum) || householdNum < 1) {
      setError(
        t(
          'profile.errorHousehold',
          {},
          { defaultValue: 'Household size must be a positive number.' },
        ),
      )
      setSaving(false)
      return
    }
    if (!Number.isFinite(goalNum) || goalNum < 1) {
      setError(
        t('profile.errorGoal', {}, { defaultValue: 'Monthly kWh goal must be a positive number.' }),
      )
      setSaving(false)
      return
    }
    try {
      await http.patch('/api/me', {
        householdSize: householdNum,
        goalKwhPerMonth: goalNum,
      })
      setSavedAt(Date.now())
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : t('profile.errorGeneric', {}, { defaultValue: 'Could not save profile changes.' })
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const kpis: EnergyKpi[] = [
    {
      key: 'streak',
      label: 'Solar self-suff. streak',
      value: '30 d',
      icon: 'whatshot',
      tint: 'text-warning',
    },
    {
      key: 'goal',
      label: 'Monthly goal progress',
      value: '72%',
      icon: 'flag',
      tint: 'text-success',
    },
    {
      key: 'co2',
      label: 'CO\u2082 avoided (yr)',
      value: '4.2 t',
      icon: 'park',
      tint: 'text-primary',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            {},
            { defaultValue: 'Identity, household profile, energy goals, and achievements.' },
          )}
        </p>
      </div>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 8),
          'min-h-[200px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              'font-bold text-xs uppercase tracking-widest text-primary-fixed/80 mb-2',
            )}
          >
            {t('profile.signedInAs', {}, { defaultValue: 'Signed in as' })}
          </p>
          <p className={cm.cn('text-5xl font-extrabold tracking-tight')}>
            {user?.name || user?.email || `${APP_NAME} operator`}
          </p>
          <p className={cm.cn('mt-2 text-sm font-medium text-white/90')}>{user?.email || ''}</p>
        </div>
        <div
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
      </section>

      <EnergyKpiTriad kpis={kpis} />

      <form
        data-mol-id="profile-form"
        onSubmit={save}
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('profile.householdHeading', {}, { defaultValue: 'Household & goals' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.householdSize', {}, { defaultValue: 'Household size' })}
            </span>
            <input
              id="profile-household-size"
              type="number"
              value={householdSize}
              disabled={loading || saving}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.monthlyGoal', {}, { defaultValue: 'Monthly kWh goal' })}
            </span>
            <input
              id="profile-goal-kwh"
              type="number"
              value={goalKwh}
              disabled={loading || saving}
              onChange={(e) => setGoalKwh(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'bg-surface rounded-xl border border-outline-variant focus:border-primary outline-none font-mono tabular-nums transition-colors',
              )}
            />
          </label>
        </div>
        {error ? (
          <p
            data-mol-id="profile-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-error')}
          >
            {error}
          </p>
        ) : null}
        {savedAt && !error ? (
          <p
            data-mol-id="profile-saved"
            role="status"
            className={cm.cn(cm.textSize('sm'), 'text-success')}
          >
            {t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })}
          </p>
        ) : null}
        <div>
          <button
            type="submit"
            disabled={loading || saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-60',
            )}
          >
            {saving
              ? t('profile.saving', {}, { defaultValue: 'Saving\u2026' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </form>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl', cm.stack(4))}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.key}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 4),
                'bg-surface rounded-xl',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-surface-container',
                  a.tint,
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{a.icon}</span>
              </div>
              <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {t(`profile.achievement.${a.key}`, {}, { defaultValue: a.defaultLabel })}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
