import { useNavigate } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

function DealsFab() {
  const cm = getClassMap()
  const navigate = useNavigate()
  return (
    <button
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.h(14),
        cm.w(14),
        'fixed bottom-8 right-8 bg-primary text-white shadow-xl hover:scale-110 active:scale-95 transition-all z-50',
      )}
      data-mol-id="fab-add"
      onClick={() => navigate('/deals/new')}
    >
      <span className={cm.fv5b245ffa} style={{ fontSize: '30px' }}>
        add
      </span>
    </button>
  )
}

export default DealsFab
export { DealsFab }
