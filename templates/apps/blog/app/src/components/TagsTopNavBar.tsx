import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'
import { UserMenu } from './UserMenu.js'
interface TagsTopNavBarProps {
  onNewTag?: () => void
}
function TagsTopNavBar({ onNewTag }: TagsTopNavBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.h(16),
        // Mobile renders MobileTopBar instead; full-width below md.
        'w-full md:w-[calc(100%-240px)]',
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        'fixed top-0 md:ml-[240px] z-50 bg-background/80 backdrop-blur-md border-b border-border hidden md:flex',
      )}
    >
      <h2 className={cm.cn(cm.textSize('2xl'), 'font-serif italic tracking-tight text-foreground')}>
        {t('form.tags', {}, { defaultValue: 'Tags' })}
      </h2>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mr', 4))}>
          <SafeLink
            to="/notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'text-foreground-secondary hover:bg-surface-secondary transition-colors',
            )}
          >
            <span className={cm.fv5b245ffa}>notifications</span>
          </SafeLink>
        </div>
        <button
          onClick={onNewTag}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'bg-primary hover:bg-primary-container text-on-primary uppercase tracking-widest transition-all active:scale-95',
          )}
        >
          <span className={cm.fv5b245ffa}>add</span>

          {t('tagsTopNavBar.newTag', {}, { defaultValue: 'New Tag' })}
        </button>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('ml', 2))}>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default TagsTopNavBar
export { TagsTopNavBar }
