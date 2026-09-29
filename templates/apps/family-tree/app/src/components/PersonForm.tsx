import { useMemo } from 'react'
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Shared biographical form fields for create/edit person flows.
 * Controlled by the parent — the parent owns submit + relative wiring.
 *
 * `variant` selects the section chrome around the same fields:
 *  - `flat`    — one continuous grid (AddRelative's compact thread, default)
 *  - `dossier` — the Add-Person design sections (numbered ledger sections)
 *  - `ledger`  — the Edit-Person design sections (archival record sections)
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

export type PersonFormVariant = 'flat' | 'dossier' | 'ledger' | 'thread'

export interface PersonFormProps {
  value: PersonFormValue
  onChange: (patch: Partial<PersonFormValue>) => void
  /** Prefix for every field id / data-mol-id (stable across variants). */
  idPrefix?: string
  /** Section chrome around the fields. Defaults to `flat`. */
  variant?: PersonFormVariant
  /**
    Design sections 3–4 (kinship placement, keepsake media) rendered between
    the milestones section and the narrative section — only in sectioned
    variants. Lets the parent keep the design's exact section order without
    splitting the field set.
  */
  betweenSections?: ReactNode
}

interface SectionHeadProps {
  level: 'h2' | 'h3'
  text: string
  muted?: boolean
}

/** Section heading shared by the sectioned variants. */
function SectionHead({ level, text, muted }: SectionHeadProps) {
  const cm = getClassMap()
  const Tag = level
  return (
    <Tag
      className={
        level === 'h2'
          ? cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )
          : cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')
      }
      style={level === 'h2' && muted === true ? { color: 'var(--color-forest-hover)' } : undefined}
    >
      {text}
    </Tag>
  )
}

export function PersonForm({
  value,
  onChange,
  idPrefix = 'person',
  variant = 'flat',
  betweenSections,
}: PersonFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sectioned = variant !== 'flat'

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
  const fieldGrid = cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')

  // Design section titles per variant (same fields, different ledger chrome).
  const titles = useMemo(() => {
    if (variant === 'dossier') {
      return {
        identity: t(
          'personForm.section.identityNew',
          {},
          { defaultValue: '1. Essential Identity & Naming' },
        ),
        milestones: t(
          'personForm.section.milestonesNew',
          {},
          { defaultValue: '2. Vital Milestones' },
        ),
        birth: t('personForm.section.birth', {}, { defaultValue: 'Birth & Nativity' }),
        death: t('personForm.section.passing', {}, { defaultValue: 'Resting Sanctuary & Passing' }),
        narrative: t(
          'personForm.section.narrativeNew',
          {},
          { defaultValue: '5. Personal Lore & Archival Narrative' },
        ),
      }
    }
    if (variant === 'ledger') {
      return {
        identity: t(
          'personForm.section.identityEdit',
          {},
          { defaultValue: 'Archival Identity & Name Forms' },
        ),
        milestones: t(
          'personForm.section.milestonesEdit',
          {},
          { defaultValue: 'Vital Milestones & Provenance' },
        ),
        birth: t('personForm.section.birth', {}, { defaultValue: 'Birth & Nativity' }),
        death: t('personForm.section.passing', {}, { defaultValue: 'Resting Sanctuary & Passing' }),
        narrative: t(
          'personForm.section.narrativeEdit',
          {},
          { defaultValue: 'Archival Narrative & Life Tapestry' },
        ),
      }
    }
    // 'thread' — the Add-Relative design sections (h3-level ledger chrome)
    return {
      identity: t(
        'personForm.section.identityThread',
        {},
        { defaultValue: 'Vital Identity & Archival Nomenclature' },
      ),
      milestones: t(
        'personForm.section.milestonesThread',
        {},
        { defaultValue: 'Milestones & Lineage Provenance' },
      ),
      birth: '',
      death: '',
      narrative: t(
        'personForm.section.narrativeThread',
        {},
        { defaultValue: 'Archival Narrative' },
      ),
    }
  }, [t, variant])

  const identityFields = (
    <>
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
    </>
  )

  const birthFields = (
    <>
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
    </>
  )

  const deathFields = (
    <>
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
    </>
  )

  const narrativeField = (
    <div className={sectioned ? cm.cn(cm.flex({ direction: 'col', gap: 'md' })) : 'sm:col-span-2'}>
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
  )

  if (!sectioned || !titles) {
    return (
      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
        {identityFields}
        {birthFields}
        {deathFields}
        {narrativeField}
      </div>
    )
  }

  const headLevel: 'h2' | 'h3' = variant === 'thread' ? 'h3' : 'h2'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SectionHead level={headLevel} text={titles.identity} />
        <div className={fieldGrid}>{identityFields}</div>
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SectionHead level={headLevel} text={titles.milestones} />
        {variant === 'thread' ? (
          <div className={fieldGrid}>
            {birthFields}
            {deathFields}
          </div>
        ) : (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('pl', 4),
              'border-l border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <SectionHead level="h3" text={titles.birth} />
              <div className={fieldGrid}>{birthFields}</div>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <SectionHead level="h3" text={titles.death} />
              <div className={fieldGrid}>{deathFields}</div>
            </div>
          </div>
        )}
      </section>

      {betweenSections}

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <SectionHead level={headLevel} text={titles.narrative} />
        {narrativeField}
      </section>
    </div>
  )
}

export default PersonForm
