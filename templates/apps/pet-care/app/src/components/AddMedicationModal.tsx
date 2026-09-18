/**
 * Modal for adding a pet medication (POST /api/medications).
 */
import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Pet {
  id: string
  name: string
}

interface CreatedMed {
  id?: string
  data?: { id?: string }
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (medId: string) => void
}

export function AddMedicationModal({ open, onClose, onCreated }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [pets, setPets] = useState<Pet[]>([])
  const [petId, setPetId] = useState('')
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [instructions, setInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    http
      .get('/api/pets')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<Pet>(res)
        setPets(list)
        if (list.length > 0 && !petId) setPetId(list[0].id)
      })
      .catch((err: unknown) => {
        console.error('[AddMedicationModal] pets failed', err)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- petId intentionally omitted to avoid re-fetching on every selection change
  }, [http, open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!petId) {
      setError(t('medications.errors.pet', {}, { defaultValue: 'Pick a pet.' }))
      return
    }
    if (!name.trim()) {
      setError(t('medications.errors.name', {}, { defaultValue: 'Medication name is required.' }))
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/medications', {
        pet_id: petId,
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        frequency: frequency.trim() || undefined,
        prescriber: prescriber.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        instructions: instructions.trim() || undefined,
        is_active: true,
      })
      const created = unwrapSingle<CreatedMed>(res)
      const id = created?.id ?? created?.data?.id
      if (id) onCreated?.(id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg || t('medications.errors.failed', {}, { defaultValue: 'Could not save medication.' }),
      )
      console.error('[AddMedicationModal] failed', err)
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
      data-mol-id="modal-add-medication"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-medication-title"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-xl w-full max-w-md max-h-[90vh] overflow-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 id="add-medication-title" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('medications.add.title', {}, { defaultValue: 'Add medication' })}
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
          data-mol-id="form-add-medication"
        >
          <div>
            <label
              htmlFor="med-pet"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('medications.add.pet', {}, { defaultValue: 'Pet' })}
            </label>
            <select
              id="med-pet"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            >
              {pets.length === 0 ? (
                <option value="">
                  {t('medications.add.noPets', {}, { defaultValue: '— add a pet first —' })}
                </option>
              ) : (
                pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="med-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="med-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'medications.add.namePlaceholder',
                {},
                { defaultValue: 'Heartgard Plus' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
            <div>
              <label
                htmlFor="med-dosage"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('medications.add.dosage', {}, { defaultValue: 'Dosage' })}
              </label>
              <input
                id="med-dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder={t('medications.add.dosagePlaceholder', {}, { defaultValue: '5 mg' })}
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
                htmlFor="med-frequency"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('medications.add.frequency', {}, { defaultValue: 'Frequency' })}
              </label>
              <input
                id="med-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder={t(
                  'medications.add.frequencyPlaceholder',
                  {},
                  { defaultValue: 'Once daily' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mt', 1),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border border-outline/20',
                )}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="med-prescriber"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('medications.add.prescriber', {}, { defaultValue: 'Prescribed by' })}
            </label>
            <input
              id="med-prescriber"
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            />
          </div>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2')}>
            <div>
              <label
                htmlFor="med-start"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('common.start', {}, { defaultValue: 'Start' })}
              </label>
              <input
                id="med-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                htmlFor="med-end"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('medications.add.end', {}, { defaultValue: 'End (optional)' })}
              </label>
              <input
                id="med-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('mt', 1),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border border-outline/20',
                )}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="med-instructions"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('medications.add.instructions', {}, { defaultValue: 'Instructions' })}
            </label>
            <textarea
              id="med-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
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
              disabled={submitting || pets.length === 0}
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
              data-mol-id="submit-add-medication"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('medications.add.submit', {}, { defaultValue: 'Save medication' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
