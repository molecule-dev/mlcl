import { useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function WorkspaceHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const workspaceName = user?.name?.split(' ')[0]
    ? `${user.name.split(' ')[0]}'s Workspace`
    : t('workspaceHeader.defaultName', undefined, { defaultValue: 'Your Workspace' })
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Header Section */}
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('mb', 8),
          cm.sp('px', 2),
          cm.cursorPointer,
          'group',
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
      >
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-primary-container rounded-lg shadow-lg shadow-primary-container/20',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-primary-container')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pulse_alert
          </span>
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-sky-500 dark:text-sky-400 italic leading-none',
            )}
          >
            {t('workspaceHeader.title', { name: workspaceName }, { defaultValue: '{{name}}' })}
          </h1>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[11px] text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {t(
              'workspaceHeader.subtitle',
              { type: APP_NAME },
              { defaultValue: '{{type}} Workspace' },
            )}
          </span>
        </div>
        <span
          className={cm.cn(
            'material-symbols-outlined ml-auto text-on-surface-variant group-hover:text-primary',
          )}
        >
          expand_more
        </span>
      </div>
    </>
  )
}
export { WorkspaceHeader }
