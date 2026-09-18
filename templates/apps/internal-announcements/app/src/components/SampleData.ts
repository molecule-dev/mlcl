/**
 * Centralized sample data for the Herald polish.
 *
 * All routes share the same fictional company ("Northwind Labs") so the
 * screenshots tell one cohesive story across Feed, Detail, Composer,
 * MyAcks, Analytics, Notifications, Search, TeamDirectory, Profile, and
 * Settings.
 *
 * Replace with real `/api/announcements` calls once the backend is wired.
 */
import { APP_NAME } from '../branding.js'
import type { AnnouncementCardData } from './AnnouncementCard.js'
import type { AnnouncementPriority } from './PriorityPill.js'

export interface ChannelSummary {
  slug: string
  name: string
  description: string
  color: string
  icon: string
  members: number
  unread: number
}

export const COMPANY_NAME = 'Northwind Labs'

export const CHANNELS: ChannelSummary[] = [
  {
    slug: 'company',
    name: 'company',
    description: 'Town halls, exec memos, and the announcements every team needs to read.',
    color: '#4f46e5',
    icon: 'apartment',
    members: 412,
    unread: 3,
  },
  {
    slug: 'product',
    name: 'product',
    description: 'Launch notes, RFC summaries, and shipping calendar updates.',
    color: '#0e7490',
    icon: 'lightbulb',
    members: 168,
    unread: 1,
  },
  {
    slug: 'people',
    name: 'people',
    description: 'New hires, role changes, benefits updates, and people-ops memos.',
    color: '#7c3aed',
    icon: 'volunteer_activism',
    members: 412,
    unread: 0,
  },
  {
    slug: 'security',
    name: 'security',
    description: 'Required reading: security incidents, policy updates, training reminders.',
    color: '#b91c1c',
    icon: 'shield',
    members: 412,
    unread: 2,
  },
  {
    slug: 'culture',
    name: 'culture',
    description: 'Wins, anniversaries, off-sites — the room where we cheer.',
    color: '#b45309',
    icon: 'celebration',
    members: 412,
    unread: 0,
  },
  {
    slug: 'remote',
    name: 'remote',
    description: 'Distributed-team rituals, time-zone tips, in-person meetup planning.',
    color: '#047857',
    icon: 'home_work',
    members: 264,
    unread: 0,
  },
]

export const SAMPLE_FEED: AnnouncementCardData[] = [
  {
    id: 'a-1',
    title: 'Q3 town hall recap — five commitments before October planning',
    body: 'Two-thirds of the company joined live last Thursday. The recap below summarizes the five commitments we made and the metrics we will track on the dashboard between now and our October planning offsite. Please read end-to-end and acknowledge so we know it landed.',
    author: { name: 'Adaeze Onuoha', role: 'CEO', isAdmin: true },
    channel: { slug: 'company', name: 'company', color: '#4f46e5' },
    priority: 'pinned',
    publishedAt: 'Today · 9:14 AM',
    acknowledged: 287,
    ackTotal: 412,
    commentCount: 38,
    viewCount: 364,
    unread: true,
  },
  {
    id: 'a-2',
    title: 'Required: Q3 security awareness module due Friday',
    body: 'A 12-minute module covering phishing patterns we observed in August, MFA hygiene, and the new shared-device guidance from the IT team. Required for everyone with access to production systems — completion is checked from your SSO profile, no extra steps.',
    author: { name: 'Renata Bauer', role: 'CISO', isAdmin: true },
    channel: { slug: 'security', name: 'security', color: '#b91c1c' },
    priority: 'urgent',
    publishedAt: 'Today · 7:42 AM',
    acknowledged: 198,
    ackTotal: 412,
    commentCount: 6,
    viewCount: 224,
    unread: true,
  },
  {
    id: 'a-3',
    title: 'Welcome Mira Kowalski (Design) and three more joining Engineering',
    body: 'Four new colleagues started this morning. Mira is joining Brand & Marketing as Lead Designer; Jovan, Hana, and Amir are joining the Storage Reliability squad. Slack handles, headshots, and onboarding-buddy assignments are in the thread.',
    author: { name: 'Sasha Patel', role: 'Head of People' },
    channel: { slug: 'people', name: 'people', color: '#7c3aed' },
    priority: 'normal',
    publishedAt: 'Yesterday · 4:20 PM',
    acknowledged: 268,
    ackTotal: 412,
    commentCount: 14,
    viewCount: 311,
  },
  {
    id: 'a-4',
    title: 'Northwind 4.6 ships next Wednesday — what changes for support',
    body: 'Release notes are attached. Three things to watch for in support: (1) the new project-export endpoint is rate-limited per workspace; (2) the legacy CSV importer is removed — point customers to the new Studio importer; (3) saved-views are now per-workspace, not per-user.',
    author: { name: 'Devon Akinola', role: 'Eng Lead, Studio' },
    channel: { slug: 'product', name: 'product', color: '#0e7490' },
    priority: 'normal',
    publishedAt: '2 days ago',
    acknowledged: 142,
    ackTotal: 168,
    commentCount: 22,
    viewCount: 186,
    hasAcknowledged: true,
  },
  {
    id: 'a-5',
    title: 'August anniversary list — twenty-three teammates and counting',
    body: 'Twenty-three teammates hit a Northwind anniversary in August, including Kenji Watanabe (8 years!) and our first-anniversary class of 2024 hires. Drop a note in #culture or send a card via the People-Ops portal — small gestures, big signal.',
    author: { name: 'Sasha Patel', role: 'Head of People' },
    channel: { slug: 'culture', name: 'culture', color: '#b45309' },
    priority: 'fyi',
    publishedAt: '3 days ago',
    acknowledged: 0,
    ackTotal: 0,
    commentCount: 41,
    viewCount: 287,
  },
  {
    id: 'a-6',
    title: 'Distributed offsite — Lisbon Oct 14-17, RSVPs by Sept 24',
    body: 'Our second distributed offsite is locked: Lisbon, Oct 14-17. Travel reimbursements are pre-approved. RSVP via the People-Ops portal by Sept 24 so we can confirm the workshop rooms and family-track logistics.',
    author: { name: 'Lourdes Vega', role: 'Operations' },
    channel: { slug: 'remote', name: 'remote', color: '#047857' },
    priority: 'normal',
    publishedAt: '4 days ago',
    acknowledged: 188,
    ackTotal: 264,
    commentCount: 17,
    viewCount: 219,
  },
]

