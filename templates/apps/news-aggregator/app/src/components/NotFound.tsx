import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Catch-all route — any unmatched URL renders this instead of a silent
 * blank content pane. Used both inside the authed layout (sidebar/top-bar
 * chrome stays) and at the root (public 404).
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('py', 24), cm.textCenter, cm.stack(4))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('notFound.eyebrow', {}, { defaultValue: '404' })}
      </p>
      <h1 className={cm.cn(cm.textSize('2xl'), 'font-headline font-bold')}>
        {t('notFound.heading', {}, { defaultValue: 'That page doesn’t exist.' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'notFound.body',
          {},
          { defaultValue: 'The link may be old or mistyped. Today’s briefing is one tap away.' },
        )}
      </p>
      <Link
        to="/home"
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.roundedFull,
          cm.fontWeight('semibold'),
          'inline-flex items-center min-h-[44px] bg-primary text-on-primary hover:bg-primary/90 transition-colors',
        )}
      >
        {t('notFound.backHome', {}, { defaultValue: 'Back to today’s briefing' })}
      </Link>
    </div>
  )
}

export default NotFound
