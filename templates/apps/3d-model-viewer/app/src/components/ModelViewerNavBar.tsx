import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

function ModelViewerNavBar({ modelName }: { modelName?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.w('full'),
        cm.h('[48px]'),
        'fixed top-0 z-50 bg-surface-container-highest/60 backdrop-blur-xl border-b border-outline-variant/15 shadow-2xl shadow-black/40',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'tracking-tighter font-headline',
          )}
        >
          {t('modelViewerNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          <Link
            to="/models"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer',
            )}
          >
            {t('nav.models', {}, { defaultValue: 'Models' })}
          </Link>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface">
            {modelName ??
              t('modelViewerNavBar.unnamedModel', {}, { defaultValue: 'Untitled model' })}
          </span>
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <div className={cm.cn('hidden md:flex gap-1')}>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              'py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all duration-300',
            )}
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied
              ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
              : t('common.share', {}, { defaultValue: 'Share' })}
          </button>
        </div>
        <div
          className={cm.cn(
            cm.flex({ gap: 2 }),
            cm.sp('pl', 4),
            'border-l border-outline-variant/20',
          )}
        >
          <Link
            to="/settings"
            aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
            className={cm.cn(
              cm.roundedFull,
              'p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all duration-300',
            )}
          >
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default ModelViewerNavBar
export { ModelViewerNavBar }
