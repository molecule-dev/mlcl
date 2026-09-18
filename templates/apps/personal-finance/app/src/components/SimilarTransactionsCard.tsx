import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SimilarTx {
  id: string
  description: string
  date: string
  amount: number
}

interface Props {
  similar: SimilarTx[]
  formatCurrency: (amount: number) => string
}

function SimilarTransactionsCard({ similar, formatCurrency }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <h2
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          cm.flex({ align: 'center', justify: 'between' }),
          'font-headline',
        )}
      >
        {t('similarTransactionsCard.title', {}, { defaultValue: 'Similar Transactions' })}

        <Link
          to="/transactions"
          className={cm.cn(
            'text-[10px] font-bold text-primary uppercase tracking-wider cursor-pointer hover:underline',
          )}
        >
          {t('common.viewAll', {}, { defaultValue: 'View All' })}
        </Link>
      </h2>
      <div className={cm.stack(6)}>
        {similar.map((tx) => (
          <Link
            key={tx.id}
            to={`/transactions/${tx.id}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.cursorPointer,
                'group',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'rounded-xl bg-surface-container-low text-foreground-tertiary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined')} data-icon="shopping_basket">
                    shopping_basket
                  </span>
                </div>
                <div>
                  <div
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {tx.description}
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-foreground-tertiary')}>
                    {new Date(tx.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'font-headline text-on-surface',
                )}
              >
                {tx.amount < 0 ? '-' : '+'}
                {formatCurrency(tx.amount)}
              </div>
            </div>
          </Link>
        ))}
        {similar.length === 0 && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.textCenter,
              cm.sp('py', 4),
              'text-foreground-tertiary',
            )}
          >
            {t(
              'similarTransactionsCard.empty',
              {},
              { defaultValue: 'No similar transactions found.' },
            )}
          </p>
        )}
      </div>
    </section>
  )
}

export default SimilarTransactionsCard
export { SimilarTransactionsCard }
