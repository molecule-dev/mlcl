import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Highlight {
  id: string
  glyph: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const HIGHLIGHTS: Highlight[] = [
  {
    id: 'upload',
    glyph: 'cloud_upload',
    titleKey: 'about.highlights.upload.title',
    titleDefault: 'Effortless uploads',
    bodyKey: 'about.highlights.upload.body',
    bodyDefault:
      'Drag in anything — documents, RAW photos, video — and {{appName}} stores it durably and keeps it instantly searchable.',
  },
  {
    id: 'folders',
    glyph: 'folder_open',
    titleKey: 'about.highlights.folders.title',
    titleDefault: 'Folders & organisation',
    bodyKey: 'about.highlights.folders.body',
    bodyDefault:
      'Colour-coded folders, tags, and full-text search keep even the busiest archive calm and easy to navigate.',
  },
  {
    id: 'sharing',
    glyph: 'share',
    titleKey: 'about.highlights.sharing.title',
    titleDefault: 'Sharing you control',
    bodyKey: 'about.highlights.sharing.body',
    bodyDefault:
      'Generate expiring, permissioned share links in a click — and revoke them just as fast when the work is done.',
  },
  {
    id: 'preview',
    glyph: 'visibility',
    titleKey: 'about.highlights.preview.title',
    titleDefault: 'Preview anything',
    bodyKey: 'about.highlights.preview.body',
    bodyDefault:
      'PDFs, decks, images, and video render inline in the browser — no downloads, no waiting.',
  },
  {
    id: 'recovery',
    glyph: 'restore_from_trash',
    titleKey: 'about.highlights.recovery.title',
    titleDefault: 'Safe by default',
    bodyKey: 'about.highlights.recovery.body',
    bodyDefault: 'Versioning and a 30-day Trash mean a wrong click is never the end of the story.',
  },
  {
    id: 'security',
    glyph: 'lock',
    titleKey: 'about.highlights.security.title',
    titleDefault: 'Encrypted end to end',
    bodyKey: 'about.highlights.security.body',
    bodyDefault: 'Every byte is encrypted in transit and at rest. Your files stay yours alone.',
  },
]

export function About() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
      subtitle={t(
        'about.subtitle',
        {},
        { defaultValue: 'The weightless archive for your digital life.' },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        <div className={cm.cn(cm.stack(4))}>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a calm, opinionated home for the files you actually want to find. Upload, share, and recover with the speed of a desktop and the durability of the cloud.',
              },
            )}
          </p>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.mission',
              {},
              {
                defaultValue:
                  'Our mission is simple: make cloud storage feel weightless. No clutter, no spinners, no guessing where a file went — just clarity, for individuals and teams alike.',
              },
            )}
          </p>
        </div>

        <section data-mol-id="about-highlights" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.highlightsTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2')}>
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.id}
                data-mol-id={`about-highlight-${h.id}`}
                className={cm.cn(
                  cm.flex({ gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary')}
                  aria-hidden="true"
                >
                  {h.glyph}
                </span>
                <div className={cm.cn(cm.stack(1))}>
                  <h3
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(h.titleKey, {}, { defaultValue: h.titleDefault })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(h.bodyKey, { appName: APP_NAME }, { defaultValue: h.bodyDefault })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Questions, feedback, or partnership ideas? Email the {{appName}} team at hello@nimbus.example — we read every message.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
