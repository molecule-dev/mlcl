import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface GpaResponse {
  gpa: number
  percent?: number
  count: number
}

interface ScheduleEntryRaw {
  weekday?: number | null
}

export interface GpaHeroCardProps {
  gpa?: string
  gpaScale?: string
  changeLabel?: string
  trendDirection?: 'up' | 'flat' | 'down'
  termLabel?: string
  classesToday?: number
}

/**
 * Gradient hero card showing the live GPA fetched from
 * `/api/grades/gpa`. The GPA value drives the headline number; the
 * accompanying caption ("N classes today") is sourced from
 * `/api/schedule/today`.
 */
export function GpaHeroCard(props: GpaHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [gpa, setGpa] = useState<number | null>(null)
  const [classesToday, setClassesToday] = useState<number>(0)
  // Static-demo usage (marketing pages pass `gpa`/`classesToday` props) must
  // NOT hit the API: on a public page those calls run unauthenticated and
  // every visit logs two 401 console errors.
  const needsLiveGpa = props.gpa == null
  const needsLiveClasses = props.classesToday == null

  useEffect(() => {
    if (!needsLiveGpa && !needsLiveClasses) return
    let cancelled = false
    Promise.all([
      needsLiveGpa
        ? http.get('/api/grades/gpa').then((r) => unwrapSingle<GpaResponse>(r))
        : Promise.resolve(null),
      needsLiveClasses
        ? http.get('/api/schedule/today').then((r) => unwrapList<ScheduleEntryRaw>(r))
        : Promise.resolve(null),
    ])
      .then(([g, s]) => {
        if (cancelled) return
        if (g) setGpa(g.gpa)
        if (s) setClassesToday(s.length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, needsLiveGpa, needsLiveClasses])

  const gpaText = props.gpa ?? (gpa != null ? gpa.toFixed(2) : '—')
  const trendIcon =
    props.trendDirection === 'down'
      ? 'trending_down'
      : props.trendDirection === 'flat'
        ? 'trending_flat'
        : 'trending_up'

  return (
    <div
      data-mol-id="gpa-hero-card"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'font-bold uppercase tracking-widest text-on-primary/80',
          )}
        >
          {t(
            'gpaHeroCard.eyebrow',
            { term: props.termLabel ?? 'Spring' },
            { defaultValue: '{{term}} term GPA' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
          <span
            data-mol-id="gpa-hero-value"
            className={cm.cn('text-6xl font-extrabold tracking-tighter tabular-nums')}
          >
            {gpaText}
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-medium text-on-primary/70')}>
            {props.gpaScale ?? '/ 4.0'}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              'font-bold bg-surface/20 backdrop-blur-md',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
              aria-hidden="true"
            >
              {trendIcon}
            </span>
            {t(
              'gpaHeroCard.change',
              { delta: props.changeLabel ?? '+0.14' },
              { defaultValue: '{{delta}}' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-primary/80')}>
          {t(
            'gpaHeroCard.summary',
            { count: props.classesToday ?? classesToday },
            { defaultValue: '{{count}} classes today' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,75 Q50,68 100,55 T200,40 T300,30 T400,18 L400,100 L0,100 Z"
            fill="white"
            opacity="0.25"
          />
          <path
            d="M0,75 Q50,68 100,55 T200,40 T300,30 T400,18"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        className={cm.cn(
          'absolute right-10 top-10 w-20 h-20 rounded-full bg-primary-fixed/30 blur-xl',
        )}
      />
    </div>
  )
}

export default GpaHeroCard
