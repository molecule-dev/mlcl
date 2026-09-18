// Phase 1 baseline — verbatim JSX of design-project-management-task-list.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { Link, useNavigate } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
export default function TaskListSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { openPrivacy, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  const unavailableMessage = t(
    'common.unavailableFeature',
    {},
    { defaultValue: 'This feature will be available when backend support is ready.' },
  )
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 6),
        cm.stack(8),
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        cm.h('full'),
        cm.h('screen'),
        cm.w(72),
        "fixed left-0 top-0 bg-surface-container-low hidden lg:flex font-['Inter'] z-50",
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'px-4.5')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            'rounded-lg bg-primary text-on-primary',
          )}
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="edit_note"
          >
            edit_note
          </span>
        </div>
        <div>
          <h1
            className={cm.cn(
              cm.textSize('xl'),
              'font-bold text-on-background dark:text-background leading-none',
            )}
          >
            {t('sideNav.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant opacity-70')}>
            {t('sideNav.subtitle', {}, { defaultValue: 'Project Manager' })}
          </p>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('semibold'),
            cm.sp('px', 2),
            'text-on-background dark:text-background before:w-1.5 before:h-1.5 before:bg-primary before:rounded-full py-3 rounded-lg transition-all',
          )}
          data-mol-id="nav-my-tasks"
          to="/my-tasks"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="assignment"
          >
            assignment
          </span>

          {t('nav.myTasks', {}, { defaultValue: 'My Tasks' })}
        </Link>
        <button
          type="button"
          title={unavailableMessage}
          disabled
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 2),
            cm.w('full'),
            'text-on-surface-variant dark:text-outline-variant pl-4.5 py-3 rounded-lg opacity-60 cursor-not-allowed',
          )}
          data-mol-id="nav-inbox"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="inbox">
            inbox
          </span>

          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 2),
            cm.w('full'),
            'text-on-surface-variant dark:text-outline-variant pl-4.5 py-3 hover:bg-surface-container-highest/50 dark:hover:bg-primary/10 rounded-lg transition-all duration-200 hover:translate-x-1',
          )}
          data-mol-id="nav-projects"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="folder"
          >
            folder
          </span>

          {t('nav.projects', {}, { defaultValue: 'Projects' })}
        </button>
        <button
          type="button"
          title={unavailableMessage}
          disabled
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 2),
            cm.w('full'),
            'text-on-surface-variant dark:text-outline-variant pl-4.5 py-3 rounded-lg opacity-60 cursor-not-allowed',
          )}
          data-mol-id="nav-archive"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            data-icon="archive"
          >
            archive
          </span>

          {t('common.archive', {}, { defaultValue: 'Archive' })}
        </button>
      </nav>
      <button
        title={unavailableMessage}
        disabled
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          cm.w('full'),
          'bg-primary text-on-primary rounded-xl transition-all shadow-lg shadow-primary/10 opacity-70 cursor-not-allowed',
        )}
        data-mol-id="cta-new-project"
      >
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="add">
          add
        </span>

        {t('sideNav.newProject', {}, { defaultValue: 'New Project' })}
      </button>
      <footer className={cm.cn(cm.sp('pt', 6), cm.stack(1), 'border-t border-outline-variant/10')}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 2),
            'text-on-surface-variant dark:text-outline-variant pl-4.5 hover:text-primary transition-colors',
          )}
          data-mol-id="nav-help"
          to="/help"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="help">
            help
          </span>

          {t('common.help', {}, { defaultValue: 'Help' })}
        </Link>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 2),
            'text-on-surface-variant dark:text-outline-variant pl-4.5 hover:text-primary transition-colors',
          )}
          data-mol-id="nav-privacy"
          onClick={openPrivacy}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            data-icon="shield"
          >
            shield
          </span>

          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </button>
      </footer>
      {modals}
    </aside>
  )
}
export { TaskListSideNavBar }
