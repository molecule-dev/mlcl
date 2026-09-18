import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ListingEditorHeader() {
  const { t } = useTranslation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const cm = getClassMap()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setMessagesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className={cm.cn(
        cm.h(16),
        cm.sp('px', 12),
        cm.flex({ align: 'center', justify: 'between' }),
        'sticky top-0 bg-surface/80 backdrop-blur-md z-10',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <span
          className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t('listingEditorHeader.listings', {}, { defaultValue: 'Listings' })}
        </span>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-on-surface-variant')}
        >
          chevron_right
        </span>
        <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}>
          {t('listingEditorHeader.newListing', {}, { defaultValue: 'New Listing' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'text-on-surface-variant')}>
          <div ref={notificationsRef} className={cm.cn('relative')}>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined hover:text-primary transition-colors',
              )}
              data-icon="notifications"
              onClick={() => setNotificationsOpen((v) => !v)}
              aria-label={t(
                'listingEditorHeader.notificationsLabel',
                {},
                { defaultValue: 'Notifications' },
              )}
              aria-expanded={notificationsOpen}
            >
              notifications
            </button>
            {notificationsOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('p', 4),
                  'absolute right-0 top-full w-64 bg-surface border border-outline-variant rounded-lg shadow-lg z-50',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'listingEditorHeader.noNotifications',
                    {},
                    { defaultValue: 'No new notifications' },
                  )}
                </p>
              </div>
            )}
          </div>
          <div ref={messagesRef} className={cm.cn('relative')}>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined hover:text-primary transition-colors',
              )}
              data-icon="mail"
              onClick={() => setMessagesOpen((v) => !v)}
              aria-label={t('listingEditorHeader.messagesLabel', {}, { defaultValue: 'Messages' })}
              aria-expanded={messagesOpen}
            >
              mail
            </button>
            {messagesOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('p', 4),
                  'absolute right-0 top-full w-64 bg-surface border border-outline-variant rounded-lg shadow-lg z-50',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('listingEditorHeader.noMessages', {}, { defaultValue: 'No new messages' })}
                </p>
              </div>
            )}
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('pl', 6),
            'border-l border-outline-variant/20',
          )}
        >
          <div className={cm.cn(cm.textRight)}>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('listingEditorHeader.userName', {}, { defaultValue: 'Alex Sterling' })}
            </p>
            <p className={cm.cn('text-[10px] text-on-surface-variant uppercase tracking-tighter')}>
              {t('listingEditorHeader.partnerTier', {}, { defaultValue: 'Elite Partner' })}
            </p>
          </div>
          <img
            alt={t('listingEditorHeader.profileAlt', {}, { defaultValue: 'Agent Profile' })}
            className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
            data-alt="Close-up portrait of a professional male real estate agent in a tailored charcoal suit, clean minimalist studio background"
            src="https://picsum.photos/seed/ListingEditorHeader-1/1200/800"
          />
        </div>
      </div>
    </header>
  )
}
export { ListingEditorHeader }
