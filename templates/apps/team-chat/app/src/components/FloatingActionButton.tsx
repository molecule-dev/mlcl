import React from 'react'

import { getClassMap } from '@molecule/app-ui'

interface FloatingActionButtonProps {
  onClick?: () => void
}

function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const cm = getClassMap()
  return (
    <button
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(14),
        cm.h(14),
        cm.roundedFull,
        'fixed bottom-8 right-8 bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-2xl hover:scale-110 active:scale-95 transition-all z-50',
      )}
    >
      <span
        className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        add
      </span>
    </button>
  )
}

export default FloatingActionButton
export { FloatingActionButton }