export interface ThreadComment {
  id: string
  author: { name: string; role?: string; isAdmin?: boolean }
  body: string
  timestamp: string
  replies?: ThreadComment[]
}

export const SAMPLE_DETAIL_COMMENTS: ThreadComment[] = [
  {
    id: 'c-1',
    author: { name: 'Devon Akinola', role: 'Eng Lead, Studio' },
    timestamp: '2h',
    body: 'Thanks for putting this together — the clarity on the storage SLA commitment is the part Studio Ops will lean on most. Happy to demo the new dashboards in our Tuesday eng-leads sync.',
    replies: [
      {
        id: 'c-1-1',
        author: { name: 'Adaeze Onuoha', role: 'CEO', isAdmin: true },
        timestamp: '1h',
        body: 'Yes please — let’s slot it in for 30 min. I’ll bring the Q3 forecast.',
      },
    ],
  },
  {
    id: 'c-2',
    author: { name: 'Hana Yusuf', role: 'Senior PM' },
    timestamp: '5h',
    body: 'Can we publish the metric definitions in the wiki this week? The "active workspace" definition is still being interpreted differently by Sales and Eng, and I’d rather lock it before October planning.',
  },
  {
    id: 'c-3',
    author: { name: 'Renata Bauer', role: 'CISO', isAdmin: true },
    timestamp: '6h',
    body: 'Reminder: the security commitment listed here pairs with the Q3 awareness module — please complete it by Friday so we can close that thread.',
  },
]

export interface NotificationItem {
  id: string
  kind: 'mention' | 'reply' | 'ack' | 'channel' | 'system'
  actor: string
  announcement: string
  announcementId: string
  context: string
  timestamp: string
  unread: boolean
}

export const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    kind: 'mention',
    actor: 'Hana Yusuf',
    announcement: 'Q3 town hall recap — five commitments',
    announcementId: 'a-1',
    context: '"@you mentioned the storage SLA — pulling you into this thread before Tuesday."',
    timestamp: '12m',
    unread: true,
  },
  {
    id: 'n-2',
    kind: 'ack',
    actor: 'Renata Bauer',
    announcement: 'Required: Q3 security awareness module due Friday',
    announcementId: 'a-2',
    context: 'Acknowledgments rolling in — 198/412 so far. Nudges scheduled for Wed AM.',
    timestamp: '1h',
    unread: true,
  },
  {
    id: 'n-3',
    kind: 'reply',
    actor: 'Devon Akinola',
    announcement: 'Northwind 4.6 ships next Wednesday',
    announcementId: 'a-4',
    context:
      '"Replying re: rate-limit defaults — we should bump the per-workspace cap before launch."',
    timestamp: '4h',
    unread: false,
  },
  {
    id: 'n-4',
    kind: 'channel',
    actor: 'Lourdes Vega',
    announcement: 'Lisbon offsite logistics',
    announcementId: 'a-6',
    context: 'New post in #remote about hotel block deadlines.',
    timestamp: '1d',
    unread: false,
  },
  {
    id: 'n-5',
    kind: 'system',
    actor: APP_NAME,
    announcement: 'Weekly digest',
    announcementId: 'a-1',
    context: 'Your Monday digest is ready: 6 announcements, 3 still unacked.',
    timestamp: '2d',
    unread: false,
  },
]

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  location: string
  isAdmin?: boolean
}

