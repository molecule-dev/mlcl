import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DealCard from './DealCard.js'
import LostDealCard from './LostDealCard.js'
import WonDealCard from './WonDealCard.js'
interface PipelineStage {
  stage: string
  label: string
  deals: Array<{ id: string; title: string; value: number; company?: string; probability: number }>
  total: number
  count: number
}

function DealKanbanBoard({ pipeline: _pipeline = [] }: { pipeline?: PipelineStage[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openMenu) return
    const handler = (e: MouseEvent) => {
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])
  const disabledMenuActionClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'w-full text-left text-on-surface-variant/60 cursor-not-allowed',
  )
  const comingSoonTitle = t(
    'dealKanbanBoard.comingSoon',
    {},
    { defaultValue: 'This action will be enabled when pipeline editing is connected.' },
  )
  return (
    <div
      ref={boardRef}
      className={cm.cn(cm.flex({}), cm.sp('pb', 4), 'gap-6 h-[calc(100vh-220px)] min-w-max')}
    >
      {/* Column 1: Lead */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-lead"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-border text-foreground text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageLead', {}, { defaultValue: 'Lead' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'lead' ? null : 'lead')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'lead'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'lead' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              $45K
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('dealKanbanBoard.dealCount', { count: 8 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(3), 'overflow-y-auto')}>
          {/* Card Example */}
          <DealCard />
        </div>
      </div>
      {/* Column 2: Qualified */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-qualified"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-primary text-white text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageQualified', {}, { defaultValue: 'Qualified' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'qualified' ? null : 'qualified')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'qualified'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'qualified' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              $120K
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('dealKanbanBoard.dealCount', { count: 5 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(3), 'overflow-y-auto')}>
          <DealCard />
        </div>
      </div>
      {/* Column 3: Proposal */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-proposal"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-[var(--mol-color-secondary)] text-white text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageProposal', {}, { defaultValue: 'Proposal' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'proposal' ? null : 'proposal')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'proposal'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'proposal' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              $280K
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('dealKanbanBoard.dealCount', { count: 3 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(3), 'overflow-y-auto')}>
          <Link
            to="/contacts/demo-3"
            className={cm.fvde2f5b1a}
            onClick={(e) => e.stopPropagation()}
          >
            <DealCard interactive={false} />
          </Link>
        </div>
      </div>
      {/* Column 4: Negotiation */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-negotiation"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-amber-500 text-white text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageNegotiation', {}, { defaultValue: 'Negotiation' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'negotiation' ? null : 'negotiation')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'negotiation'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'negotiation' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              $180K
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('dealKanbanBoard.dealCount', { count: 4 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(3), 'overflow-y-auto')}>
          <Link
            to="/contacts/demo-4"
            className={cm.fvde2f5b1a}
            onClick={(e) => e.stopPropagation()}
          >
            <DealCard interactive={false} />
          </Link>
        </div>
      </div>
      {/* Column 5: Won */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-won"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-emerald-500 text-white text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageWon', {}, { defaultValue: 'Won' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'won' ? null : 'won')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'won'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'won' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'between' }), 'items-baseline')}>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              $340K
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('dealKanbanBoard.dealCount', { count: 12 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex1, cm.sp('p', 3), cm.stack(3), 'overflow-y-auto')}>
          {/* Successful Card */}
          <Link
            to="/contacts/demo-5"
            className={cm.fvde2f5b1a}
            onClick={(e) => e.stopPropagation()}
          >
            <WonDealCard />
          </Link>
        </div>
      </div>
      {/* Column 6: Lost */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w(72),
          'bg-surface-container-low rounded-xl',
        )}
        data-mol-id="col-lost"
      >
        <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('mb', 2),
              'relative',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('bold'),
                'py-0.5 bg-error text-white text-[10px] rounded uppercase tracking-wider',
              )}
            >
              {t('dealKanbanBoard.stageLost', {}, { defaultValue: 'Lost' })}
            </span>
            <button
              type="button"
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-foreground-tertiary',
              )}
              style={{ fontSize: '18px' }}
              onClick={() => setOpenMenu(openMenu === 'lost' ? null : 'lost')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'lost'}
              aria-label={t('dealKanbanBoard.stageActions', {}, { defaultValue: 'Stage actions' })}
            >
              more_horiz
            </button>
            {openMenu === 'lost' && (
              <div
                role="menu"
                tabIndex={-1}
                className={cm.cn(
                  cm.sp('py', 1),
                  'absolute right-0 top-6 z-10 bg-surface rounded-lg shadow-lg min-w-[140px]',
                )}
              >
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.addDeal', {}, { defaultValue: 'Add deal' })}
                </button>
                <button
                  role="menuitem"
                  className={disabledMenuActionClass}
                  title={comingSoonTitle}
                  disabled
                >
                  {t('dealKanbanBoard.editStage', {}, { defaultValue: 'Edit stage' })}
                </button>
              </div>
            )}
          </div>
          <div className={cm.fvde1371ae}>
            <h3 className={cm.fv393e94bd}>$95K</h3>
            <p className={cm.fvdeb10e92}>
              {t('dealKanbanBoard.dealCount', { count: 6 }, { defaultValue: '{{count}} deals' })}
            </p>
          </div>
        </div>
        <div className={cm.fv26cba599}>
          <Link
            to="/contacts/demo-6"
            className={cm.fvde2f5b1a}
            onClick={(e) => e.stopPropagation()}
          >
            <LostDealCard />
          </Link>
        </div>
      </div>
    </div>
  )
}
export default DealKanbanBoard
export { DealKanbanBoard }
