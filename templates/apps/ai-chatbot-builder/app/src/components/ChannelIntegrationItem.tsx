import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'
interface ChannelIntegrationItemProps {
  channelName: string
  iconName: string
  iconColor: string
  isConnected: boolean
  onToggle: () => void
}

export default function ChannelIntegrationItem({
  channelName,
  iconName,
  iconColor,
  isConnected,
  onToggle,
}: ChannelIntegrationItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="channel-integration-item"
      className={cm.cn(
        'group flex items-center justify-between p-4 rounded-2xl',
        isConnected
          ? cm.cn('bg-tertiary/5', cm.accentCard({ tone: 'custom' }))
          : 'bg-surface-container-high transition-all hover:bg-surface-container-highest',
      )}
      style={{ ['--mol-accent' as string]: 'var(--color-tertiary)' }}
    >
      <div className={cm.flex({ align: 'center' })} style={{ gap: 'calc(4 * 0.25rem)' }}>
        <div
          className={`w-10 h-10 rounded-xl bg-surface flex items-center justify-center shadow-sm${isConnected ? '' : ' opacity-60'}`}
        >
          <span style={{ fontFamily: 'Material Symbols outlined', color: iconColor }}>
            {iconName}
          </span>
        </div>
        <div>
          <p
            className={`text-sm font-bold ${isConnected ? 'text-on-surface' : 'text-on-surface/60'}`}
          >
            {channelName}
          </p>
          {isConnected ? (
            <div className={cm.flex({ align: 'center' })} style={{ gap: '1.5' }}>
              <div
                className={cm.roundedFull}
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'var(--md-sys-color-tertiary)',
                }}
              ></div>
              <span
                className={cm.fontWeight('bold')}
                style={{
                  fontSize: '10px',
                  color: 'var(--md-sys-color-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
                }}
              >
                {t('status.connected', {}, { defaultValue: 'Connected' })}
              </span>
            </div>
          ) : (
            <span
              className={cm.fontWeight('bold')}
              style={{
                fontSize: '10px',
                color:
                  'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 40%, transparent)',
                textTransform: 'uppercase',
                letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
              }}
            >
              {t('channel-integration-item.inactive', {}, { defaultValue: 'Inactive' })}
            </span>
          )}
        </div>
      </div>
      <Switch
        checked={isConnected}
        onChange={() => onToggle()}
        size="md"
        aria-label={t(
          'channel-integration-item.toggleAria',
          { channel: channelName },
          { defaultValue: '{{channel}} connection' },
        )}
      />
    </div>
  )
}

export { ChannelIntegrationItem }
