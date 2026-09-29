import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Meridian Dashboard hero — clinical-teal gradient surface with the
 * patient's headline status, a chip strip of latest vital signs
 * (clinical font, in-range / abnormal / critical state colour), and a
 * decorative heartbeat polyline.
 *
 * Translated from telemedicine's PatientVitalsHero.tsx + medication-
 * reminder's TodayHeroCard.tsx — gradient hero shape, decorative orbs,
 * and frosted-glass status pill come from those siblings; the vitals
 * chip strip is recoloured to Meridian's clinical-status palette and
 * uses tabular-nums + SF Mono for the numeric values, per DESIGN.md
 * "Lab values and vitals MUST use SF Mono clinical font with
 * tabular-nums".
 */
export type VitalState = 'normal' | 'abnormal' | 'critical' | 'caution'

export interface VitalChip {
  label: string
  value: string
  unit: string
  state: VitalState
}

export interface VitalsHeroCardProps {
  /** Patient's first name (or display name). */
  patientName?: string
  /** Latest vitals to feature in the chip strip (max 6 shown). */
  vitals: ReadonlyArray<VitalChip>
  /** Active conditions count. */
  conditionsCount: number
  /** Active medications count. */
  medicationsCount: number
  /** Number of unread alerts (abnormal labs, refills due, sharing requests). */
  alertsCount: number
  /** Display label for the recorded date, e.g. "Today, April 29". */
  recordedLabel: string
}

const STATE_BG: Record<VitalState, string> = {
  normal: 'rgba(16, 163, 74, 0.18)',
  abnormal: 'rgba(220, 38, 38, 0.20)',
  critical: 'rgba(220, 38, 38, 0.30)',
  caution: 'rgba(217, 119, 6, 0.20)',
}

const STATE_TEXT: Record<VitalState, string> = {
  normal: '#86efac',
  abnormal: '#fca5a5',
  critical: '#fecaca',
  caution: '#fcd34d',
}

export function VitalsHeroCard({
  patientName,
  vitals,
  conditionsCount,
  medicationsCount,
  alertsCount,
  recordedLabel,
}: VitalsHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Time-of-day greeting, matching the design's "Good morning, Elena" hero.
  const hour = new Date().getHours()
  const greetingKey =
    hour < 12
      ? 'vitalsHeroCard.greetingMorning'
      : hour < 18
        ? 'vitalsHeroCard.greetingAfternoon'
        : 'vitalsHeroCard.greetingEvening'
  const greetingDefault =
    hour < 12
      ? 'Good morning, {{name}}'
      : hour < 18
        ? 'Good afternoon, {{name}}'
        : 'Good evening, {{name}}'

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--color-hero-bg)', minHeight: '380px' }}
    >
      <div
        className={cm.cn('absolute inset-0')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, rgba(13, 148, 136, 0.50) 0%, transparent 35%),' +
            'radial-gradient(circle at 70% 25%, rgba(99, 102, 241, 0.30) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, rgba(20, 184, 166, 0.30) 0%, transparent 32%),' +
            'linear-gradient(135deg, var(--color-hero-bg) 0%, var(--color-hero-bg-gradient-end) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Heartbeat polyline */}
      <svg
        className={cm.cn('absolute left-0 right-0 top-1/2 w-full opacity-25', '-translate-y-1/2')}
        height="80"
        viewBox="0 0 800 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,40 L120,40 L140,40 L150,20 L160,60 L170,10 L180,60 L195,40 L320,40 L340,40 L350,20 L360,60 L370,10 L380,60 L395,40 L520,40 L540,40 L550,20 L560,60 L570,10 L580,60 L595,40 L800,40"
          stroke="var(--mol-color-primary-light)"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div
        className={cm.cn(
          'absolute rounded-full bg-teal-500/20 blur-3xl',
          '-right-24 -bottom-24 w-72 h-72',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 rounded-full bg-emerald-400/30 blur-2xl w-20 h-20',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'relative z-10',
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.h('full'),
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
              <span
                className={cm.cn(
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
                )}
              />
              <span className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-emerald-400')} />
            </span>
            <span
              className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-emerald-300')}
            >
              {t(
                'vitalsHeroCard.liveLabel',
                { date: recordedLabel },
                { defaultValue: 'Encrypted · {{date}}' },
              )}
            </span>
          </div>
          <span
            className={cm.cn(
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80',
            )}
          >
            {t('vitalsHeroCard.compliance', {}, { defaultValue: 'HIPAA · end-to-end' })}
          </span>
        </div>

        <div className={cm.sp('mt', 6)}>
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-teal-300/90 mb-2',
            )}
          >
            {t('vitalsHeroCard.eyebrow', {}, { defaultValue: 'Your health summary' })}
          </p>
          <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {patientName
              ? t(greetingKey, { name: patientName }, { defaultValue: greetingDefault })
              : t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h2>
          <p className={cm.cn('text-sm md:text-base text-white/85 mt-2 max-w-lg')}>
            {t(
              'vitalsHeroCard.subline',
              { conditions: conditionsCount, medications: medicationsCount, alerts: alertsCount },
              {
                defaultValue:
                  '{{conditions}} active conditions · {{medications}} medications · {{alerts}} new alerts to review',
              },
            )}
          </p>
        </div>

        {vitals.length > 0 && (
          <div className={cm.sp('mt', 6)}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2',
              )}
            >
              {t(
                'vitalsHeroCard.vitalsLabel',
                { date: recordedLabel },
                { defaultValue: 'Latest vitals · {{date}}' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
              {vitals.slice(0, 6).map((v) => (
                <div
                  key={v.label}
                  className={cm.cn('px-4 py-2 rounded-xl backdrop-blur-md min-w-[100px]')}
                  style={{ backgroundColor: STATE_BG[v.state] }}
                >
                  <p
                    className={cm.cn(
                      'text-[9px] font-bold uppercase tracking-widest text-white/70',
                    )}
                  >
                    {v.label}
                  </p>
                  <p
                    className={cm.cn('text-base font-extrabold tabular-nums font-mono mt-0.5')}
                    style={{ color: STATE_TEXT[v.state], fontFamily: 'var(--mol-font-mono)' }}
                  >
                    {v.value}
                    {v.unit && (
                      <span className={cm.cn('text-[10px] text-white/60 ml-1 font-normal')}>
                        {v.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default VitalsHeroCard
