import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function PostListHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <header className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
      <div>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {t('postListHeader.myStories', {}, { defaultValue: 'My Stories' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'font-body text-on-surface-variant')}
        >
          {t(
            'postListHeader.archiveSubtitle',
            {},
            { defaultValue: 'Manage and curate your intellectual archive.' },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        <button
          onClick={() => navigate('/posts/new')}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            'py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-sm hover:opacity-90 transition-opacity active:scale-95 duration-200',
          )}
        >
          <span className={cm.fv5b245ffa}>add</span>
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'font-body tracking-wide')}
          >
            {t('postListHeader.newStory', {}, { defaultValue: 'New Story' })}
          </span>
        </button>
        <UserMenu />
      </div>
    </header>
  )
}

export default PostListHeader
export { PostListHeader }
