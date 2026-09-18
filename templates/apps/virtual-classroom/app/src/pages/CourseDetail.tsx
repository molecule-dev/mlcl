import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AssignmentRow } from '../components/AssignmentRow.js'
import { ScheduleItem } from '../components/ScheduleItem.js'
import { StatPill } from '../components/StatPill.js'

export function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams()
  const courseId = params.id ?? 'demo-course-1'

  return (
    <div className={cm.stack(8)}>
      <Link
        to="/courses"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'self-start text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
        {t('courseDetail.back', {}, { defaultValue: 'All courses' })}
      </Link>

      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] p-10 text-on-primary shadow-xl bg-gradient-to-br from-primary via-primary-dark to-tertiary',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-20 -top-24 h-72 w-72 rounded-full bg-secondary/40 blur-3xl',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start', gap: 8 }),
            'relative z-10 flex-wrap',
          )}
        >
          <div className={cm.cn(cm.maxW('xl'), cm.stack(4))}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  'rounded-full bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest',
                )}
              >
                {t('courseDetail.code', {}, { defaultValue: 'MTH 202' })}
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-full bg-surface/15 backdrop-blur-md',
                )}
              >
                {t('courseDetail.term', {}, { defaultValue: 'Spring term · 2026' })}
              </span>
            </div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-4xl md:text-5xl tracking-tight leading-[1.05]',
              )}
            >
              {t(
                'courseDetail.title',
                {},
                { defaultValue: 'Calculus II — multivariable & vector calculus' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'opacity-90 leading-relaxed')}>
              {t(
                'courseDetail.body',
                {},
                {
                  defaultValue:
                    'A second-semester course building from line integrals through divergence and curl. Live every Tue/Thu, with a Friday lab and weekly office hours.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'flex-wrap')}>
              <Link
                to={`/class/${courseId}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('bold'),
                  'bg-surface text-primary px-7 py-3 rounded-2xl text-sm shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>video_call</span>
                {t('courseDetail.openClass', {}, { defaultValue: 'Open today’s class' })}
              </Link>
              <Link
                to={`/whiteboard/${courseId}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-2xl border border-surface/30 bg-surface/10 backdrop-blur-md px-6 py-3 hover:bg-surface/20 transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>edit_square</span>
                {t('courseDetail.openWhiteboard', {}, { defaultValue: 'Course whiteboard' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn(cm.stack(2), 'min-w-[200px] hidden lg:flex')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest opacity-90',
              )}
            >
              {t('courseDetail.progress', {}, { defaultValue: 'Term progress' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('5xl'),
                cm.fontWeight('bold'),
                'leading-none tracking-tight',
              )}
            >
              68
              <span className={cm.cn('text-2xl font-semibold opacity-80')}>%</span>
            </p>
            <div className={cm.cn('h-2 rounded-full bg-surface/20 overflow-hidden')}>
              <div
                className={cm.cn('h-full bg-gradient-to-r from-secondary to-white')}
                style={{ width: '68%' }}
              ></div>
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'opacity-90')}>
              {t(
                'courseDetail.progressBody',
                {},
                { defaultValue: '8 of 12 modules complete · A−' },
              )}
            </p>
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}>
        <StatPill
          icon="event"
          tone="primary"
          label={t('courseDetail.statClassesLabel', {}, { defaultValue: 'Classes left' })}
          value="9"
          delta={t('courseDetail.statClassesDelta', {}, { defaultValue: 'next: Tue 9 AM' })}
          deltaTrend="flat"
        />
        <StatPill
          icon="task_alt"
          tone="success"
          label={t('courseDetail.statSubmittedLabel', {}, { defaultValue: 'Submitted' })}
          value="14"
          unit="/16"
          delta={t('courseDetail.statSubmittedDelta', {}, { defaultValue: '88% on-time' })}
        />
        <StatPill
          icon="grade"
          tone="secondary"
          label={t('courseDetail.statGradeLabel', {}, { defaultValue: 'Running grade' })}
          value="A−"
          delta={t('courseDetail.statGradeDelta', {}, { defaultValue: '+2.1 since midterm' })}
        />
        <StatPill
          icon="forum"
          tone="tertiary"
          label={t('courseDetail.statDiscussionLabel', {}, { defaultValue: 'Discussion posts' })}
          value="32"
          delta={t('courseDetail.statDiscussionDelta', {}, { defaultValue: 'top 12% of class' })}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.stack(8))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
                cm.sp('mb', 4),
              )}
            >
              {t('courseDetail.upcomingTitle', {}, { defaultValue: 'Upcoming sessions' })}
            </h2>
            <div className={cm.stack(3)}>
              <ScheduleItem
                id="cls-1"
                title={t('courseDetail.cls1Title', {}, { defaultValue: 'Vector fields & flux' })}
                course={t('courseDetail.cls1Course', {}, { defaultValue: 'Calculus II · MTH 202' })}
                instructor={t(
                  'courseDetail.cls1Instructor',
                  {},
                  { defaultValue: 'Prof. Maya Okafor' },
                )}
                startTime="9:00 AM"
                endTime="10:30 AM"
                location={t(
                  'courseDetail.cls1Room',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} room · Lavender' },
                )}
                status="live"
                tone="primary"
              />
              <ScheduleItem
                id="cls-2"
                title={t('courseDetail.cls2Title', {}, { defaultValue: 'Line integrals review' })}
                course={t('courseDetail.cls2Course', {}, { defaultValue: 'Calculus II · MTH 202' })}
                instructor={t(
                  'courseDetail.cls2Instructor',
                  {},
                  { defaultValue: 'Prof. Maya Okafor' },
                )}
                startTime="Thu 9:00 AM"
                endTime="10:30 AM"
                location={t(
                  'courseDetail.cls2Room',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} room · Lavender' },
                )}
                tone="primary"
              />
              <ScheduleItem
                id="cls-3"
                title={t('courseDetail.cls3Title', {}, { defaultValue: 'Lab: Stokes problem set' })}
                course={t('courseDetail.cls3Course', {}, { defaultValue: 'Calculus II · MTH 202' })}
                instructor={t(
                  'courseDetail.cls3Instructor',
                  {},
                  { defaultValue: 'TA Felix Bauer' },
                )}
                startTime="Fri 1:00 PM"
                endTime="2:30 PM"
                location={t(
                  'courseDetail.cls3Room',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} room · Petal' },
                )}
                tone="breakout-a"
              />
            </div>
          </div>

          <div>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
                cm.sp('mb', 4),
              )}
            >
              {t('courseDetail.assignmentsTitle', {}, { defaultValue: 'Course assignments' })}
            </h2>
            <div
              className={cm.cn(
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 divide-y divide-outline-variant/15 overflow-hidden',
              )}
            >
              <AssignmentRow
                id="ca-1"
                title={t(
                  'courseDetail.ca1Title',
                  {},
                  { defaultValue: 'Vector field flux problem set' },
                )}
                course={t('courseDetail.ca1Course', {}, { defaultValue: 'Calculus II' })}
                courseCode="MTH 202"
                dueLabel={t('courseDetail.ca1Due', {}, { defaultValue: 'Due Thu · 5:00 PM' })}
                status="upcoming"
              />
              <AssignmentRow
                id="ca-2"
                title={t('courseDetail.ca2Title', {}, { defaultValue: 'Stokes theorem proofs' })}
                course={t('courseDetail.ca2Course', {}, { defaultValue: 'Calculus II' })}
                courseCode="MTH 202"
                dueLabel={t('courseDetail.ca2Due', {}, { defaultValue: 'Submitted Mon' })}
                status="submitted"
                scoreLabel={t('courseDetail.ca2Score', {}, { defaultValue: 'Awaiting feedback' })}
              />
              <AssignmentRow
                id="ca-3"
                title={t(
                  'courseDetail.ca3Title',
                  {},
                  { defaultValue: 'Line integral review quiz' },
                )}
                course={t('courseDetail.ca3Course', {}, { defaultValue: 'Calculus II' })}
                courseCode="MTH 202"
                dueLabel={t('courseDetail.ca3Due', {}, { defaultValue: 'Returned · 9 days ago' })}
                status="graded"
                scoreLabel={t('courseDetail.ca3Score', {}, { defaultValue: 'A · 94%' })}
              />
            </div>
          </div>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(6))}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('bold'),
                'text-on-surface',
                cm.sp('mb', 3),
              )}
            >
              {t('courseDetail.rosterTitle', {}, { defaultValue: 'Roster · 28' })}
            </h3>
            <ul className={cm.stack(2)}>
              {[
                'Prof. Maya Okafor',
                'TA Felix Bauer',
                'Aiyana Vega',
                'Kenji Park',
                'Priya Shah',
              ].map((name, idx) => (
                <li key={name} className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                  <div
                    className={cm.cn(
                      'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold',
                      idx === 0
                        ? 'bg-primary text-on-primary'
                        : idx === 1
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-primary-container text-on-primary-container',
                    )}
                  >
                    {name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className={cm.flex1}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {name}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
                      )}
                    >
                      {idx === 0
                        ? t('courseDetail.rosterInstructor', {}, { defaultValue: 'Instructor' })
                        : idx === 1
                          ? t('courseDetail.rosterTa', {}, { defaultValue: 'Teaching assistant' })
                          : t('courseDetail.rosterStudent', {}, { defaultValue: 'Student' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              to={`/profile/${courseId}`}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.sp('mt', 4),
                'text-primary hover:underline inline-block',
              )}
            >
              {t('courseDetail.rosterViewAll', {}, { defaultValue: 'View full roster →' })}
            </Link>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('bold'),
                'text-on-surface',
                cm.sp('mb', 3),
              )}
            >
              {t('courseDetail.materialsTitle', {}, { defaultValue: 'Materials' })}
            </h3>
            <ul className={cm.stack(2)}>
              {[
                { icon: 'picture_as_pdf', label: 'Vector calc primer', size: '2.4 MB' },
                { icon: 'slideshow', label: 'Lecture 14 deck', size: '12 slides' },
                { icon: 'description', label: 'Problem set 7', size: 'PDF · 6 pages' },
              ].map((item) => (
                <li
                  key={item.label}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 3 }),
                    cm.sp('p', 3),
                    'rounded-xl hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      'h-9 w-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                      {item.icon}
                    </span>
                  </span>
                  <div className={cm.flex1}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {item.label}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {item.size}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[20px] text-on-surface-variant',
                    )}
                  >
                    download
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default CourseDetail
