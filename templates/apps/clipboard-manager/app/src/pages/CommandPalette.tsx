import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { CommandPaletteCard, type PaletteResult } from '../components/CommandPaletteCard.js'
import { KbdBadge } from '../components/KbdBadge.js'
import { PageHeader } from '../components/PageHeader.js'

const RESULTS: ReadonlyArray<PaletteResult> = [
  {
    id: 'r1',
    icon: 'terminal',
    preview: 'git init && git add . && git commit -m "initial"',
    category: 'code',
    shortcut: '↵',
    iconColor: BRAND_COLOR,
  },
  {
    id: 'r2',
    icon: 'link',
    preview: 'https://docs.yank.app/api/v1/auth',
    category: 'url',
    shortcut: '⌘2',
  },
  { id: 'r3', icon: 'lock', preview: '••••••••••••••••', category: 'credential', shortcut: '⌘3' },
  {
    id: 'r4',
    icon: 'description',
    preview: 'meeting notes — design review (Q4)',
    category: 'text',
    shortcut: '⌘4',
  },
  {
    id: 'r5',
    icon: 'image',
    preview: 'figma:0fa1c2 — hero illustration',
    category: 'image',
    shortcut: '⌘5',
  },
]

const ACTIONS = [
  { key: 'open', defaultLabel: 'Open palette', shortcut: '⌘K' },
  { key: 'navigate', defaultLabel: 'Navigate results', shortcut: '↑↓' },
  { key: 'paste', defaultLabel: 'Paste selected', shortcut: '↵' },
  { key: 'pin', defaultLabel: 'Pin selected', shortcut: '⌘P' },
  { key: 'encrypt', defaultLabel: 'Encrypt selected', shortcut: '⌘E' },
  { key: 'delete', defaultLabel: 'Delete selected', shortcut: '⌘⌫' },
  { key: 'category', defaultLabel: 'Filter by category', shortcut: '⌘1-5' },
  { key: 'close', defaultLabel: 'Close palette', shortcut: 'Esc' },
] as const

export function CommandPalette() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [query, setQuery] = useState('git')

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-10')}>
      <PageHeader
        eyebrow={t('commandPalette.eyebrow', {}, { defaultValue: 'Keyboard-first' })}
        heading={t('commandPalette.heading', {}, { defaultValue: 'Command palette' })}
        description={t(
          'commandPalette.description',
          {},
          {
            defaultValue:
              'Open with ⌘K from anywhere. Fuzzy-search every clip and every action without leaving the keyboard.',
          },
        )}
      />

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          cm.sp('py', 8),
          'rounded-2xl bg-surface-container-low border border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          <KbdBadge>⌘</KbdBadge>
          <span>+</span>
          <KbdBadge>K</KbdBadge>
          <span className={cm.cn('ml-2')}>
            {t('commandPalette.tryItHint', {}, { defaultValue: 'try it on a real keyboard' })}
          </span>
        </div>

        <CommandPaletteCard query={query} results={RESULTS} activeIndex={0} />

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.maxW('xl'),
            cm.w('full'),
            cm.sp('px', 6),
          )}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'commandPalette.editPlaceholder',
              {},
              { defaultValue: 'Edit the query above…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-md border border-outline-variant bg-surface-container-lowest font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            )}
          />
        </div>
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'tracking-tight text-on-surface',
          )}
        >
          {t(
            'commandPalette.shortcutsHeading',
            {},
            { defaultValue: 'Every action has a shortcut' },
          )}
        </h2>
        <div
          className={cm.cn(
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40 overflow-hidden',
          )}
        >
          <table className={cm.cn('w-full')}>
            <tbody className="divide-y divide-outline-variant/40">
              {ACTIONS.map((action) => (
                <tr
                  key={action.key}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      `commandPalette.action.${action.key}`,
                      {},
                      { defaultValue: action.defaultLabel },
                    )}
                  </td>
                  <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'text-right')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'end', gap: 'xs' }),
                        'inline-flex font-mono text-xs',
                      )}
                    >
                      <KbdBadge>{action.shortcut}</KbdBadge>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default CommandPalette
export { CommandPalette as CommandPalettePage }
