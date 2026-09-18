/**
 * Shared form atoms for the Bargain auth pages — icon-prefix labelled inputs
 * (catalog §13.6 icon-prefix variant), gradient submit button with an
 * arrow_forward affordance, and the alert/info/success bands.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. Keeps the
 * brand consistent across all 4 surfaces — change one atom, all four
 * auth pages update in lockstep.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AuthTextFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  /** Material Symbols Outlined glyph name. */
  icon: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  autoComplete?: string
  required?: boolean
  /** Optional right-side adornment (e.g. password visibility toggle). */
  rightSlot?: ReactNode
}

export function AuthTextField({
  id,
  label,
  value,
  onChange,
  icon,
  type = 'text',
  placeholder,
  autoComplete,
  required = true,
  rightSlot,
}: AuthTextFieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('ml', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'relative')}>
        <span
          className={cm.cn(
            'material-symbols-outlined absolute left-4 text-on-surface-variant/70 pointer-events-none',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cm.cn(
            cm.w('full'),
            cm.sp('pl', 12),
            rightSlot ? cm.sp('pr', 12) : cm.sp('pr', 4),
            cm.sp('py', 4),
            cm.textSize('base'),
            'rounded-xl border-2 border-outline-variant/40 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-colors',
          )}
        />
        {rightSlot && <div className={cm.cn('absolute right-4')}>{rightSlot}</div>}
      </div>
    </div>
  )
}

export interface AuthPasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder?: string
  autoComplete?: string
}

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder = '••••••••',
  autoComplete = 'current-password',
}: AuthPasswordFieldProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AuthTextField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      icon="lock"
      type={show ? 'text' : 'password'}
      placeholder={placeholder}
      autoComplete={autoComplete}
      rightSlot={
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={
            show
              ? t('authForm.hidePassword', {}, { defaultValue: 'Hide password' })
              : t('authForm.showPassword', {}, { defaultValue: 'Show password' })
          }
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {show ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      }
    />
  )
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: 'error' | 'info' | 'success'
  children: ReactNode
}) {
  const cm = getClassMap()
  const tones: Record<typeof tone, string> = {
    error: 'bg-error/10 text-error',
    info: 'bg-tertiary/10 text-tertiary',
    success: 'bg-secondary/15 text-secondary',
  }
  return (
    <div
      role="alert"
      data-mol-id={`auth-${tone}`}
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('sm'),
        cm.textCenter,
        cm.fontWeight('medium'),
        'rounded-xl',
        tones[tone],
      )}
    >
      {children}
    </div>
  )
}

export function AuthSubmitButton({
  loading,
  loadingLabel,
  label,
}: {
  loading: boolean
  loadingLabel: string
  label: string
}) {
  const cm = getClassMap()
  return (
    <button
      type="submit"
      disabled={loading}
      data-mol-id="auth-submit"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
        cm.sp('py', 4),
        cm.fontWeight('bold'),
        cm.textSize('base'),
        'w-full rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary uppercase tracking-wider hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-wait',
      )}
    >
      <span>{loading ? loadingLabel : label}</span>
      {!loading && (
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          arrow_forward
        </span>
      )}
    </button>
  )
}
