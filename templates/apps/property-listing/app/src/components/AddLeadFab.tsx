import React from 'react'
import { useNavigate } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

function AddLeadFab() {
  const cm = getClassMap()
  const navigate = useNavigate()
  return (
    <>
      {/* Contextual FAB (Only on relevant pages) */}
      <button
        onClick={() => navigate('/leads/new')}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          cm.h(14),
          cm.w(14),
          'fixed bottom-10 right-10 bg-primary-container text-on-primary-container shadow-xl hover:scale-110 active:scale-95 transition-all z-50',
        )}
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="person_add">
          person_add
        </span>
      </button>
    </>
  )
}

export default AddLeadFab
export { AddLeadFab }
