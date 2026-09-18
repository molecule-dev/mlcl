import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LessonFooter() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <footer className={cm.cn(cm.sp('py', 12), 'border-t border-border mt-20')}>
      <div
        className={cm.cn(
          cm.maxW('[800px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.flex({ justify: 'between', align: 'center' }),
          cm.textSize('sm'),
          'text-foreground-tertiary',
        )}
      >
        <p>
          {t(
            'lessonFooter.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} LMS. Academic Archive.' },
          )}
        </p>
        <div className={cm.flex({ gap: 6 })}>
          <Link className={cm.cn('hover:text-primary transition-colors')} to="/help">
            {t('lessonFooter.support', {}, { defaultValue: 'Support' })}
          </Link>
          <Link className={cm.cn('hover:text-primary transition-colors')} to="/help">
            {t('lessonFooter.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default LessonFooter
export { LessonFooter }
