import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const PILL_COLORS = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow'] as const
type PillColor = (typeof PILL_COLORS)[number]

const COLOR_VAR: Record<PillColor, string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

export function AddMedication() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [doseAmount, setDoseAmount] = useState('')
  const [pillColor, setPillColor] = useState<PillColor>('blue')
  const [scheduleSummary, setScheduleSummary] = useState('Daily, 8:00am')
  const [pharmacy, setPharmacy] = useState('')
  const [warningOpts, setWarningOpts] = useState({
    takeWithFood: false,
    avoidAlcohol: false,
    drowsiness: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const warnings: string[] = []
      if (warningOpts.takeWithFood) warnings.push('Take with food')
      if (warningOpts.avoidAlcohol) warnings.push('Avoid alcohol')
      if (warningOpts.drowsiness) warnings.push('May cause drowsiness')
      await http.post('/api/medications', {
        name: name.trim(),
        dose_amount: doseAmount.trim(),
        pill_color: pillColor,
        schedule_summary: scheduleSummary.trim(),
        pharmacy: pharmacy.trim(),
        warnings,
      })
      navigate('/medications')
    } catch (error) {
      logError('addMedication.save', error)
      setError(t('addMedication.saveError', {}, { defaultValue: 'Failed to save.' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/medications"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('addMedication.backLink', {}, { defaultValue: 'All medications' })}
      </Link>

      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('addMedication.heading', {}, { defaultValue: 'Add medication' })}
        </h1>
      </header>

      <form onSubmit={submit} className={cm.cn('space-y-5')}>
        <Field
          label={t('addMedication.name', {}, { defaultValue: 'Medication name' })}
          value={name}
          onChange={setName}
          required
        />
        <Field
          label={t('addMedication.doseAmount', {}, { defaultValue: 'Dose (e.g. 10 mg)' })}
          value={doseAmount}
          onChange={setDoseAmount}
          required
        />

        <fieldset>
          <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 2))}>
            {t('addMedication.pillColor', {}, { defaultValue: 'Pill color (for visual ID)' })}
          </legend>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {PILL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPillColor(c)}
                aria-pressed={pillColor === c}
                aria-label={t(`addMedication.pillColorName.${c}`, {}, { defaultValue: c })}
                className={cm.cn(
                  cm.h(10),
                  cm.w(10),
                  'rounded-full border-2',
                  pillColor === c ? 'border-primary' : 'border-transparent',
                )}
                style={{ backgroundColor: COLOR_VAR[c] }}
              />
            ))}
          </div>
        </fieldset>

        <Field
          label={t('nav.schedule', {}, { defaultValue: 'Schedule' })}
          value={scheduleSummary}
          onChange={setScheduleSummary}
          required
        />
        <Field
          label={t('addMedication.pharmacy', {}, { defaultValue: 'Pharmacy' })}
          value={pharmacy}
          onChange={setPharmacy}
        />

        <fieldset className={cm.cn('space-y-2')}>
          <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 2))}>
            {t(
              'addMedication.warningsLabel',
              {},
              { defaultValue: 'Warnings (select any that apply)' },
            )}
          </legend>
          <Toggle
            label={t('addMedication.takeWithFood', {}, { defaultValue: 'Take with food' })}
            checked={warningOpts.takeWithFood}
            onChange={(v) => setWarningOpts((o) => ({ ...o, takeWithFood: v }))}
          />
          <Toggle
            label={t('addMedication.avoidAlcohol', {}, { defaultValue: 'Avoid alcohol' })}
            checked={warningOpts.avoidAlcohol}
            onChange={(v) => setWarningOpts((o) => ({ ...o, avoidAlcohol: v }))}
          />
          <Toggle
            label={t('addMedication.drowsiness', {}, { defaultValue: 'May cause drowsiness' })}
            checked={warningOpts.drowsiness}
            onChange={(v) => setWarningOpts((o) => ({ ...o, drowsiness: v }))}
          />
        </fieldset>

        {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}

        <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
          <Link
            to="/medications"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('addMedication.saveLabel', {}, { defaultValue: 'Save medication' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 3),
          cm.textSize('base'),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
