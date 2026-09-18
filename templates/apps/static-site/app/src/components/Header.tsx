import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'

import { AppHeader } from '@molecule/app-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, LOGO_SIZE } from '../branding.js'
import { ABOUT_PATH, FEED_RSS_PATH, TAGS_PATH } from '../content.js'
import { withBase } from '../site.js'

/**
 * Brand + site navigation + theme toggle. There is no user menu: nobody logs
 * in to a static site.
 *
 * The nav has TWO shapes and the stylesheet picks by width (see `index.css`
 * `.site-nav*`): a horizontal row on wide screens, and a hamburger menu below
 * 768px — a row of four links beside a brand and a theme toggle does not fit
 * 375px, and shrinking the tap targets instead is the wrong trade. The menu
 * button and every link in the panel are ≥44px.
 */
export function Header() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLink = (to: string, label: string, dataMolId: string): ReactNode => (
    <Link
      key={to}
      className={cm.link}
      to={to}
      data-mol-id={dataMolId}
      onClick={() => setMenuOpen(false)}
    >
      {label}
    </Link>
  )

  const links = [
    navLink('/', t('nav.posts', undefined, { defaultValue: 'Posts' }), 'nav-posts'),
    navLink(TAGS_PATH, t('nav.tags', undefined, { defaultValue: 'Tags' }), 'nav-tags'),
    navLink(ABOUT_PATH, t('nav.about', undefined, { defaultValue: 'About' }), 'nav-about'),
    // The feed is an external file, not a route — a plain anchor
    <a
      key="feed"
      className={cm.link}
      href={withBase(FEED_RSS_PATH)}
      data-mol-id="nav-feed"
      onClick={() => setMenuOpen(false)}
    >
      {t('nav.feed', undefined, { defaultValue: 'RSS' })}
    </a>,
  ]

  return (
    <>
      <AppHeader
        appName={APP_NAME}
        logoSrc={withBase('logo.svg')}
        logoSize={LOGO_SIZE}
        dataMolId="site-header"
        extraActions={
          <>
            <nav
              className="site-nav"
              aria-label={t('nav.label', undefined, { defaultValue: 'Site' })}
            >
              {links}
            </nav>
            <button
              type="button"
              className="site-nav-toggle"
              data-mol-id="nav-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-mobile-nav"
              aria-label={t('nav.menu', undefined, { defaultValue: 'Menu' })}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {/* Three horizontal bars — a hamburger that scales with the 44px button */}
              <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
                <rect y="0" width="20" height="2" rx="1" />
                <rect y="6" width="20" height="2" rx="1" />
                <rect y="12" width="20" height="2" rx="1" />
              </svg>
            </button>
          </>
        }
      />
      {menuOpen ? (
        <nav
          id="site-mobile-nav"
          className="site-mobile-nav"
          aria-label={t('nav.label', undefined, { defaultValue: 'Site' })}
        >
          {links}
        </nav>
      ) : null}
    </>
  )
}
