import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { type BoardGuess, PuzzleBoard } from '../components/PuzzleBoard.js'

/**
 * The one-minute primer: rules, the three tile states on a live-looking
 * board, and the daily cadence. Public — linked from landing and the game.
 */
const EXAMPLE_GUESSES: BoardGuess[] = [
  {
    word: 'crane',
    feedback: ['absent', 'absent', 'absent', 'correct', 'absent'],
  },
]

export function HowToPlay() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const rules = [
    {
      key: 'rules.guess',
      title: 'Guess the word',
      body: 'You have six tries to find the five-letter word of the day. Each guess must be a real five-letter word.',
    },
    {
      key: 'rules.tiles',
      title: 'Read the tiles',
      body: 'After every guess, the tiles flip: green means the letter is right and in place, amber means it is in the word but elsewhere, gray means it is not in the word at all.',
    },
    {
      key: 'rules.daily',
      title: 'One word a day',
      body: 'Everyone gets the same word each calendar day (UTC). Solve it to extend your streak — miss it and the streak resets.',
    },
    {
      key: 'rules.share',
      title: 'Share your grid',
      body: 'Finished? Share your emoji grid — the colored squares say everything without spoiling the word.',
    },
  ]

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <Header />
      <main className={cm.cn(cm.container({ size: 'md' }), 'py-12')}>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('howToPlay.title', {}, { defaultValue: 'How to play' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mt-2 mb-8')}>
          {t(
            'howToPlay.subhead',
            {},
            {
              defaultValue: `${APP_NAME} in sixty seconds — one word, six tries, once a day.`,
            },
          )}
        </p>

        <div className={cm.cn(cm.grid({ cols: 2 }), 'gap-6 items-start')}>
          <section>
            <ol className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
              {rules.map((rule, i) => (
                <li key={rule.key} className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-8 h-8 rounded-full bg-primary text-on-primary font-bold text-sm shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                      {t(`howToPlay.${rule.key}.title`, {}, { defaultValue: rule.title })}
                    </h2>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                      {t(`howToPlay.${rule.key}.body`, {}, { defaultValue: rule.body })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section
            className={cm.cn(
              cm.card(),
              cm.cardPadding('md'),
              cm.flex({ direction: 'col', align: 'center', gap: 4 }),
            )}
            data-mol-id="how-to-play-example"
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {t('howToPlay.example.title', {}, { defaultValue: 'An example' })}
            </h2>
            <PuzzleBoard guesses={EXAMPLE_GUESSES} currentInput="sto" animate={false} />
            <ul
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 2 }),
                cm.textSize('sm'),
                'text-on-surface-variant w-full',
              )}
            >
              <li className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className="w-4 h-4 rounded bg-primary" aria-hidden="true" />
                {t(
                  'howToPlay.example.correct',
                  {},
                  { defaultValue: 'N is in the word, in that spot.' },
                )}
              </li>
              <li className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className="w-4 h-4 rounded bg-secondary" aria-hidden="true" />
                {t(
                  'howToPlay.example.present',
                  {},
                  { defaultValue: 'Amber: right letter, wrong spot.' },
                )}
              </li>
              <li className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span
                  className="w-4 h-4 rounded bg-[var(--puzzle-tile-absent)]"
                  aria-hidden="true"
                />
                {t('howToPlay.example.absent', {}, { defaultValue: 'Gray: not in the word.' })}
              </li>
            </ul>
          </section>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'mt-10')}>
          <Link
            to={isAuthenticated ? '/play' : '/signup'}
            className={cm.button({ variant: 'solid', color: 'primary', size: 'lg' })}
            data-mol-id="how-to-play-cta"
          >
            {isAuthenticated
              ? t('howToPlay.cta.play', {}, { defaultValue: 'Play today’s puzzle' })
              : t('howToPlay.cta.signup', {}, { defaultValue: 'Start playing free' })}
          </Link>
          <Link
            to="/"
            className={cm.button({ variant: 'ghost', color: 'secondary', size: 'lg' })}
            data-mol-id="how-to-play-home"
          >
            {t('howToPlay.cta.home', {}, { defaultValue: 'Back to home' })}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default HowToPlay
