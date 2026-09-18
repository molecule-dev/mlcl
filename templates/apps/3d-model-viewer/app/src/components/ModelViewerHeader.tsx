import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function ModelViewerHeader() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [exportLoading, setExportLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), source: window.location.href },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'model-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.w('full'),
        'fixed top-0 z-50 bg-surface-container-highest/60 backdrop-blur-xl border-b border-outline-variant/15 shadow-2xl shadow-black/40 h-[48px]',
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
          {APP_NAME}
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
              cm.cursorPointer,
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.models', {}, { defaultValue: 'Models' })}
          </Link>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-on-surface">Dragon-Head.glb</span>
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
            onClick={handleShare}
          >
            {copied
              ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
              : t('common.share', {}, { defaultValue: 'Share' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              'py-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary active:scale-95 duration-150 shadow-lg shadow-primary-container/20',
            )}
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading
              ? t('common.exportingEllipsis', {}, { defaultValue: 'Exporting…' })
              : t('common.export', {}, { defaultValue: 'Export' })}
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
          <button
            aria-label={t('common.help', {}, { defaultValue: 'Help' })}
            className={cm.cn(
              cm.roundedFull,
              'p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all duration-300',
            )}
            onClick={() => navigate('/about')}
          >
            <span className="material-symbols-outlined">help</span>
          </button>
          <Link
            to="/settings"
            className={cm.cn(cm.roundedFull, cm.shrink0, cm.sp('ml', 2), 'block')}
          >
            <img
              alt={t('modelViewerHeader.userAvatarAlt', {}, { defaultValue: 'User avatar' })}
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                'border border-outline-variant/30',
              )}
              data-alt="Close up portrait of a young man with glasses on a light blue background"
              src="https://picsum.photos/seed/ModelViewerHeader-1/1200/800"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default ModelViewerHeader
export { ModelViewerHeader }
