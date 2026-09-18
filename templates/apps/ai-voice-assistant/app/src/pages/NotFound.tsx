import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { VoiceOrb } from '../components/VoiceOrb.js'

function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('px', 6),
        'bg-background text-foreground antialiased relative overflow-hidden',
      )}
    >
      <AmbientOrbs />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          cm.textCenter,
          cm.sp('py', 12),
          'relative z-10',
        )}
      >
        <VoiceOrb state="idle" size="md" />
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.textMuted,
            'uppercase tracking-widest',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404 — silent on the wire' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'tracking-tight bg-gradient-to-r from-foreground to-secondary bg-clip-text text-transparent',
          )}
        >
          {t('notFound.title', {}, { defaultValue: "We couldn't hear that page." })}
        </h1>
        <p className={cm.cn(cm.textMuted, 'max-w-md leading-relaxed')}>
          {t(
            'notFound.body',
            { brand: APP_NAME },
            { defaultValue: "{{brand}} can't find the route you spoke. Try one of these instead." },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/conversation"
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity',
            )}
          >
            {t('notFound.goTalk', {}, { defaultValue: 'Open a session' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('semibold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
          >
            {t('notFound.home', {}, { defaultValue: 'Back home' })}
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFound
export { NotFound, NotFound as NotFoundPage }
