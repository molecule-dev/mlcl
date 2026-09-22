// Pattern source: ai-chatbot-builder authed shell pattern (per-screen sidebar+topbar).
// Neuron's app shell wraps every authenticated route — dark surface, fixed sidebar, fixed top bar.
// Below `md` (768px) the fixed rail would crush a phone's content column, so a
// template-local MobileNavShell (sticky top bar + slide-in drawer) takes over —
// conditionally rendered via matchMedia, never CSS-hidden.
import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { useIsMobile } from '../lib/use-is-mobile.js'
import { MobileNavShell } from './MobileNavShell.js'
import { SideNavBar } from './SideNavBar.js'
import { TopAppBar } from './TopAppBar.js'

interface NeuronLayoutProps {
  title: string
  ctaLabel?: string
  ctaTo?: string
}

export function NeuronLayout({ title, ctaLabel, ctaTo }: NeuronLayoutProps) {
  const cm = getClassMap()
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileNavShell ctaLabel={ctaLabel} ctaTo={ctaTo} title={title} />
  }

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.h('screen'),
        'bg-surface-container-lowest text-on-surface font-body overflow-hidden',
      )}
    >
      <SideNavBar />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.h('screen'),
          'ml-[260px] relative',
        )}
      >
        <TopAppBar ctaLabel={ctaLabel} ctaTo={ctaTo} title={title} />
        <main
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 6),
            'mt-[48px] overflow-y-auto bg-surface-container',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default NeuronLayout
