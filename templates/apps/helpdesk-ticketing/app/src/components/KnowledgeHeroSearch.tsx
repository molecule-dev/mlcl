import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function KnowledgeHeroSearch({
  search,
  onSearchChange,
}: {
  search: string
  onSearchChange: (v: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.textCenter, cm.maxW('2xl'), cm.mxAuto)} data-mol-id="search-hero">
      <h2
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mb', 6),
          'font-extrabold tracking-tight text-on-surface',
        )}
        data-mol-id="hero-title"
      >
        {t('knowledgeHeroSearch.heading', {}, { defaultValue: 'How can we help you today?' })}
      </h2>
      <div className={cm.cn('relative group')} data-mol-id="search-input-group">
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'absolute inset-y-0 left-5 pointer-events-none text-outline',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="search">
            search
          </span>
        </div>
        <input
          className={cm.cn(
            cm.w('full'),
            cm.sp('pr', 6),
            cm.sp('py', 5),
            cm.textSize('lg'),
            'pl-14 bg-surface-container-lowest border-none rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none focus:ring-2 focus:ring-primary/20 transition-all',
          )}
          data-mol-id="search-input"
          placeholder={t(
            'knowledgeHeroSearch.searchPlaceholder',
            {},
            { defaultValue: 'Search articles, guides, or troubleshooting...' },
          )}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </section>
  )
}
export default KnowledgeHeroSearch
export { KnowledgeHeroSearch }
