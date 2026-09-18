import { useNavigate, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const CHAPTERS = [
  { time: '0:00', title: 'Opening — quick wins' },
  { time: '5:12', title: 'Pricing & retention deep-dive' },
  { time: '21:48', title: 'ML roadmap proposal' },
  { time: '33:05', title: 'Action items + next steps' },
]

const TRANSCRIPT = [
  {
    time: '0:00',
    speaker: 'Sarah Kim',
    text: 'Hey team — let me kick us off with quick wins from last week. Onboarding conversion is up 14%.',
  },
  {
    time: '0:38',
    speaker: 'David Park',
    text: 'That tracks with the email follow-up A/B we shipped Tuesday. The treatment beat control by 22%.',
  },
  {
    time: '1:24',
    speaker: 'Maya Reyes',
    text: 'On the design side, the new lobby card is in front of 30 customers — feedback so far is overwhelmingly positive.',
  },
  {
    time: '2:11',
    speaker: 'Sarah Kim',
    text: 'Great. Let me dive into pricing. We have two options on the table…',
  },
]

export function RecordingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = 'r1' } = useParams<{ id: string }>()

  return (
    <div className={cm.stack(8)}>
      <button
        type="button"
        onClick={() => navigate('/recordings')}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={'material-symbols-outlined text-base'}>arrow_back</span>
        {t('recordings.title', {}, { defaultValue: 'Recordings' })}
      </button>

      <header className={cm.stack(3)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('recordingDetail.title', {}, { defaultValue: 'Recording' })} · {id}
        </span>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>
          Pricing kickoff with Acme Corp
        </h1>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 4 }),
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          <span>Sarah Kim · 8 attendees</span>
          <span>·</span>
          <span>Yesterday · 42 min</span>
        </div>
      </header>

      <div
        className={
          'relative aspect-video w-full bg-gradient-to-br from-primary via-primary-dark to-secondary rounded-3xl overflow-hidden shadow-xl shadow-primary/30'
        }
      >
        <div
          className={
            'absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-surface/15 blur-3xl pointer-events-none'
          }
        />
        <div
          className={
            'absolute left-12 top-12 w-32 h-32 rounded-full bg-secondary/30 blur-2xl pointer-events-none'
          }
        />
        <div className={'absolute inset-0 flex items-center justify-center'}>
          <button
            type="button"
            aria-label={t('recordingDetail.playAria', {}, { defaultValue: 'Play recording' })}
            className={
              'w-20 h-20 rounded-full bg-surface/95 backdrop-blur-md flex items-center justify-center shadow-2xl hover:scale-110 transition-transform'
            }
            // TODO: wire video player play handler
            onClick={() => {}}
          >
            <span className="material-symbols-outlined text-5xl text-primary">play_arrow</span>
          </button>
        </div>
        <div
          className={
            'absolute bottom-6 left-6 right-6 h-1.5 bg-surface/20 rounded-full overflow-hidden'
          }
        >
          <div className={'h-full w-1/3 bg-surface rounded-full'} />
        </div>
        <div
          className={
            'absolute bottom-10 left-6 right-6 flex items-center justify-between text-white text-xs font-bold tracking-widest uppercase'
          }
        >
          <span>14:08</span>
          <span>42:00</span>
        </div>
      </div>

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'xl:grid-cols-3')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('recordingDetail.chapters', {}, { defaultValue: 'Chapters' })}
          </h3>
          <ul className={cm.stack(2)}>
            {CHAPTERS.map((chapter) => (
              <li key={chapter.time}>
                <button
                  type="button"
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 3 }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full text-left rounded-xl hover:bg-primary-container/30 transition-colors',
                  )}
                  // TODO: wire jump-to-chapter playback handler
                  onClick={() => {}}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary tabular-nums min-w-[50px]',
                    )}
                  >
                    {chapter.time}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {chapter.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'bg-surface-container-lowest rounded-2xl shadow-sm xl:col-span-2',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('recordingDetail.transcript', {}, { defaultValue: 'Transcript' })}
            </h3>
            <button
              type="button"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
              // TODO: wire transcript-search flow
              onClick={() => {}}
            >
              {t('recordingDetail.searchCta', {}, { defaultValue: 'Search…' })}
            </button>
          </div>
          <ol className={cm.stack(4)}>
            {TRANSCRIPT.map((turn) => (
              <li key={turn.time} className={cm.flex({ align: 'start', gap: 4 })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest tabular-nums text-primary min-w-[50px] mt-1',
                  )}
                >
                  {turn.time}
                </span>
                <div className={cm.cn(cm.flex1, cm.stack(1))}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {turn.speaker}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
                    {turn.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('p', 4),
          'sticky bottom-4 mx-auto max-w-4xl bg-surface backdrop-blur-xl rounded-2xl shadow-lg border border-outline-variant/40',
        )}
      >
        <input
          type="text"
          placeholder="Add a comment or pin a moment…"
          className={cm.cn(
            cm.flex1,
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all',
          )}
        />
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-md shadow-primary/25 hover:shadow-lg transition-all',
          )}
          // TODO: wire post-comment endpoint
          onClick={() => {}}
        >
          <span className={'material-symbols-outlined text-lg'}>content_cut</span>
          {t('recordingDetail.addClip', {}, { defaultValue: 'Add clip' })}
        </button>
      </footer>
    </div>
  )
}
