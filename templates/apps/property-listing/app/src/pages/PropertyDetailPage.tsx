import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import PropertyAgentCard from '../components/PropertyAgentCard.js'
import PropertyBottomNavBar from '../components/PropertyBottomNavBar.js'
import PropertyFeaturesSection from '../components/PropertyFeaturesSection.js'
import PropertyImageGallery from '../components/PropertyImageGallery.js'
import PropertyMortgageCalculator from '../components/PropertyMortgageCalculator.js'
import PropertySpecsRow from '../components/PropertySpecsRow.js'
import PropertyTopAppBar from '../components/PropertyTopAppBar.js'

interface Property {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  year_built: number
  property_type: string
  photos: string[]
  features: string[]
  status: string
  agent_id: string
}
interface Agent {
  id: string
  name: string
  title: string
  phone: string
  photo: string
}
interface MortgageResult {
  monthly_payment: number
  principal_and_interest: number
  property_tax: number
  insurance: number
}
interface MortgageInputs {
  down_payment_percent: number
  interest_rate: number
  loan_term_years: number
}
function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function PropertyDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [property, setProperty] = useState<Property | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [mortgage, setMortgage] = useState<MortgageResult | null>(null)
  const [mortgageInputs, setMortgageInputs] = useState<MortgageInputs>({
    down_payment_percent: 20,
    interest_rate: 6.5,
    loan_term_years: 30,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    http
      .get<Property | Property[] | { data: Property }>(`/api/properties/${id}`)
      .then((res) => {
        const body = res.data
        const prop = Array.isArray(body) ? body[0] : body && 'data' in body ? body.data : body
        setProperty(prop ?? null)
        if (prop?.agent_id) {
          http
            .get<Agent | { data: Agent }>(`/api/agents/${prop.agent_id}`)
            .then((r) => {
              const agentBody = r.data
              setAgent(agentBody && 'data' in agentBody ? agentBody.data : agentBody)
            })
            .catch((error: unknown) => {
              // The agent card is progressive enhancement — the property page
              // still renders fully without it, so log and move on.
              logError('propertyDetail.agentLoad', error)
            })
        }
      })
      .catch((error: unknown) => {
        logError('propertyDetail.load', error)
        setError(t('propertyDetail.errorLoad', {}, { defaultValue: 'Failed to load property' }))
      })
      .finally(() => setLoading(false))
  }, [http, id, t])
  useEffect(() => {
    if (!property) return
    http
      .post<MortgageResult | { data: MortgageResult }>('/api/mortgage/calculate', {
        home_price: Number(property.price),
        ...mortgageInputs,
      })
      .then((r) => {
        const body = r.data
        setMortgage(body && 'data' in body ? body.data : body)
      })
      .catch((error: unknown) => {
        // The mortgage estimate is a nice-to-have widget; a failed calculation
        // must not break the property page, so log and keep the previous value.
        logError('propertyDetail.mortgageCalculate', error)
      })
  }, [http, property, mortgageInputs])
  if (loading)
    return (
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'py-20')}>
        <div
          className={cm.cn(
            cm.roundedFull,
            cm.w(12),
            cm.h(12),
            'animate-spin border-b-2 border-primary',
          )}
        />
      </div>
    )
  if (error || !property)
    return (
      <div className={cm.cn('bg-background text-on-surface antialiased')}>
        <PropertyTopAppBar />
        <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'max-w-7xl', 'pt-24 pb-20')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-error-container text-on-error-container rounded-2xl',
            )}
          >
            {error ?? t('propertyDetail.notFound', {}, { defaultValue: 'Property not found' })}
          </div>
        </main>
        <PropertyBottomNavBar />
      </div>
    )
  return (
    <div className={cm.cn('bg-background text-on-surface antialiased')}>
      {/* TopAppBar */}
      <PropertyTopAppBar />
      <main className={cm.cn(cm.mxAuto, cm.sp('px', 6), 'max-w-7xl', 'pt-24 pb-20')}>
        <PropertyImageGallery
          photos={property.photos ?? []}
          title={property.title}
          price={property.price}
        />
        {/* Content Grid */}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-12')}>
          {/* Left Column (65%) */}
          <div className={cm.cn(cm.stack(8), 'md:col-span-8')} data-mol-id="property-details">
            <div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 4))}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'bg-primary text-on-primary rounded-md uppercase tracking-widest',
                  )}
                >
                  {property.property_type}
                </span>
                {property.status && (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'bg-tertiary text-on-tertiary rounded-md uppercase tracking-widest',
                    )}
                  >
                    {property.status}
                  </span>
                )}
              </div>
              <h1
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.sp('mb', 2),
                  'md:text-5xl font-extrabold text-on-surface tracking-tight',
                )}
              >
                {property.title || property.address}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {property.city}, {property.state} {property.zip_code}
              </p>
              <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'baseline', gap: 'md' }))}>
                <span
                  className={cm.cn(cm.textSize('4xl'), 'font-extrabold text-primary-container')}
                >
                  {fmtPrice(property.price)}
                </span>
              </div>
            </div>
            {/* Specs Row */}
            <PropertySpecsRow
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              squareFeet={property.square_feet}
              yearBuilt={property.year_built}
            />
            {/* Description */}
            <section>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 3),
                  cm.flex({ align: 'center', gap: 'sm' }),
                )}
              >
                <span className={cm.cn(cm.w(8), cm.h(1), cm.roundedFull, 'bg-primary')}></span>

                {t('form.description', {}, { defaultValue: 'Description' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant leading-relaxed')}>
                {property.description}
              </p>
            </section>
            {/* Features Grid */}
            <PropertyFeaturesSection features={property.features ?? []} />
            {/* Schools Section */}
            <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-high rounded-3xl')}>
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
                {t('propertyDetail.schoolDistrict', {}, { defaultValue: 'School District' })}
              </h2>
              <div className={cm.stack(4)}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('pb', 4),
                    'border-b border-outline-variant/30',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
                      {t(
                        'propertyDetail.schoolElementary',
                        {},
                        { defaultValue: 'West Hills Elementary' },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'propertyDetail.schoolMeta',
                        { grades: 'K-5', distance: '0.4 mi' },
                        { defaultValue: 'Grades: {{grades}} • Distance: {{distance}}' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xl'),
                      'bg-primary rounded-lg text-on-primary',
                    )}
                  >
                    {t(
                      'propertyDetail.schoolRating',
                      { score: 9, total: 10 },
                      { defaultValue: '{{score}}/{{total}}' },
                    )}
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('pb', 4),
                    'border-b border-outline-variant/30',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
                      {t('propertyDetail.schoolHigh', {}, { defaultValue: 'Lincoln High School' })}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'propertyDetail.schoolMeta',
                        { grades: '9-12', distance: '1.2 mi' },
                        { defaultValue: 'Grades: {{grades}} • Distance: {{distance}}' },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xl'),
                      'bg-primary rounded-lg text-on-primary',
                    )}
                  >
                    {t(
                      'propertyDetail.schoolRating',
                      { score: 8, total: 10 },
                      { defaultValue: '{{score}}/{{total}}' },
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
          {/* Right Column Sidebar (35%) */}
          <div className={cm.cn('md:col-span-4')} data-mol-id="sidebar-container">
            <div className={cm.cn(cm.stack(6), 'sticky top-28')}>
              {/* Agent Card */}
              <PropertyAgentCard agent={agent} />
              <PropertyMortgageCalculator
                mortgage={mortgage}
                mortgageInputs={mortgageInputs}
                onInputChange={setMortgageInputs}
              />
            </div>
          </div>
        </div>
        {/* Map Section */}
        <section className={cm.sp('mt', 12)} data-mol-id="map-section">
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('propertyDetail.locationTitle', {}, { defaultValue: 'Location & Neighborhood' })}
          </h2>
          <div
            className={cm.cn(
              cm.w('full'),
              'h-[450px] rounded-3xl overflow-hidden relative grayscale-[0.3] hover:grayscale-0 transition-all duration-700',
            )}
          >
            <img
              alt={t('propertyDetail.mapAlt', {}, { defaultValue: 'Map View' })}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="clean overhead minimalist city map view of Portland Oregon showing lush green grids and urban planning"
              data-location="Portland, OR 97201"
              src="https://picsum.photos/seed/PropertyDetailPage-1/1200/800"
            />
            <div className={cm.cn('absolute inset-0 bg-primary/5 pointer-events-none')}></div>
            {/* Glassmorphism Floating Map UI */}
            <div
              className={cm.cn(
                cm.sp('p', 4),
                cm.maxW('xs'),
                'absolute bottom-6 left-6 bg-surface/70 backdrop-blur-xl rounded-2xl shadow-xl border border-surface/20',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 2))}>
                <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>
                  location_on
                </span>
                <p className={cm.fontWeight('bold')}>{property.address || property.title}</p>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'propertyDetail.walkScore',
                  { neighborhood: 'Southwest Hills', score: 84, rating: 'Very Walkable' },
                  {
                    defaultValue:
                      '{{neighborhood}} Neighborhood. Walk Score: {{score}} ({{rating}})',
                  },
                )}
              </p>
            </div>
          </div>
        </section>
      </main>
      <PropertyBottomNavBar />
    </div>
  )
}

export default PropertyDetailPage
export { PropertyDetailPage, PropertyDetailPage as PropertyDetailPagePage }
