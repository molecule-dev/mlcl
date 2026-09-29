import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PuzzleGame } from '../components/PuzzleGame.js'

/** GET /api/puzzles/:date shape — only what the dossier card needs. */
interface DossierState {
  date: string
  puzzleNumber: number
  status: 'playing' | 'won' | 'lost'
  attempts: number
  answer?: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

/**
 * A past day replayed as practice: same game, same feedback, zero streak
 * effect (the API marks these results practice=true and never folds them
 * into user_stats). Below the board, a historical dossier recaps the day:
 * puzzle number, calendar date, and — once the game is finished — the
 * secret word reveal.
 */
export function ArchivePlay() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { date } = useParams<{ date: string }>()
  const [dossier, setDossier] = useState<DossierState | null>(null)

  useEffect(() => {
    if (!date) return
    let cancelled = false
    http
      .get(`/api/puzzles/${date}`)
      .then((res) => {
        if (!cancelled) setDossier(unwrap<DossierState>(res))
      })
      .catch(() => {
        // the dossier is a recap card — the game itself is the page
      })
    return () => {
      cancelled = true
    }
  }, [date, http])

  const finished = dossier?.status === 'won' || dossier?.status === 'lost'

  return (
    <>
      <PuzzleGame date={date} />
      {dossier && (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            'w-full bg-surface px-4 pb-10',
          )}
          data-mol-id="archive-dossier"
        >
          <div className={cm.cn(cm.card(), cm.cardPadding('md'), cm.stack(3), 'w-full max-w-2xl')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                'border-b border-outline-variant/40 pb-3',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-[22px] text-secondary')}
                  aria-hidden="true"
                >
                  menu_book
                </span>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t(
                    'archivePlay.dossier.title',
                    { number: dossier.puzzleNumber },
                    { defaultValue: `Historical dossier #${dossier.puzzleNumber}` },
                  )}
                </h2>
              </div>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {new Date(`${dossier.date}T00:00:00.000Z`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </span>
            </div>
            {finished ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3',
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('archivePlay.dossier.secretWord', {}, { defaultValue: 'Secret word' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      'text-primary tracking-widest',
                    )}
                  >
                    {dossier.answer}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.badge({ variant: dossier.status === 'won' ? 'success' : 'error' }),
                    'font-semibold whitespace-nowrap',
                  )}
                >
                  {dossier.status === 'won'
                    ? t(
                        'archive.inspection.solvedIn',
                        { count: dossier.attempts },
                        { defaultValue: `Solved in ${dossier.attempts}` },
                      )
                    : t('archive.missed', {}, { defaultValue: 'Missed' })}
                </span>
              </div>
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'archivePlay.dossier.practiceNote',
                  {},
                  {
                    defaultValue:
                      'Finish this practice replay to reveal the day’s secret word here.',
                  },
                )}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default ArchivePlay
