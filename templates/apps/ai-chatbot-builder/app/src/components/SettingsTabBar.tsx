import { getClassMap } from '@molecule/app-ui'
interface SettingsTabBarProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function SettingsTabBar({ tabs, activeTab, onTabChange }: SettingsTabBarProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex()} style={{ gap: 'calc(2 * 0.25rem)' }} data-mol-id="settings-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={
            tab === activeTab
              ? 'px-6 py-2.5 bg-primary text-white font-semibold rounded-full text-sm shadow-lg shadow-primary/20'
              : 'px-6 py-2.5 text-on-surface-variant hover:bg-surface-container-high transition-all font-semibold rounded-full text-sm'
          }
          onClick={() => onTabChange(tab)}
          data-mol-id={`settings-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export { SettingsTabBar }
