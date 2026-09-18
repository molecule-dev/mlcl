import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { SafeLink } from './SafeLink.js'
function PostDetailFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <footer
      className={cm.cn(
        cm.w('full'),
        cm.sp('py', 12),
        cm.sp('px', 8),
        'mt-20 bg-surface-container-low',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', gap: 'lg', direction: 'col' }),
          cm.mxAuto,
          'md:flex-row max-w-7xl',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            'md:items-start',
          )}
        >
          <span className={cm.cn(cm.textSize('xl'), 'font-serif italic text-foreground')}>
            {t(
              'postDetailFooter.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </span>
          <p className={cm.cn(cm.textSize('xs'), 'font-body text-foreground-secondary')}>
            {t(
              'postDetailFooter.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}. The Modern Archivist.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center' }), 'gap-x-8 gap-y-4')}>
          <SafeLink className={cm.fvf4d17258} to="/help">
            {t('postDetailFooter.help', {}, { defaultValue: 'Help' })}
          </SafeLink>
          <SafeLink className={cm.fvf4d17258} to="/about">
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </SafeLink>
          <LegalModalLinks
            linkClassName={cm.fvf4d17258}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </div>
      </div>
    </footer>
  )
}

export default PostDetailFooter
export { PostDetailFooter }
