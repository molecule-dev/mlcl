import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'

interface HttpRes<T> {
  data?: T
}

interface Restaurant {
  id: string
  name: string
  cuisine: string
  rating: number
  review_count: number
  estimated_delivery_min: number
  minimum_order: number
  thumbnail_url: string | null
  distance?: { km: number }
  status: string
}

export function RestaurantsPage() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [cuisines, setCuisines] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null),
      )
    }
  }, [])

  // Fetch cuisines
  useEffect(() => {
    http
      .get<HttpRes<string[]> | string[]>('/api/restaurants/meta/cuisines')
      .then((res) => {
        const body = res.data
        const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
        setCuisines(list as string[])
      })
      .catch(() => setCuisines([]))
  }, [http])

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()

    if (searchQuery) params.set('q', searchQuery)
    if (cuisineFilter) params.set('cuisine', cuisineFilter)
    if (userLocation) {
      params.set('lat', String(userLocation.lat))
      params.set('lng', String(userLocation.lng))
    }

    try {
      const res = await http.get<HttpRes<Restaurant[]> | Restaurant[]>(
        `/api/restaurants?${params.toString()}`,
      )
      const body = res.data
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
      setRestaurants(list as Restaurant[])
    } catch (error) {
      logError('fetchRestaurants', error)
      setRestaurants([])
    } finally {
      setLoading(false)
    }
  }, [http, searchQuery, cuisineFilter, userLocation])

  useEffect(() => {
    fetchRestaurants()
  }, [fetchRestaurants])

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  return (
    <div data-mol-id="page-restaurants" className="restaurants-page">
      <section className="restaurants-hero">
        <h1>{t('restaurants.title', {}, { defaultValue: 'Restaurants near you' })}</h1>
        <p>
          {t(
            'restaurants.subtitle',
            {},
            { defaultValue: 'Order from your favorite local restaurants' },
          )}
        </p>

        <div className="restaurants-search">
          <input
            type="search"
            placeholder={t(
              'restaurants.searchPlaceholder',
              {},
              { defaultValue: 'Search restaurants or cuisines...' },
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('restaurants.searchLabel', {}, { defaultValue: 'Search restaurants' })}
          />
        </div>

        <div className="cuisine-filters">
          <button
            data-mol-id="button-all-cuisines"
            className={`cuisine-chip ${!cuisineFilter ? 'active' : ''}`}
            onClick={() => setCuisineFilter('')}
          >
            {t('status.all', {}, { defaultValue: 'All' })}
          </button>
          {cuisines.map((cuisine) => (
            <button
              data-mol-id="button-loading"
              key={cuisine}
              className={`cuisine-chip ${cuisineFilter === cuisine ? 'active' : ''}`}
              onClick={() => setCuisineFilter(cuisine)}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="loading">{t('common.loading', {}, { defaultValue: 'Loading...' })}</div>
      ) : restaurants.length === 0 ? (
        <div className="empty-state">
          <p>
            {t('restaurants.noResults', {}, { defaultValue: 'No restaurants found in your area' })}
          </p>
        </div>
      ) : (
        <div className={'restaurant-grid'}>
          {restaurants.map((restaurant) => (
            <a
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="restaurant-card"
            >
              <div className="restaurant-image">
                {restaurant.thumbnail_url ? (
                  <img src={restaurant.thumbnail_url} alt={restaurant.name} />
                ) : (
                  <div className="restaurant-image-placeholder" />
                )}
              </div>
              <div className="restaurant-info">
                <h3 className="restaurant-name">{restaurant.name}</h3>
                <span className="restaurant-cuisine">{restaurant.cuisine}</span>
                <div className="restaurant-meta">
                  <span className="restaurant-rating">
                    {restaurant.rating > 0 ? (
                      <>
                        <span className="star-icon" aria-hidden="true">
                          &#9733;
                        </span>
                        {restaurant.rating.toFixed(1)}
                        <span className="review-count">
                          (
                          {t(
                            'status.new',
                            { count: restaurant.review_count },
                            { defaultValue: `${restaurant.review_count}` },
                          )}
                          )
                        </span>
                      </>
                    ) : (
                      <span className="no-rating">
                        {t('restaurants.newRestaurant', {}, { defaultValue: 'New' })}
                      </span>
                    )}
                  </span>
                  <span className="restaurant-eta">
                    {t(
                      'restaurants.deliveryTime',
                      { min: restaurant.estimated_delivery_min },
                      { defaultValue: `${restaurant.estimated_delivery_min} min` },
                    )}
                  </span>
                  {restaurant.distance && (
                    <span className="restaurant-distance">
                      {formatDistance(restaurant.distance.km)}
                    </span>
                  )}
                </div>
                {restaurant.minimum_order > 0 && (
                  <span className="restaurant-minimum">
                    {t(
                      'restaurants.minimumOrder',
                      { amount: formatPrice(restaurant.minimum_order) },
                      { defaultValue: `Min. ${formatPrice(restaurant.minimum_order)}` },
                    )}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
