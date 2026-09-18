/**
 * Thin typed wrappers over the http client. Handlers return decorated
 * payloads (creator_name, backer_count, progress, days_left etc.) so
 * components can render directly without re-fetching joined data.
 *
 * Use via the hooks in `useCampaigns.ts`, `usePledges.ts`, etc.
 *
 * @module
 */

export interface ApiCampaign {
  id: string
  creator_id: string
  title: string
  description: string
  goal_amount: number
  raised_amount: number
  goal_cents: number
  pledged_cents: number
  start_date: string | null
  end_date: string
  status: 'draft' | 'active' | 'funded' | 'ended' | string
  category: string
  cover_image_url: string | null
  featured: boolean
  creator_name: string
  creator_initial: string
  backer_count: number
  progress: number
  days_left: number
  created_at: string
  updated_at: string
}

export interface ApiTier {
  id: string
  campaign_id: string
  title: string
  description: string
  amount: number
  price_cents: number
  max_backers: number | null
  current_backers: number
  estimated_delivery: string | null
  remaining: number | null
  created_at: string
  updated_at: string
}

export interface ApiCampaignDetail extends ApiCampaign {
  tiers: ApiTier[]
}

export interface ApiPledge {
  id: string
  campaign_id: string
  campaign_title: string
  campaign_status: string
  campaign_category: string
  campaign_pledged_cents: number
  campaign_goal_cents: number
  tier_id: string | null
  tier_title: string | null
  amount: number
  amount_cents: number
  status: 'active' | 'refunded' | 'fulfilled' | string
  payment_id: string | null
  fulfillment_status: 'preparing' | 'shipped' | 'delivered' | 'pending' | 'refunded'
  pledged_at: string
  created_at: string
  updated_at: string
  backer_id?: string
  backer_name?: string
  backer_email?: string | null
}

export interface ApiCampaignUpdate {
  id: string
  campaign_id: string
  author_id: string
  title: string
  body: string
  backers_only: boolean
  created_at: string
  updated_at: string
}

export interface ApiNotification {
  id: string
  kind: 'pledge_received' | 'pledge_made' | 'campaign_funded' | 'campaign_update'
  title: string
  body: string
  campaign_id: string
  campaign_title: string
  actor_name: string | null
  amount?: number
  read: boolean
  created_at: string
}

export interface ApiProfile {
  id: string
  name: string | null
  email: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
  preferences: Record<string, unknown>
  created_at: string | null
  campaigns_created: number
  campaigns_funded: number
  total_raised: number
  backer_count: number
  pledges_count: number
  total_pledged: number
}

export interface CampaignListParams {
  status?: string
  category?: string
  creator_id?: string
  sort?: 'trending' | 'ending_soon' | 'created_at'
  page?: number
  limit?: number
}

import type { HttpClient } from '@molecule/app-http'

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data
  return res as T
}

