import { useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

export default function ReadingProgressBar() {
  const cm = getClassMap()
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setProgress(
        scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0,
      )
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return (
    <div
      className={cm.cn(cm.w('full'), 'h-[3px]', 'fixed top-0 left-0 bg-surface-container z-[60]')}
    >
      <div
        className={cm.cn(cm.h('full'), 'bg-primary-container progress-bar-shadow')}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  )
}
export { ReadingProgressBar }
