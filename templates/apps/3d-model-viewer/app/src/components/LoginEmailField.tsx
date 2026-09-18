import type { ChangeEvent } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function LoginEmailField({
  value,
  onChange,
}: {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const inputCls = cm.cn(
    'block',
    cm.w('full'),
    'rounded-[12px] border-0 bg-surface-container-low',
    cm.sp('py', 3),
    cm.sp('px', 4),
    'text-on-surface shadow-sm ring-1 ring-inset ring-outline-variant/20 placeholder:text-outline focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all duration-200',
  )
  return (
    <div className={cm.stack(1)}>
      <label
        className={cm.cn(
          'block font-label text-[11px] uppercase tracking-[0.05em]',
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
        htmlFor="email"
      >
        {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
      </label>
      <div className="relative">
        <input
          autoComplete="email"
          className={inputCls}
          id="email"
          name="email"
          onChange={onChange}
          required={true}
          type="email"
          value={value}
        />
      </div>
    </div>
  )
}

export default LoginEmailField
export { LoginEmailField }
