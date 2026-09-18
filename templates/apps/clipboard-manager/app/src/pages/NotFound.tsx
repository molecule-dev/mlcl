import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KbdBadge } from '../components/KbdBadge.js'

/**
 * 404 — keyboard-driven flavor: monospace clipboard-empty illustration
 * with `Esc` shortcut suggestion to head back to Clips.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('px', 6),
        'relative overflow-hidden',
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface-active) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -right-24 w-[36rem] h-[36rem] rounded-full pointer-events-none',
        )}
        style={{ background: 'var(--color-primary)', filter: 'blur(140px)', opacity: 0.16 }}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -left-24 w-[32rem] h-[32rem] rounded-full pointer-events-none',
        )}
        style={{ background: 'var(--color-primary-light)', filter: 'blur(140px)', opacity: 0.14 }}
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          cm.textCenter,
          'relative z-10 max-w-lg',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'HTTP 404' })}
        </p>

        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'tracking-tighter text-7xl md:text-8xl font-mono',
          )}
          style={{ color: 'var(--color-primary)' }}
        >
          {`{void}`}
        </h1>

        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'text-on-surface tracking-tight',
          )}
        >
          {t('notFound.heading', {}, { defaultValue: 'Nothing in the clipboard for that path.' })}
        </p>

        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The page you tried to copy doesn't exist (yet). Hit escape and head home.",
            },
          )}
        </p>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
          <Link
            to="/clips"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98]',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
            <span>{t('notFound.backCta', {}, { defaultValue: 'Back to Clips' })}</span>
            <KbdBadge>Esc</KbdBadge>
          </Link>

          <Link
            to="/"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'hover:underline')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('notFound.landingLink', {}, { defaultValue: 'Or visit the landing page' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
export { NotFound as NotFoundPage }
