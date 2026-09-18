import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Nuzzle Dashboard hero — teal-to-emerald gradient surface with the pet
 * household headline (greeting), a chip strip of pet avatars (each with
 * a status dot), and a frosted-glass eyebrow announcing the next
 * upcoming appointment.
 *
 * Translated from health-records' VitalsHeroCard.tsx + telemedicine's
 * PatientVitalsHero.tsx — gradient hero shape, decorative orbs, and
 * frosted-glass status pill come from those siblings; the pet avatar
 * chip strip is recoloured to Nuzzle's teal-emerald palette and uses
 * circular avatars per DESIGN.md "Pet profile cards always use
 * circular avatars".
 */
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'other'

export type PetHealth = 'healthy' | 'attention' | 'critical'

export interface PetChip {
  id: string
  name: string
  species: PetSpecies
  health: PetHealth
  /** Optional photo URL (squared). Falls back to species icon. */
  photoUrl?: string
}

export interface PetSnapshotHeroProps {
  /** Owner's first name (or display name). */
  ownerName?: string
  /** Pets to feature in the chip strip (max 6 shown). */
  pets: ReadonlyArray<PetChip>
  petsCount: number
  upcomingCount: number
  alertsCount: number
  /** Display label for the next appointment, e.g. "Today, 3:00 PM · Dr. Riley". */
  nextAppointmentLabel?: string
}

const SPECIES_ICON: Record<PetSpecies, string> = {
  dog: 'sound_detection_dog_barking',
  cat: 'pets',
  bird: 'flutter',
  rabbit: 'cruelty_free',
  fish: 'water',
  other: 'pets',
}

const HEALTH_COLOR: Record<PetHealth, string> = {
  healthy: 'var(--color-pet-healthy)',
  attention: 'var(--color-pet-attention)',
  critical: 'var(--color-pet-critical)',
}

export function PetSnapshotHero({
  ownerName,
  pets,
  petsCount,
  upcomingCount,
  alertsCount,
  nextAppointmentLabel,
}: PetSnapshotHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--color-brand-navy)', minHeight: '380px' }}
    >
      <div
        className={cm.cn('absolute inset-0')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 30%, color-mix(in srgb, var(--mol-color-primary) 55%, transparent) 0%, transparent 35%),' +
            'radial-gradient(circle at 75% 25%, color-mix(in srgb, var(--mol-color-secondary) 30%, transparent) 0%, transparent 32%),' +
            'radial-gradient(circle at 85% 75%, color-mix(in srgb, var(--mol-color-primary-light) 30%, transparent) 0%, transparent 30%),' +
            'linear-gradient(135deg, var(--color-brand-navy) 0%, var(--mol-color-primary-dark) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Decorative orbs */}
      <div
        className={cm.cn(
          'absolute rounded-full bg-cyan-500/20 blur-3xl',
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

      {/* Paw-print silhouettes — subtle decorative */}
      <svg
        className={cm.cn('absolute right-8 bottom-12 opacity-10')}
        width="160"
        height="120"
        viewBox="0 0 160 120"
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r="14" fill="white" />
        <circle cx="80" cy="22" r="11" fill="white" />
        <circle cx="120" cy="40" r="14" fill="white" />
        <circle cx="56" cy="72" r="11" fill="white" />
        <circle cx="104" cy="72" r="11" fill="white" />
        <ellipse cx="80" cy="92" rx="26" ry="20" fill="white" />
      </svg>

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
              {t('petSnapshotHero.liveLabel', {}, { defaultValue: 'All pets · Live' })}
            </span>
          </div>
          {nextAppointmentLabel && (
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white/90',
              )}
            >
              {t(
                'petSnapshotHero.nextAppointment',
                { label: nextAppointmentLabel },
                { defaultValue: 'Next: {{label}}' },
              )}
            </span>
          )}
        </div>

        <div className={cm.sp('mt', 6)}>
          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-cyan-300/90 mb-2',
            )}
          >
            {t('petSnapshotHero.eyebrow', {}, { defaultValue: 'Your pet household' })}
          </p>
          <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {ownerName
              ? t(
                  'petSnapshotHero.greetingNamed',
                  { name: ownerName },
                  { defaultValue: 'Hi, {{name}}' },
                )
              : t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
          </h2>
          <p className={cm.cn('text-sm md:text-base text-white/85 mt-2 max-w-lg')}>
            {t(
              'petSnapshotHero.subline',
              { pets: petsCount, upcoming: upcomingCount, alerts: alertsCount },
              {
                defaultValue:
                  '{{pets}} pets in your care · {{upcoming}} upcoming visits · {{alerts}} health alerts',
              },
            )}
          </p>
        </div>

        {pets.length > 0 && (
          <div className={cm.sp('mt', 6)}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3',
              )}
            >
              {t('petSnapshotHero.petsLabel', {}, { defaultValue: 'Your pets' })}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }))}>
              {pets.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}
                >
                  <div className={cm.cn('relative')}>
                    <div
                      className={cm.cn(
                        cm.w(12),
                        cm.h(12),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        'overflow-hidden bg-surface/15 backdrop-blur-md border-2',
                      )}
                      style={{ borderColor: HEALTH_COLOR[p.health] }}
                    >
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className={cm.cn('w-full h-full object-cover')}
                        />
                      ) : (
                        <span className={cm.cn('material-symbols-outlined text-white text-xl')}>
                          {SPECIES_ICON[p.species]}
                        </span>
                      )}
                    </div>
                    <span
                      className={cm.cn(
                        'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-surface',
                      )}
                      style={{ backgroundColor: HEALTH_COLOR[p.health] }}
                      role="img"
                      aria-label={p.health}
                    />
                  </div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold text-white/90 max-w-[60px] truncate text-center',
                    )}
                  >
                    {p.name}
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

export default PetSnapshotHero
