import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CategoriesPageHeader({ onAdd }: { onAdd: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 16))}>
      <div>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 2),
            'font-extrabold font-headline text-on-surface tracking-tight',
          )}
        >
          {t('categoriesPageHeader.title', {}, { defaultValue: 'Categories' })}
        </h2>
        <p className={cm.cn('text-on-surface-variant font-body')}>
          {t(
            'categoriesPageHeader.subtitle',
            {},
            { defaultValue: 'Manage and refine your personal financial taxonomy.' },
          )}
        </p>
      </div>
      <button
        onClick={onAdd}
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.fontWeight('bold'),
          'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="add">
          add
        </span>
        {t('categoriesPageHeader.addButton', {}, { defaultValue: 'Add Category' })}
      </button>
    </div>
  )
}

export default CategoriesPageHeader
export { CategoriesPageHeader }
