import { getClassMap } from '@molecule/app-ui'

interface BaseFieldProps {
  label: string
  id: string
  required?: boolean
  hint?: string
}

interface InputFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'password'
  step?: string
  min?: string
  max?: string
  placeholder?: string
}

interface SelectFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string } | string>
  placeholder?: string
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  rows?: number
}

/**
 * Labelled input row. Compact layout used inside modal forms (Add SKU,
 * Add Warehouse, Adjust Stock, Create Transfer).
 */
export function Field(props: InputFieldProps) {
  const cm = getClassMap()
  const {
    id,
    label,
    required,
    value,
    onChange,
    type = 'text',
    step,
    min,
    max,
    placeholder,
    hint,
  } = props
  return (
    <label htmlFor={id} className={cm.stack(1)}>
      <span
        className={cm.cn('text-[10px] font-bold uppercase tracking-wider text-on-surface-variant')}
      >
        {label}
        {required && <span className={cm.cn('text-error ml-1')}>*</span>}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'rounded-lg border border-outline-variant bg-background-secondary text-sm text-on-surface focus:border-primary focus:bg-surface outline-none',
        )}
      />
      {hint && <span className={cm.cn('text-[10px] text-on-surface-variant')}>{hint}</span>}
    </label>
  )
}

/**
 * Labelled select row. Same compact layout as <Field> but for enums /
 * foreign-key selectors (warehouse, product, plan, etc).
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
  hint,
}: SelectFieldProps) {
  const cm = getClassMap()
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label htmlFor={id} className={cm.stack(1)}>
      <span
        className={cm.cn('text-[10px] font-bold uppercase tracking-wider text-on-surface-variant')}
      >
        {label}
        {required && <span className={cm.cn('text-error ml-1')}>*</span>}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'rounded-lg border border-outline-variant bg-background-secondary text-sm text-on-surface focus:border-primary focus:bg-surface outline-none',
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <span className={cm.cn('text-[10px] text-on-surface-variant')}>{hint}</span>}
    </label>
  )
}

/** Labelled multiline textarea row. */
export function TextareaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  required,
  hint,
}: TextareaFieldProps) {
  const cm = getClassMap()
  return (
    <label htmlFor={id} className={cm.stack(1)}>
      <span
        className={cm.cn('text-[10px] font-bold uppercase tracking-wider text-on-surface-variant')}
      >
        {label}
        {required && <span className={cm.cn('text-error ml-1')}>*</span>}
      </span>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'rounded-lg border border-outline-variant bg-background-secondary text-sm text-on-surface focus:border-primary focus:bg-surface outline-none resize-y',
        )}
      />
      {hint && <span className={cm.cn('text-[10px] text-on-surface-variant')}>{hint}</span>}
    </label>
  )
}
