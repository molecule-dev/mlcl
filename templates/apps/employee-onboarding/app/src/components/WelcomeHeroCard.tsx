import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing } from './ProgressRing.js'

/**
 * Gradient welcome hero — teal → purple gradient, large headline, decorative
 * blurred orbs, frosted-glass quick-stat pills, and a 96px ProgressRing on the
 * right showing overall onboarding completion.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient hero with decorative
 * orbs + sparkline) — adapted for Embark's welcome banner spec in DESIGN.md.
 */

export interface WelcomeHeroCardProps {
  /** Employee's first name (displayed in greeting). */
  firstName: string
  /** Day count since start (e.g. 14 → "Day 14 of 90"). */
  dayNumber: number
  /** Total program length in days. Defaults to 90. */
  totalDays?: number
  /** Overall completion percentage 0–100. */
  completionPct: number
  /** Number of tasks completed so far. */
  tasksDone: number
  /** Total task count. */
  tasksTotal: number
  /** Number of milestones unlocked. */
  milestonesDone: number
  /** Total milestone count. */
  milestonesTotal: number
  /** Optional next task title (rendered as the hero subhead). */
  nextTaskTitle?: string
}

export function WelcomeHeroCard({
  firstName,
  dayNumber,
  totalDays = 90,
  completionPct,
  tasksDone,
  tasksTotal,
  milestonesDone,
  milestonesTotal,
  nextTaskTitle,
}: WelcomeHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      data-mol-id="welcome-hero"
      className={cm.cn(cm.sp('p', 8))}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '2rem',
        background:
          'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)',
        color: 'var(--mol-color-surface)',
        boxShadow: '0 20px 40px -10px rgba(13, 148, 136, 0.35)',
      }}
    >
      {/* Decorative blurred orbs */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: '-80px',
          bottom: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.18)',
          filter: 'blur(48px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '-60px',
          top: '-60px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.35)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'lg' }))}
        style={{ position: 'relative', zIndex: 1, flexWrap: 'wrap', rowGap: '24px' }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {t(
              'welcomeHeroCard.eyebrow',
              { day: dayNumber, total: totalDays },
              {
                defaultValue: `Day ${dayNumber} of ${totalDays}`,
              },
            )}
          </p>
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.05, marginTop: '8px' }}
          >
            {t(
              'welcomeHeroCard.greeting',
              { name: firstName },
              {
                defaultValue: `Welcome back, ${firstName}.`,
              },
            )}
          </h1>
          <p
            style={{
              marginTop: '12px',
              fontSize: '16px',
              maxWidth: '560px',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {nextTaskTitle
              ? t(
                  'welcomeHeroCard.upNext',
                  { title: nextTaskTitle },
                  {
                    defaultValue: `Up next: ${nextTaskTitle}`,
                  },
                )
              : t(
                  'welcomeHeroCard.subhead',
                  {},
                  {
                    defaultValue:
                      'Your guided journey through paperwork, training, and team introductions.',
                  },
                )}
          </p>

          <div
            className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 6))}
            style={{ flexWrap: 'wrap' }}
          >
            <PillStat
              label={t('welcomeHeroCard.tasksLabel', {}, { defaultValue: 'Tasks' })}
              value={`${tasksDone}/${tasksTotal}`}
            />
            <PillStat
              label={t('welcomeHeroCard.milestonesLabel', {}, { defaultValue: 'Milestones' })}
              value={`${milestonesDone}/${milestonesTotal}`}
            />
            <PillStat
              label={t('welcomeHeroCard.streakLabel', {}, { defaultValue: 'Streak' })}
              value={t(
                'welcomeHeroCard.streakValue',
                { days: Math.min(dayNumber, 7) },
                {
                  defaultValue: `${Math.min(dayNumber, 7)} days`,
                },
              )}
            />
          </div>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
          )}
          style={{ flex: '0 0 auto' }}
        >
          <div
            style={{
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <ProgressRing
              value={completionPct}
              size={120}
              stroke={10}
              color="#ffffff"
              showText={false}
            />
          </div>
          <div className={cm.textCenter}>
            <p
              className="font-extrabold tracking-tighter"
              style={{
                fontSize: '40px',
                lineHeight: 1,
                color: 'var(--mol-color-surface)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.round(completionPct)}%
            </p>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            >
              {t('welcomeHeroCard.completeLabel', {}, { defaultValue: 'Complete' })}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PillStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '999px',
        background: 'rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
      }}
    >
      <span style={{ fontWeight: 800, fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}
      >
        {label}
      </span>
    </div>
  )
}
