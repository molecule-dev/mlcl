import React from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function AddListingSlate() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 12),
        cm.cursorPointer,
        'w-full bg-success-light/50 rounded-xl border-2 border-dashed border-emerald-900/10 group hover:bg-success-light/50 transition-all',
      )}
      onClick={() => navigate('/admin/listings/new')}
    >
      <div
        className={cm.cn(
          cm.w(16),
          cm.h(16),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 4),
          'bg-surface ambient-shadow group-hover:scale-110 transition-transform',
        )}
      >
        <span className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-success')}>
          add
        </span>
      </div>
      <span
        className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-success font-headline')}
      >
        {t('addListingSlate.title', {}, { defaultValue: 'Add New Listing' })}
      </span>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.textCenter,
          cm.sp('mt', 2),
          'max-w-[200px]',
          'text-success/60',
        )}
      >
        {t(
          'addListingSlate.description',
          {},
          { defaultValue: 'Create a new digital gallery entry for your property.' },
        )}
      </p>
    </button>
  )
}

export default AddListingSlate
