import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AgentProfileBioSection from '../components/AgentProfileBioSection.js'
import AgentProfileContactForm from '../components/AgentProfileContactForm.js'
import AgentProfileHero from '../components/AgentProfileHero.js'
import AgentProfileListingCard from '../components/AgentProfileListingCard.js'
import AgentProfileStatsSection from '../components/AgentProfileStatsSection.js'
import AgentProfileTopNavBar from '../components/AgentProfileTopNavBar.js'
import Footer from '../components/Footer.js'
import type { PublicAgentProfile, PublicListingSummary } from '../types/agent-public.js'

function AgentProfilePage() {
  const cm = getClassMap()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [agent, setAgent] = useState<PublicAgentProfile | null>(null)
  const [listings, setListings] = useState<PublicListingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    Promise.all([
      http.get<PublicAgentProfile | { data: PublicAgentProfile }>(`/api/agents/${id}`),
      // /api/agents/:id/listings is the canonical "show me this agent's
      // active listings" endpoint per the inventory.
      http.get<PublicListingSummary[] | { data: PublicListingSummary[] }>(
        `/api/agents/${id}/listings`,
      ),
    ])
      .then(([agentRes, listingsRes]) => {
        const agentBody = agentRes.data
        setAgent(
          agentBody && typeof agentBody === 'object' && 'data' in agentBody
            ? agentBody.data
            : agentBody,
        )
        const lBody = listingsRes.data
        setListings(Array.isArray(lBody) ? lBody : Array.isArray(lBody?.data) ? lBody.data : [])
      })
      .catch((error: unknown) => {
        logError('agentProfilePage.load', error)
        setError(
          t('agentProfilePage.loadError', {}, { defaultValue: 'Failed to load agent profile' }),
        )
      })
      .finally(() => setLoading(false))
  }, [http, id, t])

  if (loading) {
    return (
      <div className={cm.cn('bg-background text-on-background font-body')}>
        <AgentProfileTopNavBar />
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('px', 8),
            cm.sp('py', 10),
            cm.mxAuto,
            'max-w-screen-2xl lg:py-16',
          )}
          style={{ minHeight: 400 }}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              cm.h(12),
              cm.w(12),
              'animate-spin border-b-2 border-primary',
            )}
          />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className={cm.cn('bg-background text-on-background font-body')}>
        <AgentProfileTopNavBar />
        <main
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
            cm.sp('px', 8),
            cm.sp('py', 10),
            cm.mxAuto,
            'max-w-screen-2xl lg:py-16',
          )}
          style={{ minHeight: 400 }}
        >
          <p className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant')}>
            {error || t('agentProfilePage.notFound', {}, { defaultValue: 'Agent not found' })}
          </p>
          <Link
            to="/"
            className={cm.cn(
              'btn-gradient text-on-primary px-8 py-4 rounded-lg font-headline font-bold',
            )}
          >
            {t('agentProfilePage.browseAllAgents', {}, { defaultValue: 'Browse All Agents' })}
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        'bg-background text-on-background font-body selection:bg-primary-fixed selection:text-on-primary-fixed',
      )}
    >
      {/* TopNavBar */}
      <AgentProfileTopNavBar />
      <main
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), cm.mxAuto, 'max-w-screen-2xl lg:py-16')}
      >
        <AgentProfileHero agent={agent} />
        <AgentProfileStatsSection agent={agent} listingsCount={listings.length} />
        {/* Bio & Contact Flex Row */}
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-12 items-start mb-16')}
        >
          {/* Bio Section */}
          <AgentProfileBioSection agent={agent} />
          {/* Contact Form */}
          <AgentProfileContactForm agentId={id} />
        </div>
        {/* Active Listings Section */}
        <section className={cm.cn('mb-16')}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.textPrimary,
                  'font-headline font-extrabold tracking-tight',
                )}
              >
                {t('agentProfilePage.activeListings', {}, { defaultValue: 'Active Listings' })}
              </h2>
              <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'agentProfilePage.listingsSubtitle',
                  {
                    agentName:
                      agent.name ||
                      t('agentProfilePage.fallbackAgentName', {}, { defaultValue: 'this agent' }),
                  },
                  { defaultValue: 'Curated properties currently represented by {{agentName}}.' },
                )}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.fontWeight('bold'),
                'hidden md:flex text-secondary hover:underline underline-offset-4',
              )}
            >
              {t('agentProfilePage.viewAllGallery', {}, { defaultValue: 'View All Gallery' })}

              <span className={cm.cn('material-symbols-outlined')} data-icon="arrow_forward">
                arrow_forward
              </span>
            </button>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
            {listings.length > 0 ? (
              listings.map((listing) => (
                <Link key={listing.id} to={`/property/${listing.id}`} className={cm.cn('contents')}>
                  <AgentProfileListingCard listing={listing} />
                </Link>
              ))
            ) : (
              <p
                className={cm.cn(
                  cm.textCenter,
                  cm.sp('py', 12),
                  'col-span-3 text-on-surface-variant',
                )}
              >
                {t(
                  'agentProfilePage.noActiveListings',
                  {},
                  { defaultValue: 'No active listings at this time.' },
                )}
              </p>
            )}
          </div>
        </section>
      </main>
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default AgentProfilePage
export { AgentProfilePage, AgentProfilePage as AgentProfilePagePage }
