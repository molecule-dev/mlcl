import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { SafeLink } from './SafeLink.js'
function LandingFooter() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <>
      {/* Footer */}
      <footer
        className={cm.cn(
          cm.sp('py', 12),
          cm.sp('px', 8),
          cm.w('full'),
          'bg-surface-container-low mt-20',
        )}
      >
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'xl' }),
            cm.mxAuto,
            'max-w-7xl',
            'md:grid-cols-2 lg:flex lg:justify-between items-start',
          )}
        >
          <div className={cm.maxW('xs')}>
            <span className={cm.cn(cm.textSize('2xl'), 'font-serif italic text-foreground')}>
              {t('landingFooter.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
            <p
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('sm'),
                'font-label text-foreground-secondary leading-relaxed',
              )}
            >
              {t(
                'landingFooter.description',
                {},
                {
                  defaultValue:
                    'A newsletter platform for writers who own their audience — issues, subscribers, and open-rate analytics in one calm place.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xl' }), 'lg:gap-24')}>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <h5
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground',
                )}
              >
                {t('settings.platform', {}, { defaultValue: 'Platform' })}
              </h5>
              <nav className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <SafeLink
                  className={cm.cn(
                    cm.textSize('sm'),
                    'py-1 font-label text-foreground-secondary hover:underline decoration-[var(--color-status-published)] underline-offset-4 transition-all',
                  )}
                  to="/about"
                >
                  {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
                </SafeLink>
                <SafeLink
                  className={cm.cn(
                    cm.textSize('sm'),
                    'py-1 font-label text-foreground-secondary hover:underline decoration-[var(--color-status-published)] underline-offset-4 transition-all',
                  )}
                  to="/signup?intent=write"
                >
                  {t('common.write', {}, { defaultValue: 'Start writing' })}
                </SafeLink>
                <SafeLink
                  className={cm.cn(
                    cm.textSize('sm'),
                    'py-1 font-label text-foreground-secondary hover:underline decoration-[var(--color-status-published)] underline-offset-4 transition-all',
                  )}
                  to="/pricing"
                >
                  {t('landingFooter.membership', {}, { defaultValue: 'Membership' })}
                </SafeLink>
              </nav>
            </div>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <h5
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground',
                )}
              >
                {t('landingFooter.legal', {}, { defaultValue: 'Legal' })}
              </h5>
              <nav className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <LegalModalLinks
                  linkClassName={cm.cn(
                    cm.textSize('sm'),
                    'py-1 font-label text-foreground-secondary hover:underline decoration-[var(--color-status-published)] underline-offset-4 transition-all',
                  )}
                  appName={APP_NAME}
                  loadContent={loadContent}
                  privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
                />
                <SafeLink
                  className={cm.cn(
                    cm.textSize('sm'),
                    'py-1 font-label text-foreground-secondary hover:underline decoration-[var(--color-status-published)] underline-offset-4 transition-all',
                  )}
                  to="/help"
                >
                  {t('common.help', {}, { defaultValue: 'Help' })}
                </SafeLink>
              </nav>
            </div>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <h5
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-foreground',
                )}
              >
                {t('common.follow', {}, { defaultValue: 'Follow' })}
              </h5>
              <div className={cm.flex({ gap: 'md' })}>
                <SafeLink
                  aria-label={t('landingFooter.website', {}, { defaultValue: 'Website' })}
                  className={cm.cn(
                    'p-2 text-foreground-secondary hover:text-primary transition-colors',
                  )}
                  to="/about"
                >
                  <span className={cm.fv5b245ffa}>public</span>
                </SafeLink>
                <SafeLink
                  aria-label={t('nav.contact', {}, { defaultValue: 'Contact' })}
                  className={cm.cn(
                    'p-2 text-foreground-secondary hover:text-primary transition-colors',
                  )}
                  to="/help"
                >
                  <span className={cm.fv5b245ffa}>alternate_email</span>
                </SafeLink>
                <SafeLink
                  aria-label={t('landingFooter.rssFeed', {}, { defaultValue: 'RSS feed' })}
                  className={cm.cn(
                    'p-2 text-foreground-secondary hover:text-primary transition-colors',
                  )}
                  to="/help#rss"
                >
                  <span className={cm.fv5b245ffa}>rss_feed</span>
                </SafeLink>
              </div>
            </div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'md' }),
            cm.mxAuto,
            cm.sp('mt', 16),
            cm.sp('pt', 8),
            'max-w-7xl',
            'border-t border-outline-variant/20 md:flex-row',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-label tracking-wide text-foreground-secondary',
            )}
          >
            {t(
              'landingFooter.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              {
                defaultValue: '© {{year}} {{appName}}. The Weekly Dispatch. All rights reserved.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ gap: 'lg' }),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-tighter text-foreground-secondary',
            )}
          >
            <span>
              {t('landingFooter.designSlogan', {}, { defaultValue: 'Designed with Intent' })}
            </span>
            <span>{t('common.separator', {}, { defaultValue: '•' })}</span>
            <span>
              {t('landingFooter.editorialSlogan', {}, { defaultValue: 'Delivered with Care' })}
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default LandingFooter
export { LandingFooter }
