import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const DEVICES = {
  microphones: ['Default — MacBook Pro Mic', 'AirPods Pro', 'External USB Mic'],
  cameras: ['FaceTime HD Camera', 'External Logitech BRIO', 'Continuity Camera (iPhone)'],
  speakers: ['Default — MacBook Pro Speakers', 'AirPods Pro', 'Studio Display Speakers'],
}

export function Lobby() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = 'instant' } = useParams<{ id: string }>()
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [mic, setMic] = useState(DEVICES.microphones[0])
  const [cam, setCam] = useState(DEVICES.cameras[0])
  const [speaker, setSpeaker] = useState(DEVICES.speakers[0])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        'bg-gradient-to-br from-[var(--color-video-grid)] via-[var(--color-video-grid)] to-participant-tile p-8 text-white relative overflow-hidden',
      )}
    >
      <div
        className={
          'absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary/30 blur-3xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute -left-32 bottom-0 w-96 h-96 rounded-full bg-secondary/25 blur-3xl pointer-events-none'
        }
      />

      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 8), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/40',
          )}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>videocam</span>
        </div>
        <h1 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{APP_NAME}</h1>
      </div>

      <div
        className={cm.cn(
          cm.maxW('lg'),
          'w-full relative z-10 bg-surface/10 backdrop-blur-xl rounded-3xl border border-surface/15 shadow-2xl shadow-black/30 p-8',
        )}
      >
        <div className={cm.cn(cm.stack(3), cm.sp('mb', 6), cm.textCenter)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('lobby.yourPreview', {}, { defaultValue: 'Your preview' })}
          </span>
          <h2 className={cm.cn('text-3xl font-extrabold tracking-tight')}>
            {t('lobby.title', {}, { defaultValue: "You're almost in" })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/70')}>
            {t('lobby.subtitle', {}, { defaultValue: 'Check your camera and mic before joining.' })}
          </p>
        </div>

        <div
          className={cm.cn(
            'relative aspect-video w-full bg-[var(--color-video-grid)] rounded-2xl overflow-hidden border border-surface/15',
            cm.sp('mb', 6),
          )}
        >
          {videoEnabled ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute inset-0 bg-gradient-to-br from-primary/40 via-primary-dark/40 to-secondary/40',
              )}
            >
              <div
                className={
                  'w-24 h-24 rounded-full bg-surface/15 backdrop-blur-md flex items-center justify-center shadow-xl'
                }
              >
                <span className="material-symbols-outlined text-5xl">person</span>
              </div>
            </div>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute inset-0 bg-participant-tile',
              )}
            >
              <div className={cm.stack(3) + ' text-center'}>
                <span className="material-symbols-outlined text-6xl text-white/40">
                  videocam_off
                </span>
                <p className={cm.cn(cm.textSize('sm'), 'text-white/60')}>
                  {t('lobby.cameraOff', {}, { defaultValue: 'Camera off' })}
                </p>
              </div>
            </div>
          )}
          <div
            className={
              'absolute bottom-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-foreground/60 backdrop-blur-md flex items-center gap-2'
            }
          >
            <span className={'w-1.5 h-1.5 rounded-full bg-success animate-pulse'} />
            You
          </div>
        </div>

        <div className={cm.cn(cm.flex({ justify: 'center', gap: 4 }), cm.sp('mb', 6))}>
          <button
            type="button"
            onClick={() => setAudioEnabled((v) => !v)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-14 h-14 rounded-full transition-all',
              audioEnabled ? 'bg-surface/15 hover:bg-surface/25' : 'bg-error/80 hover:bg-error',
            )}
            aria-label={
              audioEnabled
                ? t('meeting.mute', {}, { defaultValue: 'Mute' })
                : t('meeting.unmute', {}, { defaultValue: 'Unmute' })
            }
          >
            <span className={'material-symbols-outlined text-2xl'}>
              {audioEnabled ? 'mic' : 'mic_off'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVideoEnabled((v) => !v)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-14 h-14 rounded-full transition-all',
              videoEnabled ? 'bg-surface/15 hover:bg-surface/25' : 'bg-error/80 hover:bg-error',
            )}
            aria-label={
              videoEnabled
                ? t('meeting.stopVideo', {}, { defaultValue: 'Stop video' })
                : t('meeting.startVideo', {}, { defaultValue: 'Start video' })
            }
          >
            <span className={'material-symbols-outlined text-2xl'}>
              {videoEnabled ? 'videocam' : 'videocam_off'}
            </span>
          </button>
        </div>

        <div className={cm.cn(cm.stack(3), cm.sp('mb', 6))}>
          <DeviceSelect
            label={t('lobby.micLabel', {}, { defaultValue: 'Microphone' })}
            value={mic}
            options={DEVICES.microphones}
            onChange={setMic}
            icon="mic"
          />
          <DeviceSelect
            label={t('lobby.camLabel', {}, { defaultValue: 'Camera' })}
            value={cam}
            options={DEVICES.cameras}
            onChange={setCam}
            icon="videocam"
          />
          <DeviceSelect
            label={t('lobby.speakerLabel', {}, { defaultValue: 'Speaker' })}
            value={speaker}
            options={DEVICES.speakers}
            onChange={setSpeaker}
            icon="volume_up"
          />
        </div>

        <div className={cm.flex({ gap: 3 })}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className={cm.cn(
              cm.flex1,
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface/10 hover:bg-surface/20 transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/meeting/${id}`)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 2 }),
              cm.flex1,
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/60 transition-all',
            )}
          >
            <span className="material-symbols-outlined">videocam</span>
            {t('lobby.joinCta', {}, { defaultValue: 'Join meeting' })}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeviceSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  options: ReadonlyArray<string>
  onChange: (value: string) => void
  icon: string
}) {
  const cm = getClassMap()
  return (
    <label
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        'bg-surface/5 rounded-xl px-4 py-3 border border-surface/10 hover:border-surface/25 transition-colors',
      )}
    >
      <span
        className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-secondary shrink-0')}
      >
        {icon}
      </span>
      <div className={cm.cn(cm.flex1, cm.stack(1))}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-white/60',
          )}
        >
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(cm.textSize('sm'), 'bg-transparent text-white outline-none w-full')}
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-participant-tile text-white">
              {option}
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}
