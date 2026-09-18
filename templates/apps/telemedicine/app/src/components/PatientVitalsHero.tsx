import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Vital {
  label: string
  value: string
  unit: string
  state: 'good' | 'warn' | 'urgent'
}

interface PatientVitalsHeroProps {
  patientCount: number
  visitsToday: number
  pendingMessages: number
  openPrescriptions: number
  /** Optional patient-snapshot vitals to feature in the hero (BP, HR, SpO2, etc). */
  vitals?: ReadonlyArray<Vital>
  /** Doctor's name for the welcome line. */
  providerName?: string
  /** Time-of-day greeting ("Good morning" / afternoon / evening). */
  greeting?: string
  /** Patient label for the vitals strip. Falls back to a generic label when undefined. */
  vitalsPatientLabel?: string
}

const STATE_COLOR: Record<Vital['state'], { bg: string; text: string }> = {
  good: {
    bg: 'color-mix(in srgb, var(--color-success, #10b981) 15%, transparent)',
    text: 'var(--color-success, #10b981)',
  },
  warn: {
    bg: 'color-mix(in srgb, var(--color-warning, #f59e0b) 18%, transparent)',
    text: 'var(--color-warning, #f59e0b)',
  },
  urgent: {
    bg: 'color-mix(in srgb, var(--color-error, #ef4444) 18%, transparent)',
    text: 'var(--color-error, #ef4444)',
  },
}

/**
 * Calm clinical hero for Solace — teal-on-deep-slate panel with a vitals
 * chip strip, a soft animated heartbeat curve in the background, and
 * editorial caregiver greeting. Translated from CRM's RevenueOverviewCard
 * gradient + DashboardWelcomeHeader, recoloured to Solace's teal palette.
 */
export function PatientVitalsHero({
  patientCount,
  visitsToday,
  pendingMessages,
  openPrescriptions,
  vitals = [],
  providerName,
  greeting,
  vitalsPatientLabel,
}: PatientVitalsHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
      }
      style={{ backgroundColor: 'var(--color-hero-surface, #0f2937)', minHeight: '380px' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, color-mix(in srgb, var(--color-primary) 45%, transparent) 0%, transparent 35%),' +
            'radial-gradient(circle at 70% 25%, color-mix(in srgb, var(--color-accent) 30%, transparent) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, color-mix(in srgb, var(--color-secondary) 30%, transparent) 0%, transparent 32%),' +
            'linear-gradient(135deg, var(--color-hero-surface, #0f2937) 0%, var(--color-hero-surface-end, #134e4a) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Heartbeat polyline */}
      <svg
        className={'absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-30'}
        style={{ color: 'var(--color-accent)' }}
        height="80"
        viewBox="0 0 800 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,40 L120,40 L140,40 L150,20 L160,60 L170,10 L180,60 L195,40 L320,40 L340,40 L350,20 L360,60 L370,10 L380,60 L395,40 L520,40 L540,40 L550,20 L560,60 L570,10 L580,60 L595,40 L800,40"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div
        className={'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-emerald-400/30 blur-2xl'}
        aria-hidden="true"
      />

      <div className={'relative p-8 lg:p-10 flex flex-col justify-between min-h-[380px]'}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={'relative flex h-3 w-3'} aria-hidden="true">
              <span
                className={
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping'
                }
              />
              <span className={'relative inline-flex rounded-full h-3 w-3 bg-emerald-400'} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              {t('patientVitalsHero.liveLabel', {}, { defaultValue: 'On call · live' })}
            </span>
          </div>
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80'
            }
          >
            {t('patientVitalsHero.compliance', {}, { defaultValue: 'HIPAA · encrypted' })}
          </span>
        </div>

        <div className={'mt-6'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-teal-300/80 mb-2'}>
            {t('patientVitalsHero.eyebrow', {}, { defaultValue: 'Provider dashboard' })}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight'}>
            {providerName
              ? t(
                  'patientVitalsHero.greetingNamed',
                  { greeting: greeting ?? 'Hello', name: providerName },
                  { defaultValue: '{{greeting}}, {{name}}' },
                )
              : (greeting ?? t('patientVitalsHero.greeting', {}, { defaultValue: 'Hello' }))}
          </h2>
          <p className={'text-sm md:text-base text-white/85 mt-2 max-w-lg'}>
            {t(
              'patientVitalsHero.subline',
              { count: visitsToday },
              { defaultValue: '{{count}} consults on your schedule today' },
            )}
          </p>
        </div>

        {/* Vitals chips strip */}
        {vitals.length > 0 && (
          <div className={'mt-6'}>
            <p className={'text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2'}>
              {vitalsPatientLabel
                ? t(
                    'patientVitalsHero.vitalsLabelFor',
                    { patient: vitalsPatientLabel },
                    { defaultValue: 'Last patient vitals · {{patient}}' },
                  )
                : t('patientVitalsHero.vitalsLabel', {}, { defaultValue: 'Recent patient vitals' })}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
              {vitals.slice(0, 6).map((v) => {
                const c = STATE_COLOR[v.state]
                return (
                  <div
                    key={v.label}
                    className={'px-3 py-2 rounded-xl backdrop-blur-md'}
                    style={{ backgroundColor: c.bg }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                      {v.label}
                    </p>
                    <p
                      className={'text-base font-extrabold tabular-nums font-mono mt-0.5'}
                      style={{ color: c.text }}
                    >
                      {v.value}
                      {v.unit && (
                        <span className={'text-[10px] text-white/60 ml-1 font-normal'}>
                          {v.unit}
                        </span>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stat tiles */}
        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-6')}>
          {[
            {
              label: t('patientVitalsHero.patients', {}, { defaultValue: 'Patients' }),
              value: patientCount.toLocaleString(),
              tone: 'text-white',
            },
            {
              label: t('status.today', {}, { defaultValue: 'Today' }),
              value: visitsToday.toString(),
              tone: 'text-teal-300',
            },
            {
              label: t('nav.messages', {}, { defaultValue: 'Messages' }),
              value: pendingMessages.toString(),
              tone: pendingMessages > 0 ? 'text-amber-300' : 'text-white/70',
            },
            {
              label: t('patientVitalsHero.scripts', {}, { defaultValue: 'Rx open' }),
              value: openPrescriptions.toString(),
              tone: 'text-emerald-300',
            },
          ].map((stat) => (
            <div key={stat.label} className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {stat.label}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1', stat.tone)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
