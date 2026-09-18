import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function KnowledgeBaseTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!accountMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (accountBtnRef.current && !accountBtnRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountMenuOpen])

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'sticky top-0 z-40 bg-surface/70 backdrop-blur-xl',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'tracking-widest text-outline uppercase',
          )}
        >
          {t('knowledgeBaseTopNavBar.projectLabel', {}, { defaultValue: 'Project' })}
        </span>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline-variant')}
          data-icon="chevron_right"
        >
          chevron_right
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('py', 1),
            'font-inter tracking-wide text-indigo-600 border-b-2 border-indigo-600',
          )}
        >
          {t('knowledgeBaseTopNavBar.botName', {}, { defaultValue: 'Current Bot Name' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <Link
          className={cm.cn(
            'px-4 py-1.5 text-sm font-semibold text-foreground-secondary hover:text-indigo-500 transition-all duration-200',
          )}
          to="/test-chat"
        >
          {t('knowledgeBaseTopNavBar.test', {}, { defaultValue: 'Test' })}
        </Link>
        <Link
          className={cm.cn(
            'px-5 py-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-bold rounded-lg shadow-md shadow-primary/20 hover:opacity-90 transition-all duration-200',
          )}
          to="/bots/:id/deploy"
        >
          {t('knowledgeBaseTopNavBar.deploy', {}, { defaultValue: 'Deploy' })}
        </Link>
        <div className={cm.cn(cm.h(6), cm.sp('mx', 2), 'w-[1px] bg-border')}></div>
        <button
          ref={accountBtnRef}
          className={cm.cn('text-foreground-secondary hover:text-foreground transition-colors')}
          onClick={() => setAccountMenuOpen((v) => !v)}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="account_circle">
            account_circle
          </span>
        </button>
      </div>
    </header>
  )
}

export default KnowledgeBaseTopNavBar
export { KnowledgeBaseTopNavBar }
