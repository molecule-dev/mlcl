/** Domain types shared by the donor-management pages — mirror the API's
 *  shaped payloads (api/src/handlers/_shape.ts) and api/fixtures/*.json.
 *  Money is integer cents end-to-end. */

export interface Donor {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  is_organization: boolean
  tags: string[]
  created_at: string
  lifetime_cents: number
  gift_count: number
  first_gifted_at: string | null
  last_gift_at: string | null
}

export interface Campaign {
  id: string
  name: string
  description: string
  goal_cents: number
  starts_on: string | null
  ends_on: string | null
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  raised_cents: number
  gift_count: number
}

export interface Gift {
  id: string
  donor_id: string
  donor_name: string
  amount_cents: number
  gift_date: string
  method: 'check' | 'card' | 'cash' | 'ach'
  fund: 'general' | 'programs' | 'equipment' | 'capital' | 'endowment'
  campaign_id: string | null
  campaign_name: string | null
  receipt_id: string | null
  receipted: boolean
  note: string
  created_at: string
}

export interface Receipt {
  id: string
  donor_id: string
  donor_name: string
  year: number
  receipt_number: string
  total_cents: number
  issued_at: string
}

export interface ReceiptItem {
  id: string
  gift_id: string
  gift_date: string
  amount_cents: number
  fund: string
  method: string
}

export interface ReceiptDetail extends Receipt {
  donor: {
    id: string
    name: string
    email: string | null
    address: string | null
    is_organization: boolean
  } | null
  items: ReceiptItem[]
}

export interface DonorNote {
  id: string
  donor_id: string
  author: string
  body: string
  created_at: string
}

/** Donor detail payload = the list shape + giving history + notes. */
export interface DonorDetail extends Donor {
  gifts: Gift[]
  notes: DonorNote[]
}

export interface DashboardSummary {
  year: number
  raised_ytd_cents: number
  donor_count: number
  gifts_ytd: number
  avg_gift_cents: number
  recent_gifts: Gift[]
  campaigns: Campaign[]
}

export interface ReceiptPreview {
  donor_id: string
  donor_name: string
  year: number
  gift_count: number
  total_cents: number
  gifts: Gift[]
}