export const SAMPLE_TEAM: TeamMember[] = [
  {
    id: 't-1',
    name: 'Adaeze Onuoha',
    role: 'Chief Executive Officer',
    department: 'Executive',
    location: 'Lagos',
    isAdmin: true,
  },
  {
    id: 't-2',
    name: 'Renata Bauer',
    role: 'Chief Information Security Officer',
    department: 'Security',
    location: 'Berlin',
    isAdmin: true,
  },
  {
    id: 't-3',
    name: 'Sasha Patel',
    role: 'Head of People',
    department: 'People Ops',
    location: 'Toronto',
    isAdmin: true,
  },
  {
    id: 't-4',
    name: 'Devon Akinola',
    role: 'Eng Lead, Studio',
    department: 'Engineering',
    location: 'Atlanta',
  },
  { id: 't-5', name: 'Hana Yusuf', role: 'Senior PM', department: 'Product', location: 'Istanbul' },
  {
    id: 't-6',
    name: 'Mira Kowalski',
    role: 'Lead Designer',
    department: 'Brand & Marketing',
    location: 'Warsaw',
  },
  {
    id: 't-7',
    name: 'Lourdes Vega',
    role: 'Operations',
    department: 'Operations',
    location: 'Mexico City',
  },
  {
    id: 't-8',
    name: 'Kenji Watanabe',
    role: 'Staff Engineer',
    department: 'Engineering',
    location: 'Tokyo',
  },
  { id: 't-9', name: 'Amir Sharif', role: 'SRE', department: 'Engineering', location: 'Dubai' },
  {
    id: 't-10',
    name: 'Jovan Petrov',
    role: 'Backend Engineer',
    department: 'Engineering',
    location: 'Belgrade',
  },
]

export interface SearchSnippet {
  id: string
  type: 'announcement' | 'person' | 'channel'
  title: string
  snippet: string
  meta: string
  href: string
}

export const SAMPLE_SEARCH: Record<string, SearchSnippet[]> = {
  Today: [
    {
      id: 's-1',
      type: 'announcement',
      title: 'Q3 town hall recap — five commitments before October planning',
      snippet:
        'Two-thirds of the company joined live last Thursday. The recap below summarizes the five <mark>commitments</mark> we made…',
      meta: 'Adaeze Onuoha · #company · 9:14 AM',
      href: '/announcement/a-1',
    },
    {
      id: 's-2',
      type: 'announcement',
      title: 'Required: Q3 security awareness module due Friday',
      snippet:
        'A 12-minute module covering phishing patterns we observed in August, <mark>MFA</mark> hygiene…',
      meta: 'Renata Bauer · #security · 7:42 AM',
      href: '/announcement/a-2',
    },
  ],
  'This week': [
    {
      id: 's-3',
      type: 'person',
      title: 'Mira Kowalski',
      snippet: 'Lead Designer · Brand & Marketing · Warsaw — joined this week',
      meta: 'People',
      href: '/people',
    },
    {
      id: 's-4',
      type: 'channel',
      title: '#product',
      snippet: 'Launch notes, RFC summaries, and shipping calendar updates.',
      meta: '168 members · 1 unread',
      href: '/feed?channel=product',
    },
  ],
  Earlier: [
    {
      id: 's-5',
      type: 'announcement',
      title: 'August anniversary list — twenty-three teammates and counting',
      snippet:
        'Twenty-three teammates hit a Northwind <mark>anniversary</mark> in August, including Kenji Watanabe (8 years!)…',
      meta: 'Sasha Patel · #culture · 3 days ago',
      href: '/announcement/a-5',
    },
  ],
}

export const ANALYTICS_SUMMARY: Array<{
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'flat'
  accent: AnnouncementPriority
}> = [
  { label: 'Reach', value: '364', delta: '+12% wow', trend: 'up', accent: 'normal' },
  { label: 'Acknowledged', value: '287 / 412', delta: '70% rate', trend: 'up', accent: 'normal' },
  {
    label: 'Median time-to-ack',
    value: '4h 12m',
    delta: '-38m wow',
    trend: 'up',
    accent: 'normal',
  },
  {
    label: 'Open comment threads',
    value: '14',
    delta: '3 awaiting reply',
    trend: 'flat',
    accent: 'pinned',
  },
]
