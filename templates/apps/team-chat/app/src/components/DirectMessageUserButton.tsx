import { getClassMap } from '@molecule/app-ui'

interface DirectMessageUserButtonProps {
  name: string
  avatar: string
  avatarAlt: string
  isOnline: boolean
  onClick?: () => void | Promise<void>
}

export default function DirectMessageUserButton({
  name,
  avatar,
  avatarAlt,
  isOnline,
  onClick,
}: DirectMessageUserButtonProps) {
  const cm = getClassMap()
  return (
    <button
      onClick={() => {
        if (onClick) {
          void onClick()
        }
      }}
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        'py-1.5 text-foreground-secondary hover:bg-border rounded-lg',
      )}
    >
      <div className={cm.cn('relative')}>
        <img
          className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
          alt=""
          data-alt={avatarAlt}
          src={avatar}
        />
        <span
          className={cm.cn(
            'absolute bottom-0 right-0 border border-border',
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            isOnline ? 'bg-green-500' : 'bg-border-secondary',
          )}
        ></span>
      </div>
      <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>{name}</span>
    </button>
  )
}
export { DirectMessageUserButton }
