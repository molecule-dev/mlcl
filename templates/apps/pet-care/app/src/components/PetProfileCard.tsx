import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Pet profile card — circular avatar with species icon badge bottom-right
 * and a health-status accent bar (the fleet's inset accent-bar treatment), matching DESIGN.md
 * "Pet Profile Card" spec (avatar 80px circle, species badge 24px,
 * health-status pill at bottom).
 *
 * Translated from health-records' MedicationCard.tsx (accent bar +
 * shadow-sm rounded-2xl shell) and personal-finance's account-card pattern,
 * recoloured to Nuzzle's pet semantic palette (healthy / attention /
 * critical / vaccinated).
 */
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'other'

export type HealthStatus = 'healthy' | 'attention' | 'critical' | 'vaccinated'

export interface PetProfileCardProps {
  /** Pet id — when present the card links to /pets/:id. */
  id?: string
  name: string
  species: PetSpecies
  breed?: string
  /** Age display, e.g. "5 yrs" or "8 mo". */
  ageLabel?: string
  /** Optional photo URL (squared). */
  photoUrl?: string
  health: HealthStatus
  /** Status copy, e.g. "Vaccinations up to date". */
  statusLabel?: string
}

const SPECIES_ICON: Record<PetSpecies, string> = {
  dog: 'sound_detection_dog_barking',
  cat: 'pets',
  bird: 'flutter',
  rabbit: 'cruelty_free',
  fish: 'water',
  other: 'pets',
}

const SPECIES_LABEL: Record<PetSpecies, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  fish: 'Fish',
  other: 'Other',
}

const HEALTH_BORDER: Record<HealthStatus, string> = {
  healthy: 'var(--color-pet-healthy)',
  attention: 'var(--color-pet-attention)',
  critical: 'var(--color-pet-critical)',
  vaccinated: 'var(--color-pet-vaccinated)',
}

const HEALTH_PILL: Record<HealthStatus, string> = {
  healthy: 'bg-success-container text-on-success-container',
  attention: 'bg-warning-container text-on-warning-container',
  critical: 'bg-error-container text-on-error-container',
  vaccinated: 'bg-tertiary-container text-on-tertiary-container',
}

export function PetProfileCard({
  id,
  name,
  species,
  breed,
  ageLabel,
  photoUrl,
  health,
  statusLabel,
}: PetProfileCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inner = (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center' }),
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all h-full',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: HEALTH_BORDER[health] }}
    >
      <div className={cm.cn('relative')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'overflow-hidden border-[3px] border-primary',
          )}
          style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-pet-booked-bg)' }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={name} className={cm.cn('w-full h-full object-cover')} />
          ) : (
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {SPECIES_ICON[species]}
            </span>
          )}
        </div>
        <span
          className={cm.cn(
            'absolute -bottom-1 -right-1',
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'bg-surface shadow-md',
          )}
          style={{ width: '28px', height: '28px' }}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-base text-primary')}>
            {SPECIES_ICON[species]}
          </span>
        </span>
      </div>

      <p
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 4),
          'truncate max-w-full',
        )}
        style={{ fontFamily: "var(--mol-font-display, 'Plus Jakarta Sans', 'Inter', sans-serif)" }}
      >
        {name}
      </p>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {breed && ageLabel
          ? t(
              'petProfileCard.breedAndAge',
              { breed, age: ageLabel },
              { defaultValue: '{{breed}} · {{age}}' },
            )
          : breed ||
            ageLabel ||
            t(`petProfileCard.species.${species}`, {}, { defaultValue: SPECIES_LABEL[species] })}
      </p>

      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 4),
          cm.w('full'),
          cm.textCenter,
          'px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-full',
          HEALTH_PILL[health],
        )}
      >
        {statusLabel ??
          t(
            `petProfileCard.health.${health}`,
            {},
            {
              defaultValue:
                health === 'healthy'
                  ? 'Healthy'
                  : health === 'attention'
                    ? 'Needs attention'
                    : health === 'critical'
                      ? 'Critical'
                      : 'Up to date',
            },
          )}
      </span>
    </article>
  )

  return id ? (
    <Link to={`/pets/${id}`} className={cm.cn('block h-full')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default PetProfileCard
