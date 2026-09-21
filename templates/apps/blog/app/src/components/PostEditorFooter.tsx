import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostEditorFooterProps {
  body: string
}
function PostEditorFooter({ body }: PostEditorFooterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
  return (
    <footer
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('py', 6),
        cm.w('full'),
        'fixed bottom-0 left-0 z-40 bg-transparent pointer-events-none',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'pointer-events-auto font-sans text-[10px] text-foreground-secondary uppercase tracking-widest',
        )}
      >
        <span
          className={cm.cn(cm.roundedFull, cm.w(1.5), cm.h(1.5), 'bg-primary animate-pulse')}
        ></span>

        {t(
          'common.countWords',
          { count: wordCount.toLocaleString() },
          { defaultValue: '{{count}} words' },
        )}
      </div>
      <nav
        className={cm.cn(
          cm.flex({ gap: 'xl' }),
          'hidden md:flex pointer-events-auto font-sans text-[10px] text-foreground-secondary uppercase tracking-widest',
        )}
      >
        <a
          className={cm.fvc4fc3d91}
          href="#editor-shortcuts"
          onClick={(e) => e.preventDefault()}
          title={t(
            'postEditorFooter.shortcutsHint',
            {},
            { defaultValue: 'Shortcut overlay will be available soon' },
          )}
        >
          {t('postEditorFooter.keyboardShortcuts', {}, { defaultValue: 'Keyboard Shortcuts' })}
        </a>
        <Link className={cm.fvc4fc3d91} to="/help">
          {t('postEditorFooter.help', {}, { defaultValue: 'Help' })}
        </Link>
        <Link className={cm.fvc4fc3d91} to="/help">
          {t('postEditorFooter.markdownGuide', {}, { defaultValue: 'Markdown Guide' })}
        </Link>
      </nav>
    </footer>
  )
}

export default PostEditorFooter
export { PostEditorFooter }
