import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ContactRow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  return (
    <tr className={cm.fv11e7bd55}>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <img
            alt=""
            className={cm.cn(cm.w(9), cm.h(9), cm.roundedFull, 'ring-2 ring-white shadow-sm')}
            src="https://picsum.photos/seed/ContactRow-1/1200/800"
          />
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('contactRow.name', {}, { defaultValue: 'Sarah Jenkins' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('contactRow.role', {}, { defaultValue: 'Key Account' })}
            </p>
          </div>
        </div>
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {t('contactRow.company', {}, { defaultValue: 'Stellar Dynamics' })}
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        {t('contactRow.email', {}, { defaultValue: 's.jenkins@stellar.io' })}
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.textSize('sm'),
          'font-mono text-on-surface-variant',
        )}
      >
        {t('contactRow.phone', {}, { defaultValue: '+1 (555) 012-3456' })}
      </td>
      <td
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        {t('contactRow.lastSeen', { count: 2 }, { defaultValue: '{{count}} hours ago' })}
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4))}>
        <span
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            'inline-flex items-center px-2.5 py-1 text-[10px] uppercase bg-blue-100 text-blue-700',
          )}
        >
          {t('nav.customer', {}, { defaultValue: 'Customer' })}
        </span>
      </td>
      <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), cm.textRight)}>
        <div ref={menuRef} className={cm.fv7d17252d}>
          <button
            className={cm.fvf250a76d}
            data-mol-id="action-1"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="more_vert"
            >
              more_vert
            </span>
          </button>
          {menuOpen && (
            <div
              className={cm.cn(
                cm.sp('mt', 1),
                cm.w(36),
                'absolute right-0 z-10 rounded-md bg-surface shadow-lg ring-1 ring-black/5',
              )}
            >
              {/* TODO: wire when backend endpoint exists — needs contactId prop + http.patch('/contacts/:id') */}
              <button
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'block w-full text-left text-foreground hover:bg-surface-secondary',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {t('common.edit', {}, { defaultValue: 'Edit' })}
              </button>
              {/* TODO: wire when backend endpoint exists — needs contactId prop + http.delete('/contacts/:id') + onDelete callback to remove row */}
              <button
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'block w-full text-left text-error hover:bg-surface-secondary',
                )}
                onClick={() => setMenuOpen(false)}
              >
                {t('common.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
export { ContactRow }
