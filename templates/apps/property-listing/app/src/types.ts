export interface Lead {
  id: string
  initials: string
  name: string
  email: string
  propertyName: string
  propertyLocation: string
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost'
  lastContact: string
  avatarBgClass: string
  statusColorClass: string
  isInactive: boolean
}

export interface Listing {
  id: string
  imageUrl: string
  imageAlt: string
  price: string
  status: string
  name: string
  address: string
  beds: number
  baths: number
  sqft: number
}

export interface Showing {
  id: string
  month: string
  day: string
  address: string
  time: string
  client: string
  isHighlighted: boolean
}

export interface AgentDashboardKpiCardProps {
  title: string
  value: string
  trendLabel: string
  trendIcon: string
  trendColorClass: string
}

export interface TopPerformingListing {
  id: string
  imageUrl: string
  imageAlt: string
  name: string
  address: string
  views: string
  leads: string
  status: 'Active' | 'Pending' | 'Sold'
  statusBgClass: string
  statusTextClass: string
}
