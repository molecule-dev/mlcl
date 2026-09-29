import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Public-chrome header for the legal pages (Privacy / Terms).
 *
 * The framework `AppHeader` (@molecule/app-header-react) owns the shell
 * chrome here — sticky bar, theme toggle, language picker, user menu — but
 * its brand is hard-wired to a `logoSrc` image + a `cm.logoText` span: it
 * has NO slot for a custom logo node, so the Switchboard lockup (concierge
 * tile + serif wordmark) cannot be passed through it. Per the brand rule
 * this header therefore renders the shared `BrandWordmark` in the brand
 * slot, composed with the SAME ClassMap header tokens `AppHeader` uses
 * (`cm.headerBar` + `cm.headerFixed` + `cm.headerInner`) and the same
 * right-side action slots in the same order — the shell stays identical
 * and only the default sans logo look goes away. The brand text itself is
 * never rendered through `cm.logoText` anywhere.
 */
export function Header() {
  const cm = getClassMap()
  return (
    <header className={cm.cn(cm.headerBar, cm.headerFixed)}>
      <div className={cm.headerInner}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.h('full'))}>
          <BrandWordmark as="link" size="sm" />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <ThemeToggle />
            <LanguagePicker display="icon" />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
