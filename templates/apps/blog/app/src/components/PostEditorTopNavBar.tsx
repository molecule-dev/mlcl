import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

interface PostEditorTopNavBarProps {
  onPublish: () => void
  onSaveDraft: () => void
  loading: boolean
}
function PostEditorTopNavBar({ onPublish, onSaveDraft, loading }: PostEditorTopNavBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [hint, setHint] = useState<string | null>(null)

  function showHint(message: string) {
    setHint(message)
    window.setTimeout(() => setHint(null), 2500)
  }
  return (
    <>
      {/* TopNavBar Shell */}
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 8),
          cm.h(16),
          cm.w('full'),
          'fixed top-0 left-0 z-50 bg-background/80 backdrop-blur-md shadow-sm dark:shadow-none',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('2xl'),
              'font-serif italic text-on-background hover:opacity-80 transition-opacity duration-200',
            )}
          >
            {t(
              'postEditorTopNavBar.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </Link>
          <nav
            className={cm.cn(
              cm.flex({ gap: 'lg' }),
              cm.textSize('xs'),
              'hidden md:flex font-sans uppercase tracking-widest',
            )}
          >
            <Link
              className={cm.cn(
                'text-foreground-secondary hover:text-on-background transition-colors duration-200 hover:opacity-80 transition-opacity duration-200',
              )}
              to="/posts"
            >
              {t('postEditorTopNavBar.posts', {}, { defaultValue: 'Posts' })}
            </Link>
          </nav>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.textSize('xs'),
            'font-label uppercase tracking-widest',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              className={cm.cn(
                'text-on-surface-variant hover:opacity-80 transition-opacity duration-200 scale-95 active:duration-100',
              )}
              aria-label={t('postEditorTopNavBar.syncStatus', {}, { defaultValue: 'Sync status' })}
              onClick={() =>
                showHint(
                  t(
                    'postEditorTopNavBar.syncHint',
                    {},
                    { defaultValue: 'All changes are local until publish.' },
                  ),
                )
              }
            >
              <span className={cm.fv5b245ffa} data-icon="cloud_done">
                cloud_done
              </span>
            </button>
            <button
              className={cm.cn(
                'text-on-surface-variant transition-opacity duration-200 scale-95 active:duration-100 disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label={t('postEditorTopNavBar.aiAssist', {}, { defaultValue: 'AI assist' })}
              onClick={() =>
                showHint(
                  t(
                    'postEditorTopNavBar.aiHint',
                    {},
                    { defaultValue: 'AI assist is coming soon for this editor.' },
                  ),
                )
              }
              disabled
            >
              <span className={cm.fv5b245ffa} data-icon="auto_awesome">
                auto_awesome
              </span>
            </button>
          </div>
          <button
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('semibold'),
              'text-on-surface hover:opacity-80 transition-opacity duration-200 scale-95 active:duration-100',
            )}
            id="button-save-draft"
            onClick={onSaveDraft}
            disabled={loading}
          >
            {t('common.saveDraft', {}, { defaultValue: 'Save draft' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary hover:opacity-90 transition-opacity duration-200 scale-95 active:duration-100',
            )}
            id="button-publish"
            onClick={onPublish}
            disabled={loading}
          >
            {t('common.publish', {}, { defaultValue: 'Publish' })}
          </button>
          <UserMenu />
        </div>
      </header>
      {hint && (
        <div
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.roundedFull,
            'fixed top-20 right-8 z-50 bg-surface-container-high text-on-surface-variant shadow-lg',
          )}
        >
          {hint}
        </div>
      )}
    </>
  )
}

export default PostEditorTopNavBar
export { PostEditorTopNavBar }
