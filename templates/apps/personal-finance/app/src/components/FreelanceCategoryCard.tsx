import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FreelanceCategoryCardProps {
  id: string
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

function FreelanceCategoryCard({ id, onEdit, onDelete }: FreelanceCategoryCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl group hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div className={cm.cn(cm.sp('p', 3), 'rounded-xl bg-teal-50 text-teal-600')}>
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="work"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            work
          </span>
        </div>
        <div
          className={cm.cn(cm.flex(), 'gap-1 opacity-0 group-hover:opacity-100 transition-opacity')}
        >
          <button
            onClick={() => (onEdit ? onEdit(id) : navigate(`/freelance-categories/${id}/edit`))}
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-primary transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="edit"
            >
              edit
            </span>
          </button>
          <button
            onClick={() => (onDelete ? onDelete(id) : http.delete(`/api/categories/${id}`))}
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container rounded-lg text-foreground-tertiary hover:text-tertiary transition-colors',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              data-icon="delete"
            >
              delete
            </span>
          </button>
        </div>
      </div>
      <h4
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          cm.sp('mb', 1),
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {t('freelanceCategoryCard.name', {}, { defaultValue: 'Freelance' })}
      </h4>
      <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-foreground-tertiary')}
        >
          {t(
            'freelanceCategoryCard.transactionCount',
            { count: 4 },
            { defaultValue: '{{count}} Transactions' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            cm.textPrimary,
            'font-headline font-extrabold tracking-tight',
          )}
        >
          {t(
            'freelanceCategoryCard.totalAmount',
            { amount: '2,100.00' },
            { defaultValue: '+${{amount}}' },
          )}
        </span>
      </div>
    </div>
  )
}

export default FreelanceCategoryCard
export { FreelanceCategoryCard }
