/**
 * Decorated brand panel for split-pane auth pages — dark navy
 * background with concentric gold ring decorations, brand mark, and
 * a customer testimonial pulled from app voice.
 *
 * Translated from §13.3 (Decorated-Card with Brand Panel) +
 * §13.4 (corner orbs) of POLISHED-PATTERN-CATALOG.md, with a CRM
 * LoginBrandHeader-style brand-mark composition.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function AuthBrandPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 12),
        'hidden md:flex md:w-[55%] relative overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--mol-color-primary-dark)' }}
      aria-label={t('authBrandPanel.label', {}, { defaultValue: 'Brand showcase' })}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            'rounded-xl',
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface/10 backdrop-blur-md',
          )}
        >
          <span className="material-symbols-outlined text-white text-3xl">account_balance</span>
        </div>
        <span className={cm.cn('text-white text-2xl font-black tracking-tight')}>{APP_NAME}</span>
      </div>

      <div className={cm.cn(cm.maxW('2xl'), 'relative z-10')}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'uppercase tracking-[0.3em] text-white/60',
          )}
        >
          {t('authBrandPanel.eyebrow', {}, { defaultValue: 'Trusted by finance teams' })}
        </p>
        <blockquote
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 8),
            'lg:text-5xl text-white leading-tight tracking-tight',
          )}
        >
          {t(
            'authBrandPanel.quote',
            { appName: APP_NAME },
            {
              defaultValue:
                '“{{appName}} has transformed how we track revenue. Precision at its finest.”',
            },
          )}
        </blockquote>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <div
            className={cm.cn('h-1 w-12 rounded-full')}
            style={{ backgroundColor: 'var(--mol-color-accent, var(--color-accent))' }}
          />
          <div>
            <div
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
              style={{ color: 'var(--mol-color-accent, var(--color-accent))' }}
            >
              {t('authBrandPanel.attributionName', {}, { defaultValue: 'Sarah Jenkins' })}
            </div>
            <div className="text-white/60">
              {t(
                'authBrandPanel.attributionRole',
                {},
                { defaultValue: 'Chief Financial Officer, Horizon Tech' },
              )}
            </div>
          </div>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 8), 'text-white/50 italic')}>
          {APP_TAGLINE}
        </p>
      </div>

      <div
        className={cm.cn('absolute bottom-0 left-0 w-full h-64 pointer-events-none')}
        style={{
          background: 'linear-gradient(to top, var(--color-accent-gold-subtle), transparent)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-24 -left-24 w-96 h-96 rounded-full pointer-events-none border',
        )}
        style={{ borderColor: 'var(--color-accent-gold-border)' }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-12 -left-12 w-64 h-64 rounded-full pointer-events-none border',
        )}
        style={{ borderColor: 'var(--color-accent-gold-border-faint)' }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute right-12 top-32 blur-3xl pointer-events-none',
        )}
        style={{ backgroundColor: 'var(--color-accent-gold-bg)' }}
        aria-hidden="true"
      />
    </aside>
  )
}

export default AuthBrandPanel
