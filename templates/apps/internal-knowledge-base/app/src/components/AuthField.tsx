import { getClassMap } from '@molecule/app-ui'

interface AuthFieldProps {
  id: string
  type: 'email' | 'password' | 'text'
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
}

export function AuthField({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
}: AuthFieldProps) {
  const cm = getClassMap()
  return (
    <div>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'block uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 2),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        )}
      />
    </div>
  )
}
