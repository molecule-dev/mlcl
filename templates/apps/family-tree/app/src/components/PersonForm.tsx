import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Shared biographical form fields for create/edit person flows.
 * Controlled by the parent — the parent owns submit + relative wiring.
 */

export interface PersonFormValue {
  first_name: string
  last_name: string
  maiden_name: string
  gender: string
  birth_date: string
  birth_place: string
  death_date: string
  death_place: string
  notes: string
}

export const EMPTY_PERSON_FORM: PersonFormValue = {
  first_name: '',
  last_name: '',
  maiden_name: '',
  gender: '',
  birth_date: '',
  birth_place: '',
  death_date: '',
  death_place: '',
  notes: '',
}

const GENDER_OPTIONS = ['female', 'male', 'nonbinary', 'other'] as const

export interface PersonFormProps {
  value: PersonFormValue
  onChange: (patch: Partial<PersonFormValue>) => void
  /** Disable the death row (e.g. none — reserved for future use). */
  idPrefix?: string
}

export function PersonForm({ value, onChange, idPrefix = 'person' }: PersonFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const label = (key: string, def: string): string =>
    t(`personForm.${key}`, {}, { defaultValue: def })

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('py', 3),
    cm.sp('px', 4),
    cm.textSize('sm'),
    'bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all',
  )
  const labelClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.sp('mb', 2),
    'block text-[0.6875rem] text-on-surface-variant tracking-[0.05em]',
  )

  return (
    <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-first-name`}>
          {label('firstName', 'FIRST NAME') + ' *'}
        </label>
        <input
          id={`${idPrefix}-first-name`}
          data-mol-id={`${idPrefix}-first-name`}
          type="text"
          required
          value={value.first_name}
          onChange={(e) => onChange({ first_name: e.target.value })}
          placeholder={t('personForm.firstNamePlaceholder', {}, { defaultValue: 'Margaret' })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-last-name`}>
          {label('lastName', 'LAST NAME')}
        </label>
        <input
          id={`${idPrefix}-last-name`}
          data-mol-id={`${idPrefix}-last-name`}
          type="text"
          value={value.last_name}
          onChange={(e) => onChange({ last_name: e.target.value })}
          placeholder={t('personForm.lastNamePlaceholder', {}, { defaultValue: 'Doyle' })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-maiden-name`}>
          {label('maidenName', 'MAIDEN / BIRTH SURNAME')}
        </label>
        <input
          id={`${idPrefix}-maiden-name`}
          data-mol-id={`${idPrefix}-maiden-name`}
          type="text"
          value={value.maiden_name}
          onChange={(e) => onChange({ maiden_name: e.target.value })}
          placeholder={t('personForm.maidenNamePlaceholder', {}, { defaultValue: 'Optional' })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-gender`}>
          {label('gender', 'GENDER')}
        </label>
        <select
          id={`${idPrefix}-gender`}
          data-mol-id={`${idPrefix}-gender`}
          value={value.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
          className={inputClass}
        >
          <option value="">
            {t('personForm.genderUnspecified', {}, { defaultValue: 'Not specified' })}
          </option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {t(`personForm.gender.${g}`, {}, { defaultValue: g })}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-birth-date`}>
          {label('birthDate', 'BIRTH DATE')}
        </label>
        <input
          id={`${idPrefix}-birth-date`}
          data-mol-id={`${idPrefix}-birth-date`}
          type="date"
          value={value.birth_date}
          onChange={(e) => onChange({ birth_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-birth-place`}>
          {label('birthPlace', 'BIRTH PLACE')}
        </label>
        <input
          id={`${idPrefix}-birth-place`}
          data-mol-id={`${idPrefix}-birth-place`}
          type="text"
          value={value.birth_place}
          onChange={(e) => onChange({ birth_place: e.target.value })}
          placeholder={t(
            'personForm.birthPlacePlaceholder',
            {},
            { defaultValue: 'Galway, Ireland' },
          )}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-death-date`}>
          {label('deathDate', 'DEATH DATE')}
        </label>
        <input
          id={`${idPrefix}-death-date`}
          data-mol-id={`${idPrefix}-death-date`}
          type="date"
          value={value.death_date}
          onChange={(e) => onChange({ death_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-death-place`}>
          {label('deathPlace', 'DEATH PLACE')}
        </label>
        <input
          id={`${idPrefix}-death-place`}
          data-mol-id={`${idPrefix}-death-place`}
          type="text"
          value={value.death_place}
          onChange={(e) => onChange({ death_place: e.target.value })}
          placeholder={t('personForm.deathPlacePlaceholder', {}, { defaultValue: 'Optional' })}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${idPrefix}-notes`}>
          {label('notes', 'RESEARCH NOTES')}
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          data-mol-id={`${idPrefix}-notes`}
          rows={3}
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder={t(
            'personForm.notesPlaceholder',
            {},
            { defaultValue: 'Sources, open questions, stories…' },
          )}
          className={cm.cn(inputClass, 'resize-y')}
        />
      </div>
    </div>
  )
}

export default PersonForm
