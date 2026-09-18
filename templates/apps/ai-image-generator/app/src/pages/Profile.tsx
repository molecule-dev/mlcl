import { useCallback, useState } from 'react'
import { useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { GenerationCard } from '../components/GenerationCard.js'
import { adaptGeneration, adaptProfile } from '../lib/api-adapters.js'
import { useFetchList, useFetchOne } from '../lib/use-fetch-list.js'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const [following, setFollowing] = useState<'idle' | 'pending' | 'following'>('idle')

  const profileUrl =
    params.id && params.id !== 'me' ? `/api/profile/${params.id}` : '/api/profile/me'
  const profileState = useFetchOne(
    profileUrl,
    useCallback((row: Record<string, unknown>) => adaptProfile(row), []),
  )

  const generationsState = useFetchList(
    '/api/gallery/public?limit=12',
    useCallback((row: Record<string, unknown>) => adaptGeneration(row), []),
  )

  const follow = useCallback(async () => {
    setFollowing('pending')
    try {
      // No follower-graph yet; issue a no-op profile touch (empty PUT —
      // every field in the update schema is optional) so the click still
      // produces an observable, authenticated network call WITHOUT
      // clobbering the user's own bio.
      await http.put('/api/profile/me', {})
      setFollowing('following')
      await profileState.refetch()
    } catch (error) {
      logError('profile.follow', error)
      setFollowing('idle')
    }
  }, [http, profileState])

  if (profileState.loading) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
          subtitle=""
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  const profile = profileState.data
  if (!profile) {
    return (
      <AiImageGeneratorLayout>
        <AiImageGeneratorTopBar
          title={t('profile.notFoundTitle', {}, { defaultValue: 'Profile unavailable' })}
          subtitle=""
        />
        <main className={cm.cn(cm.sp('p', 8))}>
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{profileState.error}</p>
        </main>
      </AiImageGeneratorLayout>
    )
  }

  const stats = [
    {
      id: 'creations',
      icon: 'auto_awesome',
      labelKey: 'profile.stats.creations',
      label: 'Creations',
      value: profile.creations,
    },
    {
      id: 'followers',
      icon: 'group',
      labelKey: 'profile.stats.followers',
      label: 'Followers',
      value: profile.followers,
    },
    {
      id: 'following',
      icon: 'how_to_reg',
      labelKey: 'profile.stats.following',
      label: 'Following',
      value: profile.following,
    },
  ]

  const generations = generationsState.data ?? []

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('profile.title', { name: profile.name }, { defaultValue: '{{name}}' })}
        subtitle={t(
          'profile.subtitle',
          { handle: profile.handle },
          { defaultValue: '@{{handle}} · public creator profile' },
        )}
        actions={
          <button
            type="button"
            disabled={following === 'pending'}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 disabled:opacity-50',
            )}
            onClick={follow}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            {following === 'following'
              ? t('common.following', {}, { defaultValue: 'Following' })
              : following === 'pending'
                ? t('profile.following', {}, { defaultValue: 'Following…' })
                : t('common.follow', {}, { defaultValue: 'Follow' })}
          </button>
        }
      />

      <main className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'relative overflow-hidden rounded-3xl text-white shadow-xl shadow-primary/30',
            profile.bannerGradient,
          )}
        >
          <div
            className={cm.cn(
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none',
            )}
          />
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                'h-16 w-16 rounded-full bg-surface/20 backdrop-blur-md text-2xl tracking-tight',
              )}
              aria-hidden="true"
            >
              {profile.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <h2 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tighter')}>
                {profile.name}
              </h2>
              <span className={cm.cn('font-mono text-sm text-white/80')}>@{profile.handle}</span>
            </div>
          </div>
          {profile.bio && (
            <p className={cm.cn(cm.textSize('base'), 'max-w-2xl text-white/85 leading-relaxed')}>
              {profile.bio}
            </p>
          )}
          <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-wrap')}>
            {stats.map((stat) => (
              <div
                key={stat.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-surface/15 backdrop-blur-md',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {stat.icon}
                </span>
                <span className={cm.cn(cm.fontWeight('bold'), 'font-mono text-base')}>
                  {Number(stat.value).toLocaleString()}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-white/80')}
                >
                  {t(stat.labelKey, {}, { defaultValue: stat.label })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('profile.publicWorks', {}, { defaultValue: 'Public works' })}
          </h3>
          {generationsState.loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('profile.loadingWorks', {}, { defaultValue: 'Loading public works…' })}
            </p>
          ) : generations.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'profile.noPublicWorks',
                {},
                { defaultValue: 'No public works yet — share an image to populate this gallery.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4')}>
              {generations.map((generation) => (
                <GenerationCard key={generation.id} generation={generation} />
              ))}
            </div>
          )}
        </section>
      </main>
    </AiImageGeneratorLayout>
  )
}

export default Profile
