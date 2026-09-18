import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AddPetModal } from '../components/AddPetModal.js'
import { type HealthStatus, PetProfileCard, type PetSpecies } from '../components/PetProfileCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiPet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  photo_url?: string
  health_status?: string
}

function speciesOf(s: string | undefined): PetSpecies {
  switch (s) {
    case 'dog':
      return 'dog'
    case 'cat':
      return 'cat'
    case 'bird':
      return 'bird'
    case 'rabbit':
      return 'rabbit'
    case 'fish':
      return 'fish'
    default:
      return 'other'
  }
}

function healthOf(s: string | undefined): HealthStatus {
  if (s === 'attention' || s === 'critical' || s === 'vaccinated') return s
  return 'healthy'
}

function ageOf(dob: string | undefined): string | undefined {
  if (!dob) return undefined
  const t = Date.now() - new Date(dob).getTime()
  if (Number.isNaN(t)) return undefined
  const years = Math.floor(t / (365.25 * 24 * 3600 * 1000))
  if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`
  const months = Math.max(1, Math.floor(t / (30 * 24 * 3600 * 1000)))
  return `${months} mo`
}

export function Pets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pets, setPets] = useState<ApiPet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | PetSpecies>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/pets?limit=100')
      .then((res) => {
        if (cancelled) return
        setPets(unwrapList<ApiPet>(res))
      })
      .catch((err: unknown) => {
        console.error('[Pets] failed to load pets', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const data = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: speciesOf(p.species),
    breed: p.breed,
    ageLabel: ageOf(p.date_of_birth),
    photoUrl: p.photo_url,
    health: healthOf(p.health_status),
    statusLabel: undefined as string | undefined,
  }))

  const filtered = filter === 'all' ? data : data.filter((p) => p.species === filter)

  const speciesFilters: Array<{ key: 'all' | PetSpecies; icon: string; label: string }> = [
    { key: 'all', icon: 'pets', label: 'All' },
    { key: 'dog', icon: 'sound_detection_dog_barking', label: 'Dogs' },
    { key: 'cat', icon: 'pets', label: 'Cats' },
    { key: 'bird', icon: 'flutter', label: 'Birds' },
    { key: 'rabbit', icon: 'cruelty_free', label: 'Rabbits' },
  ]

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-pets">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-1',
            )}
          >
            {t('pets.eyebrow', {}, { defaultValue: 'Roster' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('pets.title', {}, { defaultValue: 'Your pets' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'pets.subtitle',
              { count: filtered.length },
              { defaultValue: '{{count}} profiles · tap any pet to dive in.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
          }}
          data-mol-id="cta-add-pet"
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
          {t('pets.addCta', {}, { defaultValue: 'Add a pet' })}
        </button>
      </div>

      {/* Species filter chips */}
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mb', 6))}>
        {speciesFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>{f.icon}</span>
            {t(`pets.filter.${f.key}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('pets.loading', {}, { defaultValue: 'Loading pets…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 12), 'rounded-xl bg-surface-container-low')}
          data-mol-id="pets-empty"
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-6xl text-primary mb-2 block opacity-50',
            )}
          >
            pets
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {pets.length === 0
              ? t('pets.empty.firstTitle', {}, { defaultValue: 'No pets yet' })
              : t('pets.empty.title', {}, { defaultValue: 'No pets in this view' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {pets.length === 0
              ? t(
                  'pets.empty.firstBody',
                  {},
                  {
                    defaultValue:
                      'Add your first pet to start tracking care, vet visits, and medications.',
                  },
                )
              : t('pets.empty.body', {}, { defaultValue: 'Try a different species filter.' })}
          </p>
          {pets.length === 0 && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-xl text-white inline-flex',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
              }}
              data-mol-id="cta-add-first-pet"
            >
              {t('pets.empty.cta', {}, { defaultValue: 'Add your first pet' })}
            </button>
          )}
        </div>
      ) : (
        <div
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {filtered.map((p) => (
            <PetProfileCard
              key={p.id}
              id={p.id}
              name={p.name}
              species={p.species}
              breed={p.breed}
              ageLabel={p.ageLabel}
              photoUrl={p.photoUrl}
              health={p.health}
              statusLabel={p.statusLabel}
            />
          ))}
        </div>
      )}

      <AddPetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(pet) => {
          setPets((prev) => [
            ...prev,
            {
              id: pet.id,
              name: pet.name,
              species: pet.species,
              breed: pet.breed,
              date_of_birth: pet.date_of_birth,
              photo_url: pet.photo_url,
            },
          ])
        }}
      />
    </div>
  )
}
