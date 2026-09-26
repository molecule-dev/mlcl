import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Landing-page hero visual — a miniature of the real Tree screen: three
 * connected cards (grandparent → parent+partner) with the same elbow/line
 * connector geometry, scaled down. Static demo data only.
 */
export function MiniTreePreview() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const name = (key: string, def: string): string => t(`miniTree.${key}`, {}, { defaultValue: def })

  const card = (label: string, years: string, accent: boolean, style: React.CSSProperties) => (
    <div
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-xl bg-surface-container-lowest border shadow-sm text-center w-36',
        accent ? 'border-primary' : 'border-outline-variant/40',
      )}
      style={style}
    >
      <p
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'leading-tight')}
        style={{ fontFamily: 'var(--mol-font-tree)' }}
      >
        {label}
      </p>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>{years}</p>
    </div>
  )

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-lg relative overflow-hidden',
      )}
      data-mol-id="landing-tree-preview"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(21, 128, 61, 0.12) 0%, transparent 40%),' +
            'radial-gradient(circle at 85% 80%, rgba(180, 83, 9, 0.10) 0%, transparent 35%)',
        }}
        aria-hidden="true"
      />
      <div className={cm.cn('relative', cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 5))}>
        <span className="material-symbols-outlined text-primary" aria-hidden="true">
          account_tree
        </span>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {name('eyebrow', 'Hutchins family · 4 generations')}
        </p>
      </div>

      <div className={cm.cn('relative')} style={{ height: 210 }} aria-hidden="true">
        <svg width="304" height="210" className="absolute top-0 left-1/2 -translate-x-1/2">
          {/* grandparent → parent elbow */}
          <path
            d="M 152 62 V 92 H 76 V 122"
            fill="none"
            stroke="var(--color-tree-connector)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* grandparent → aunt elbow */}
          <path
            d="M 152 62 V 92 H 228 V 122"
            fill="none"
            stroke="var(--color-tree-connector)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* parent — partner dashed line */}
          <path
            d="M 40 173 H 112"
            fill="none"
            stroke="var(--color-tree-partner)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        </svg>
        <div className="absolute left-1/2 -translate-x-1/2 top-0">
          {card(
            name('grandparent', 'Walter Hutchins'),
            name('grandparentYears', '1938 – 2016'),
            true,
            {},
          )}
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[122px] w-[304px]"
          aria-hidden="true"
        >
          <div className="absolute left-0 top-0">
            {card(name('parent', 'David Hutchins'), name('parentYears', 'b. 1965'), false, {})}
          </div>
          <div className="absolute right-0 top-0">
            {card(name('partner', 'Lucia Moretti'), name('partnerYears', 'b. 1967'), false, {})}
          </div>
        </div>
      </div>

      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 4))}>
        {name('caption', 'Click any card to open a life timeline — pan and zoom the full tree.')}
      </p>
    </div>
  )
}

export default MiniTreePreview
