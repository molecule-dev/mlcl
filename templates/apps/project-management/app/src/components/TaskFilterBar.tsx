import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'

export type TaskFilterBarProps = {
  searchQuery: string
  setSearchQuery: (s: string) => void
  projectId?: string
  filterStatus?: string
  setFilterStatus?: (s: string) => void
  filterPriority?: string
  setFilterPriority?: (s: string) => void
  sortField?: string
  setSortField?: (s: string) => void
  sortOrder?: string
  setSortOrder?: (s: string) => void
}

export default function TaskFilterBar({
  searchQuery,
  setSearchQuery,
  projectId,
}: TaskFilterBarProps) {
  const cm = getClassMap()
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return (
    <header
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 6),
        cm.flex({ justify: 'between', gap: 'lg' }),
        'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl flex-col md:flex-row md:items-center border-b border-transparent',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.flex1, 'max-w-4xl')}>
        <div className={cm.cn(cm.flex1, 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-on-surface',
            )}
            placeholder={t(
              'taskFilterBar.searchPlaceholder',
              {},
              { defaultValue: 'Search tasks...' },
            )}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'hidden md:flex')}
          ref={filterRef}
        >
          <button
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'py-2.5 bg-surface-container-low rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all',
            )}
            data-mol-id="filter-priority"
            onClick={() => setOpenFilter(openFilter === 'priority' ? null : 'priority')}
            aria-expanded={openFilter === 'priority'}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="low_priority"
            >
              low_priority
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('form.priority', {}, { defaultValue: 'Priority' })}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'py-2.5 bg-surface-container-low rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all',
            )}
            data-mol-id="filter-project"
            onClick={() => setOpenFilter(openFilter === 'project' ? null : 'project')}
            aria-expanded={openFilter === 'project'}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="grid_view"
            >
              grid_view
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('taskFilterBar.project', {}, { defaultValue: 'Project' })}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 4),
              'py-2.5 bg-surface-container-low rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all',
            )}
            data-mol-id="filter-date"
            onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
            aria-expanded={openFilter === 'date'}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              data-icon="calendar_today"
            >
              calendar_today
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('taskFilterBar.dateRange', {}, { defaultValue: 'Date Range' })}
            </span>
          </button>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'bg-primary hover:bg-primary-container text-on-primary transition-all active:scale-95 shadow-md shadow-primary/20',
          )}
          data-mol-id="add-task-btn"
          onClick={() => navigate(projectId ? `/projects/${projectId}/board` : '/')}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="add_task">
            add_task
          </span>

          {t('taskFilterBar.addTask', {}, { defaultValue: 'Add Task' })}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
export { TaskFilterBar }
