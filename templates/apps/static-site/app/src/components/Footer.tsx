import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  ABOUT_PATH,
  FEED_ATOM_PATH,
  FEED_RSS_PATH,
  LLMS_PATH,
  POSTS_JSON_PATH,
  SITEMAP_PATH,
} from '../content.js'
import { withBase } from '../site.js'

/** Site footer: copyright, the About link, and every machine-readable copy of the site. */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const files: Array<{ id: string; path: string; label: string }> = [
    { id: 'rss', path: FEED_RSS_PATH, label: t('footer.rss', undefined, { defaultValue: 'RSS' }) },
    {
      id: 'atom',
      path: FEED_ATOM_PATH,
      label: t('footer.atom', undefined, { defaultValue: 'Atom' }),
    },
    {
      id: 'json',
      path: POSTS_JSON_PATH,
      label: t('footer.json', undefined, { defaultValue: 'JSON' }),
    },
    {
      id: 'llms',
      path: LLMS_PATH,
      label: t('footer.llms', undefined, { defaultValue: 'llms.txt' }),
    },
    {
      id: 'sitemap',
      path: SITEMAP_PATH,
      label: t('footer.sitemap', undefined, { defaultValue: 'Sitemap' }),
    },
  ]
  return (
    <footer className={cm.footerBar} data-mol-id="site-footer">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 4, wrap: 'wrap' }),
          cm.textSize('sm'),
        )}
      >
        <span className={cm.textMuted}>
          {t(
            'footer.copyright',
            { year, appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}' },
          )}
        </span>
        <nav
          className={cm.flex({ align: 'center', gap: 3, wrap: 'wrap' })}
          aria-label={t('footer.label', undefined, { defaultValue: 'Site files' })}
        >
          <Link className={cm.link} to={ABOUT_PATH} data-mol-id="footer-about">
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </Link>
          {files.map((file) => (
            <a
              key={file.id}
              className={cm.link}
              href={withBase(file.path)}
              data-mol-id={`footer-${file.id}`}
            >
              {file.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
