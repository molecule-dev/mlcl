/** Public agent profile shape used across marketing / profile pages. */
export type PublicAgentProfile = {
  name?: string
  bio?: string
  photo?: string
  avatar?: string
  image?: string
  badge?: string
  title?: string
  location?: string
  phone?: string
  email?: string
  stats?: {
    totalListings?: number
    salesThisYear?: number
    avgSalePrice?: string | number
    yearsExperience?: number
  }
  listingsCount?: number
  salesThisYear?: number
  avgSalePrice?: string | number
  yearsExperience?: number
  experience?: number
}

/** Listing card / search result summary (API fields vary). */
export type PublicListingSummary = {
  id?: string
  price?: string | number
  address?: string
  title?: string
  name?: string
  city?: string
  state?: string
  neighborhood?: string
  location?: string
  bedrooms?: number
  beds?: number
  bathrooms?: number
  baths?: number
  squareFeet?: number
  sqft?: number
  area?: number
  photos?: string[]
  image?: string
  photo?: string
  thumbnail?: string
}
