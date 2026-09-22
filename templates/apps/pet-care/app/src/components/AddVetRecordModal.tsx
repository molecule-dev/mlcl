/**
 * Modal form for creating a vet record (POST /api/vet-records).
 * Owner picks one of their pets, supplies title/kind/date/vet/summary.
 */
import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Pet {
  id: string
  name: string
}

interface CreatedRecord {
  id?: string
  data?: { id?: string }
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (recordId: string) => void
  initialPetId?: string
}

/** English defaults for the record-kind picker — rendered through t() below. */
const KINDS = [
  { value: 'visit', label: 'Checkup / visit' },
  { value: 'vaccine', label: 'Vaccination' },
  { value: 'test', label: 'Lab / test' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'other', label: 'Other' },
]

export function AddVetRecordModal({ open, onClose, onCreated, initialPetId }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [pets, setPets] = useState<Pet[]>([])
  const [petId, setPetId] = useState<string>(initialPetId ?? '')
  const [kind, setKind] = useState('visit')
  const [title, setTitle] = useState('')
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [vetName, setVetName] = useState('')
  const [summary, setSummary] = useState('')
  const [followUp, setFollowUp] = useState('')
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
        if (!petId && list.length > 0) setPetId(list[0].id)
      })
      .catch((err: unknown) => {
        console.error('[AddVetRecordModal] pets failed', err)
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
      setError(t('vetRecords.errors.pet', {}, { defaultValue: 'Pick a pet.' }))
      return
    }
    if (!title.trim()) {
      setError(t('vetRecords.errors.title', {}, { defaultValue: 'Add a short title.' }))
      return
    }
    setSubmitting(true)
    try {
      const res = await http.post('/api/vet-records', {
        pet_id: petId,
        kind,
        title: title.trim(),
        occurred_on: occurredOn,
        vet_name: vetName.trim() || undefined,
        summary: summary.trim() || undefined,
        follow_up_date: followUp || undefined,
      })
      const created = unwrapSingle<CreatedRecord>(res)
      const id = created?.id ?? created?.data?.id
      if (id) onCreated?.(id)
      track({ name: 'vet-record.added', properties: { recordId: id ?? '', petId, kind } })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('vetRecords.errors.failed', {}, { defaultValue: 'Could not save record.' }))
      console.error('[AddVetRecordModal] failed', err)
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
      data-mol-id="modal-add-vet-record"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vet-record-title"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-xl w-full max-w-md max-h-[90vh] overflow-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 id="add-vet-record-title" className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('vetRecords.add.title', {}, { defaultValue: 'Add vet record' })}
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
          data-mol-id="form-add-vet-record"
        >
          <div>
            <label
              htmlFor="vr-pet"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('vetRecords.add.pet', {}, { defaultValue: 'Pet' })}
            </label>
            <select
              id="vr-pet"
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
                  {t('vetRecords.add.noPets', {}, { defaultValue: '— add a pet first —' })}
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
              htmlFor="vr-kind"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.type', {}, { defaultValue: 'Type' })}
            </label>
            <select
              id="vr-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('mt', 1),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border border-outline/20',
              )}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {t(`vetRecords.kind.${k.value}`, {}, { defaultValue: k.label })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="vr-title"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </label>
            <input
              id="vr-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(
                'vetRecords.add.titlePlaceholder',
                {},
                { defaultValue: 'Annual checkup' },
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
                htmlFor="vr-date"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.date', {}, { defaultValue: 'Date' })}
              </label>
              <input
                id="vr-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
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
                htmlFor="vr-followup"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('vetRecords.add.followUp', {}, { defaultValue: 'Follow-up' })}
              </label>
              <input
                id="vr-followup"
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
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
              htmlFor="vr-vet"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('vetRecords.add.vet', {}, { defaultValue: 'Vet (optional)' })}
            </label>
            <input
              id="vr-vet"
              value={vetName}
              onChange={(e) => setVetName(e.target.value)}
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
              htmlFor="vr-summary"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.summary', {}, { defaultValue: 'Summary' })}
            </label>
            <textarea
              id="vr-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
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
              data-mol-id="submit-add-vet-record"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('vetRecords.add.submit', {}, { defaultValue: 'Save record' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
