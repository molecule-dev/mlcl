import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function LoginFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer className={cm.cn('mt-20', cm.sp('py', 12), cm.sp('px', 8))}>
      {/* Decorative Surface Decoration (Tonal Layering) */}
      <div className={cm.cn(cm.textCenter)}>
        <p className={cm.cn('text-on-surface-variant', cm.textSize('xs'))}>
          {t(
            'loginFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '{{appName}} © {{year}}' },
          )}
        </p>
      </div>
    </footer>
  )
}

export default LoginFooter
