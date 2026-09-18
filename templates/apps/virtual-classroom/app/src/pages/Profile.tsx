import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CourseTileCard } from '../components/CourseTileCard.js'
import { StatPill } from '../components/StatPill.js'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams()
  const profileId = params.id ?? 'demo-profile'

  return (
    <div className={cm.stack(8)}>
      <Link
        to="/dashboard"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'self-start text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
        {t('common.back', {}, { defaultValue: 'Back' })}
      </Link>

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] p-10 text-on-primary shadow-xl bg-gradient-to-br from-primary via-tertiary to-secondary',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-20 -top-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start', gap: 8 }),
            'relative z-10 flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'flex-wrap')}>
            <img
              alt=""
              src={`https://picsum.photos/seed/${profileId}/240/240`}
              className={cm.cn(
                'h-28 w-28 rounded-3xl border-4 border-surface/40 object-cover shadow-xl',
              )}
            />
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest opacity-90',
                )}
              >
                {t('profile.role', {}, { defaultValue: 'Instructor · Mathematics' })}
              </span>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-4xl md:text-5xl tracking-tight leading-[1.05]',
                )}
              >
                {t('profile.name', {}, { defaultValue: 'Prof. Maya Okafor' })}
              </h1>
              <p className={cm.cn(cm.textSize('base'), 'opacity-90 max-w-2xl leading-relaxed')}>
                {t(
                  'profile.bio',
                  {},
                  {
                    defaultValue:
                      'Vector calculus & topology · 14 years teaching · Aula community moderator. Office hours Mon/Wed 11–12 in the Lavender room.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
                {['MTH 202', 'MTH 305', 'TOP 410'].map((c) => (
                  <span
                    key={c}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      'rounded-full bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <button
              type="button"
              onClick={() => {}}
              // TODO: wire to media
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.fontWeight('bold'),
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.textSize('sm'),
                'rounded-2xl bg-surface text-primary hover:scale-[1.02] transition-transform shadow-md',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>forum</span>
              {t('profile.message', {}, { defaultValue: 'Message' })}
            </button>
            <button
              type="button"
              onClick={() => {}}
              // TODO: wire to media
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.fontWeight('semibold'),
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.textSize('sm'),
                'rounded-2xl border border-surface/40 bg-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>person_add</span>
              {t('common.follow', {}, { defaultValue: 'Follow' })}
            </button>
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}>
        <StatPill
          icon="school"
          tone="primary"
          label={t('profile.statCoursesLabel', {}, { defaultValue: 'Active courses' })}
          value="3"
        />
        <StatPill
          icon="groups"
          tone="secondary"
          label={t('profile.statStudentsLabel', {}, { defaultValue: 'Students this term' })}
          value="118"
          delta={t('profile.statStudentsDelta', {}, { defaultValue: '+12 vs last term' })}
        />
        <StatPill
          icon="star"
          tone="success"
          label={t('profile.statRatingLabel', {}, { defaultValue: 'Student rating' })}
          value="4.8"
          unit="/5"
          delta={t('profile.statRatingDelta', {}, { defaultValue: 'Top 5% in dept.' })}
        />
        <StatPill
          icon="event"
          tone="tertiary"
          label={t('profile.statClassesLabel', {}, { defaultValue: 'Classes hosted' })}
          value="412"
        />
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
            cm.sp('mb', 4),
          )}
        >
          {t('profile.coursesTitle', {}, { defaultValue: 'Courses I teach' })}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          <CourseTileCard
            id="prof-1"
            title={t('profile.course1Title', {}, { defaultValue: 'Calculus II' })}
            code="MTH 202"
            instructor={t('profile.course1Instructor', {}, { defaultValue: 'Prof. Maya Okafor' })}
            level="INTERMEDIATE"
            imageSeed="aula-prof-1"
            progressPercent={68}
            lessonsRemaining={4}
          />
          <CourseTileCard
            id="prof-2"
            title={t('profile.course2Title', {}, { defaultValue: 'Discrete Mathematics' })}
            code="MTH 305"
            instructor={t('profile.course2Instructor', {}, { defaultValue: 'Prof. Maya Okafor' })}
            level="INTERMEDIATE"
            imageSeed="aula-prof-2"
            progressPercent={42}
            lessonsRemaining={6}
          />
          <CourseTileCard
            id="prof-3"
            title={t('profile.course3Title', {}, { defaultValue: 'Algebraic Topology' })}
            code="TOP 410"
            instructor={t('profile.course3Instructor', {}, { defaultValue: 'Prof. Maya Okafor' })}
            level="ADVANCED"
            imageSeed="aula-prof-3"
            progressPercent={88}
            lessonsRemaining={2}
          />
        </div>
      </section>
    </div>
  )
}

export default Profile
