import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function AssignmentDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams()
  const assignmentId = params.id ?? 'demo-1'

  return (
    <div className={cm.stack(8)}>
      <Link
        to="/assignments"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'self-start text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')}>arrow_back</span>
        {t('assignmentDetail.back', {}, { defaultValue: 'All assignments' })}
      </Link>

      <header className={cm.cn(cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest rounded-full bg-primary-container text-on-primary-container',
            )}
          >
            {t('assignmentDetail.code', {}, { defaultValue: 'BIO 211' })}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest rounded-full bg-secondary/20 text-secondary-dark',
            )}
          >
            {t('assignmentDetail.status', {}, { defaultValue: 'In progress · 60%' })}
          </span>
        </div>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface max-w-3xl',
          )}
        >
          {t(
            'assignmentDetail.title',
            {},
            { defaultValue: 'Lab report — Mitochondrial DNA inheritance patterns' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'assignmentDetail.context',
            { instructor: 'Dr. Eun-ji Park', due: 'tomorrow · 11:59 PM' },
            { defaultValue: 'Cell Biology I · Posted by {{instructor}} · Due {{due}}' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <section className={cm.cn('col-span-12 lg:col-span-8', cm.stack(6))}>
          <article
            className={cm.cn(
              cm.sp('p', 8),
              cm.stack(4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('assignmentDetail.instructionsTitle', {}, { defaultValue: 'Instructions' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'assignmentDetail.instructionsBody',
                {},
                {
                  defaultValue:
                    'Choose two model organisms from this week’s reading and write a 1,500–2,000 word report comparing their mitochondrial DNA inheritance patterns. Include at least three peer-reviewed citations and one diagram.',
                },
              )}
            </p>
            <ul className={cm.cn(cm.stack(2), 'list-none')}>
              {[
                'Diagram comparing maternal vs. paternal inheritance routes',
                'Three peer-reviewed sources, formatted in CSE style',
                'A short reflection on disagreements between sources',
              ].map((line, i) => (
                <li
                  key={line}
                  className={cm.cn(cm.flex({ align: 'start', gap: 2 }), cm.textSize('sm'))}
                >
                  <span
                    className={cm.cn(
                      'h-6 w-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-[11px] font-bold shrink-0',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cm.cn('text-on-surface-variant')}>
                    {t(`assignmentDetail.req_${i}`, {}, { defaultValue: line })}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <section
            className={cm.cn(
              cm.sp('p', 8),
              cm.stack(4),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('assignmentDetail.rubricTitle', {}, { defaultValue: 'Rubric' })}
            </h2>
            <div className={cm.cn('divide-y divide-outline-variant/15')}>
              {[
                { label: 'Scientific accuracy', weight: '40%' },
                { label: 'Quality of analysis', weight: '30%' },
                { label: 'Citations & formatting', weight: '20%' },
                { label: 'Visual & clarity', weight: '10%' },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(`assignmentDetail.rubric_${row.label}`, {}, { defaultValue: row.label })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'tabular-nums text-primary',
                    )}
                  >
                    {row.weight}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(6))}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-tertiary text-on-primary shadow-xl',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest opacity-90',
              )}
            >
              {t('assignmentDetail.draftStatus', {}, { defaultValue: 'Your draft' })}
            </span>
            <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'leading-tight')}>
              {t('assignmentDetail.draftLabel', {}, { defaultValue: '60% complete' })}
            </p>
            <div className={cm.cn('h-2 rounded-full bg-surface/25 overflow-hidden')}>
              <div
                className={cm.cn('h-full bg-gradient-to-r from-secondary to-white')}
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'opacity-90')}>
              {t(
                'assignmentDetail.draftBody',
                {},
                { defaultValue: 'Last edited 14 minutes ago · auto-saving on every change.' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <Link
                to={`/whiteboard/${assignmentId}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('bold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface text-primary hover:scale-[1.02] transition-transform',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>edit_square</span>
                {t('assignmentDetail.continueDraft', {}, { defaultValue: 'Continue draft' })}
              </Link>
              <button
                type="button"
                onClick={() => {}}
                // TODO: wire to media
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-xl border border-surface/30 bg-surface/10 backdrop-blur-md hover:bg-surface/20 transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>upload_file</span>
                {t('common.upload', {}, { defaultValue: 'Upload' })}
              </button>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('assignmentDetail.attachmentsTitle', {}, { defaultValue: 'Attachments' })}
            </h3>
            <ul className={cm.stack(2)}>
              {[
                { icon: 'picture_as_pdf', label: 'Reading list — week 9.pdf', size: '420 KB' },
                { icon: 'description', label: 'Lab report template.docx', size: '38 KB' },
                { icon: 'science', label: 'Sample data — organisms.csv', size: '12 KB' },
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
                        'text-on-surface truncate',
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

export default AssignmentDetail