export const api = {
  listCampaigns: async (
    http: HttpClient,
    params: CampaignListParams = {},
  ): Promise<ApiCampaign[]> => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') qs.set(k, String(v))
    })
    return unwrap<ApiCampaign[]>(await http.get(`/api/campaigns?${qs}`))
  },
  searchCampaigns: async (
    http: HttpClient,
    q: string,
  ): Promise<{ hits: ApiCampaign[]; total?: number }> => {
    return unwrap<{ hits: ApiCampaign[]; total?: number }>(
      await http.get(`/api/campaigns/search?q=${encodeURIComponent(q)}`),
    )
  },
  myCampaigns: async (http: HttpClient): Promise<ApiCampaign[]> => {
    return unwrap<ApiCampaign[]>(await http.get(`/api/campaigns/mine`))
  },
  featuredCampaigns: async (http: HttpClient, limit = 6): Promise<ApiCampaign[]> => {
    return unwrap<ApiCampaign[]>(await http.get(`/api/campaigns/featured?limit=${limit}`))
  },
  campaignStats: async (
    http: HttpClient,
  ): Promise<{
    total_campaigns: number
    active_campaigns: number
    funded_campaigns: number
    total_raised: number
    total_backers: number
  }> => {
    return unwrap(await http.get(`/api/campaigns/stats`))
  },
  getCampaign: async (http: HttpClient, id: string): Promise<ApiCampaignDetail> => {
    return unwrap<ApiCampaignDetail>(await http.get(`/api/campaigns/${id}`))
  },
  createCampaign: async (
    http: HttpClient,
    input: {
      title: string
      description: string
      goal_amount: number
      end_date: string
      category: string
    },
  ): Promise<ApiCampaign> => {
    return unwrap<ApiCampaign>(await http.post(`/api/campaigns`, input))
  },
  updateCampaign: async (
    http: HttpClient,
    id: string,
    input: Partial<{
      title: string
      description: string
      goal_amount: number
      end_date: string
      category: string
    }>,
  ): Promise<ApiCampaign> => {
    return unwrap<ApiCampaign>(await http.put(`/api/campaigns/${id}`, input))
  },
  publishCampaign: async (http: HttpClient, id: string): Promise<ApiCampaign> => {
    return unwrap<ApiCampaign>(await http.post(`/api/campaigns/${id}/publish`, {}))
  },
  uploadCover: async (
    http: HttpClient,
    id: string,
    dataUrl: string,
  ): Promise<{ cover_image_url: string }> => {
    return unwrap(await http.post(`/api/campaigns/${id}/cover`, { image: dataUrl }))
  },

  listTiers: async (http: HttpClient, campaignId: string): Promise<ApiTier[]> => {
    return unwrap<ApiTier[]>(await http.get(`/api/tiers/campaign/${campaignId}`))
  },
  createTier: async (
    http: HttpClient,
    input: {
      campaign_id: string
      title: string
      description: string
      amount: number
      max_backers?: number | null
      estimated_delivery?: string | null
    },
  ): Promise<ApiTier> => {
    return unwrap<ApiTier>(await http.post(`/api/tiers`, input))
  },
  updateTier: async (
    http: HttpClient,
    id: string,
    input: Partial<{
      title: string
      description: string
      amount: number
      max_backers: number | null
      estimated_delivery: string | null
    }>,
  ): Promise<ApiTier> => {
    return unwrap<ApiTier>(await http.put(`/api/tiers/${id}`, input))
  },
  deleteTier: async (http: HttpClient, id: string): Promise<void> => {
    await http.delete(`/api/tiers/${id}`)
  },

  myPledges: async (http: HttpClient): Promise<ApiPledge[]> => {
    return unwrap<ApiPledge[]>(await http.get(`/api/pledges/my`))
  },
  campaignPledges: async (http: HttpClient, campaignId: string): Promise<ApiPledge[]> => {
    return unwrap<ApiPledge[]>(await http.get(`/api/pledges/campaign/${campaignId}`))
  },
  createPledge: async (
    http: HttpClient,
    input: { campaign_id: string; tier_id: string | null; amount: number; payment_method: string },
  ): Promise<ApiPledge & { payment_intent_id?: string; payment_intent_status?: string }> => {
    return unwrap(await http.post(`/api/pledges`, input))
  },
  cancelPledge: async (http: HttpClient, id: string): Promise<ApiPledge> => {
    return unwrap<ApiPledge>(await http.post(`/api/pledges/${id}/cancel`, {}))
  },

  listUpdates: async (http: HttpClient, campaignId: string): Promise<ApiCampaignUpdate[]> => {
    return unwrap<ApiCampaignUpdate[]>(await http.get(`/api/updates/campaign/${campaignId}`))
  },
  postUpdate: async (
    http: HttpClient,
    input: { campaign_id: string; title: string; body: string; backers_only?: boolean },
  ): Promise<ApiCampaignUpdate> => {
    return unwrap<ApiCampaignUpdate>(await http.post(`/api/updates`, input))
  },

  listNotifications: async (
    http: HttpClient,
  ): Promise<{ notifications: ApiNotification[]; unread_count: number }> => {
    return unwrap(await http.get(`/api/notifications`))
  },
  markNotificationsRead: async (http: HttpClient): Promise<void> => {
    await http.post(`/api/notifications/mark-read`, {})
  },

  getMyProfile: async (http: HttpClient): Promise<ApiProfile> => {
    return unwrap<ApiProfile>(await http.get(`/api/profiles/me`))
  },
  updateMyProfile: async (
    http: HttpClient,
    input: Partial<{
      name: string
      username: string
      bio: string
      avatar_url: string
      preferences: Record<string, unknown>
    }>,
  ): Promise<ApiProfile> => {
    return unwrap<ApiProfile>(await http.patch(`/api/profiles/me`, input))
  },
  getProfile: async (
    http: HttpClient,
    userId: string,
  ): Promise<
    ApiProfile & {
      campaigns: ApiCampaign[]
      backed_campaigns: ApiPledge[]
      stats: {
        campaigns_created: number
        campaigns_funded: number
        total_raised: number
        backed_count: number
      }
    }
  > => {
    return unwrap(await http.get(`/api/profiles/${userId}`))
  },
}

export function toCardData(c: ApiCampaign): {
  id: string
  title: string
  category: string
  cover_image_url: string
  creator_name: string
  pledged_cents: number
  goal_cents: number
  backer_count: number
  days_left: number
} {
  return {
    id: c.id,
    title: c.title,
    category: c.category || 'general',
    cover_image_url: c.cover_image_url ?? '',
    creator_name: c.creator_name,
    pledged_cents: c.pledged_cents,
    goal_cents: c.goal_cents,
    backer_count: c.backer_count,
    days_left: c.days_left,
  }
}
