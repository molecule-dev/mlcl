// Pattern source: bespoke — Neuron 404 with terminal pattern.
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-surface-container-lowest text-on-surface font-body relative overflow-hidden bg-terminal-pattern',
      )}
    >
      <div
        className={cm.cn(
          cm.roundedFull,
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] pointer-events-none',
        )}
      />
      <div className={cm.cn(cm.textCenter, cm.sp('px', 6), 'relative z-10 max-w-[480px]')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 4),
            'font-mono uppercase tracking-widest text-secondary',
          )}
        >
          {t('notFound.code', {}, { defaultValue: '// route not found · 404' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('4xl'),
            cm.sp('mb', 4),
            'font-headline tracking-tighter text-on-surface',
          )}
        >
          {t('notFound.headline', {}, { defaultValue: 'Signal lost.' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 6),
            'font-body text-on-surface-variant leading-relaxed',
          )}
        >
          {t(
            'notFound.subhead',
            {},
            { defaultValue: 'The page you tried to reach is not registered. Head back to base.' },
          )}
        </p>
        <Link
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'kinetic-gradient text-on-primary-fixed font-headline tracking-tight rounded-lg transition-all',
          )}
          to="/dashboard"
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          {t('notFound.cta', {}, { defaultValue: 'Return to Dashboard' })}
        </Link>
      </div>
    </div>
  )
}

export default NotFound
