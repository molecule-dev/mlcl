import React, { memo, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface ReactionButtonProps {
  emoji: string
  count: number
  onClick?: () => void
}

function ReactionButtonImpl({ emoji, count, onClick }: ReactionButtonProps) {
  const cm = getClassMap()
  const [hasReacted, setHasReacted] = useState(false)
  const [displayCount, setDisplayCount] = useState(count)

  const handleClick = () => {
    const next = !hasReacted
    setHasReacted(next)
    setDisplayCount((c) => (next ? c + 1 : c - 1))
    onClick?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        'group/reaction rounded-lg border border-transparent bg-surface-container-low py-1.5 transition-colors hover:border-primary-container/20 hover:bg-primary-container/10',
      )}
    >
      <span>{emoji}</span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'text-on-surface-variant group-hover/reaction:text-primary',
        )}
      >
        {displayCount}
      </span>
    </button>
  )
}

const ReactionButton = memo(ReactionButtonImpl)
export default ReactionButton
