/**
 * Modal form for creating a new pet (POST /api/pets).
 * Closes on success and invokes onCreated with the persisted record so
 * the parent can prepend it to the local list without a full refetch.
 */
import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface CreatedPet {
  id?: string
  name?: string
  data?: { id?: string; name?: string }
}

interface NewPet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  photo_url?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (pet: NewPet) => void
}

/** English defaults for the species picker — rendered through t() below. */
const SPECIES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'fish', label: 'Fish' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'other', label: 'Other' },
]

export function AddPetModal({ open, onClose, onCreated }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [name, setName] = useState('')
  const [species, setSpecies] = useState('dog')
  const [breed, setBreed] = useState('')
  const [dob, setDob] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const reset = () => {
    setName('')
    setSpecies('dog')
    setBreed('')
    setDob('')
    setPhotoUrl('')
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/pets', {
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        date_of_birth: dob || undefined,
        photo_url: photoUrl.trim() || undefined,
      })
      const created = unwrapSingle<CreatedPet>(res)
      const pet: NewPet = {
        id: created?.id ?? created?.data?.id ?? '',
        name: created?.name ?? created?.data?.name ?? name.trim(),
        species,
        breed: breed.trim() || undefined,
        date_of_birth: dob || undefined,
        photo_url: photoUrl.trim() || undefined,
      }
      if (pet.id) onCreated?.(pet)
      track({ name: 'pet.added', properties: { petId: pet.id, species } })
      reset()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('addPet.errors.failed', {}, { defaultValue: 'Could not add pet.' }))
      console.error('[AddPetModal] failed', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="presentation"
      className={cm.cn(
        'fixed inset-0 z-50',
        cm.flex({ align: 'center', justify: 'center' }),
        'bg-foreground/50 p-4',
      )}
      data-mol-id="modal-add-pet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pet-title"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-xl w-full max-w-md max-h-[90vh] overflow-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 id="add-pet-title" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('addPet.title', {}, { defaultValue: 'Add a pet' })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cm.cn(
              'material-symbols-outlined',
              cm.sp('p', 1),
              'rounded-full hover:bg-surface-container',
            )}
            aria-label={t('common.close', {}, { defaultValue: 'Close' })}
          >
            close
          </button>
        </div>

        <form
          onSubmit={submit}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          data-mol-id="form-add-pet"
        >
          <div>
            <label
              htmlFor="pet-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="pet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="pet-species"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('addPet.species', {}, { defaultValue: 'Species' })}
            </label>
            <select
              id="pet-species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            >
              {SPECIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`addPet.speciesOption.${s.value}`, {}, { defaultValue: s.label })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="pet-breed"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('addPet.breed', {}, { defaultValue: 'Breed (optional)' })}
            </label>
            <input
              id="pet-breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="pet-dob"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('addPet.dob', {}, { defaultValue: 'Date of birth (optional)' })}
            </label>
            <input
              id="pet-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="pet-photo"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('addPet.photo', {}, { defaultValue: 'Photo URL (optional)' })}
            </label>
            <input
              id="pet-photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://"
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>

          {error && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-error-container bg-error-container rounded-lg p-3',
              )}
              role="alert"
            >
              {error}
            </p>
          )}

          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('mt', 2))}>
            <button
              type="button"
              onClick={onClose}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg text-white disabled:opacity-50',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-pet-booked), var(--color-pet-healthy))',
              }}
              data-mol-id="submit-add-pet"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('addPet.submit', {}, { defaultValue: 'Add pet' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
