/**
 * Demo data for the Crate subscription-box flagship template.
 *
 * Wired into pages until backend fixtures land. Each page is also
 * annotated with a `// TODO: replace with /api/<endpoint>` comment so
 * the endpoint contract is discoverable.
 */

import type { BoxTheme } from '../components/BoxThemeCard.js'
import type { ShipmentStep } from '../components/ShipmentTimeline.js'
import type { TierPlan } from '../components/TierPlanCard.js'

export interface CurrentSubscription {
  id: string
  tier: 'curator' | 'collector' | 'connoisseur'
  tierLabel: string
  status: 'active' | 'paused' | 'processing'
  shipsInDays: number
  shipDate: string
  nextBoxTitle: string
  nextBoxTagline: string
  itemCount: number
  monthlyPriceLabel: string
  renewalDate: string
}

export interface ShipmentSummary {
  id: string
  boxName: string
  shippedDate: string
  status: 'delivered' | 'in_transit' | 'processing'
  trackingNumber?: string
  itemPreview: string[]
}

export interface InvoiceRow {
  id: string
  date: string
  description: string
  amountLabel: string
  status: 'paid' | 'refunded' | 'failed'
}

export const currentSubscription: CurrentSubscription = {
  id: 'sub_01',
  tier: 'collector',
  tierLabel: 'Collector',
  status: 'active',
  shipsInDays: 9,
  shipDate: 'Apr 9',
  nextBoxTitle: 'The Hearth & Heirloom edition',
  nextBoxTagline:
    'Slow-living rituals from artisans across the Pacific Northwest — hand-poured candles, indigo-dyed linens, and a small-batch sipping syrup.',
  itemCount: 7,
  monthlyPriceLabel: '$48',
  renewalDate: 'May 9, 2026',
}

export const boxThemes: BoxTheme[] = [
  {
    id: 'box-hearth-heirloom',
    slug: 'hearth-heirloom',
    name: 'Hearth & Heirloom',
    tagline: 'Slow-living rituals — candles, linens, and a sipping syrup.',
    imageUrl: 'https://picsum.photos/seed/trove-hearth/1200/900',
    imageAlt:
      'A flat-lay of candles, folded indigo linens, and a small amber bottle on weathered wood.',
    retailValueLabel: '$112',
    monthlyPriceLabel: '$48',
    itemCount: 7,
    badge: 'new',
    status: 'subscribed',
  },
  {
    id: 'box-coastal-craft',
    slug: 'coastal-craft',
    name: 'Coastal Craft',
    tagline: 'Sea-salt soaks, kelp ceramics, and a journal of tide poetry.',
    imageUrl: 'https://picsum.photos/seed/trove-coastal/1200/900',
    imageAlt: 'Beachy ceramics, a soft-cover journal, and bath salts arranged on linen.',
    retailValueLabel: '$98',
    monthlyPriceLabel: '$42',
    itemCount: 6,
    badge: null,
    status: 'available',
  },
  {
    id: 'box-midnight-pages',
    slug: 'midnight-pages',
    name: 'Midnight Pages',
    tagline: 'A signed novella, an inkwell, and stationery for letter-writing.',
    imageUrl: 'https://picsum.photos/seed/trove-midnight/1200/900',
    imageAlt: 'A novella, fountain pen, and stack of cream stationery on a navy desk.',
    retailValueLabel: '$84',
    monthlyPriceLabel: '$36',
    itemCount: 5,
    badge: 'limited',
    status: 'available',
  },
  {
    id: 'box-garden-table',
    slug: 'garden-table',
    name: 'Garden Table',
    tagline: 'Heirloom seeds, a chef-grade infusion oil, and tasting notes.',
    imageUrl: 'https://picsum.photos/seed/trove-garden/1200/900',
    imageAlt: 'Seed packets, an oil bottle, and tasting notes scattered on a wood cutting board.',
    retailValueLabel: '$76',
    monthlyPriceLabel: '$32',
    itemCount: 5,
    badge: null,
    status: 'available',
  },
  {
    id: 'box-studio-staples',
    slug: 'studio-staples',
    name: 'Studio Staples',
    tagline: 'Pigments, sketchbooks, and a printed essay from a working artist.',
    imageUrl: 'https://picsum.photos/seed/trove-studio/1200/900',
    imageAlt: 'A sketchbook, brushes, and pigment jars on a paint-streaked palette.',
    retailValueLabel: '$92',
    monthlyPriceLabel: '$38',
    itemCount: 6,
    badge: null,
    status: 'available',
  },
  {
    id: 'box-low-country',
    slug: 'low-country',
    name: 'Low Country Pantry',
    tagline: 'Stone-ground grits, wildflower honey, and a hand-thrown bowl.',
    imageUrl: 'https://picsum.photos/seed/trove-lowcountry/1200/900',
    imageAlt: 'A small ceramic bowl with grains, a honey jar, and a wooden spoon.',
    retailValueLabel: '$104',
    monthlyPriceLabel: '$44',
    itemCount: 6,
    badge: null,
    status: 'sold_out',
  },
]

export const tierPlans: TierPlan[] = [
  {
    id: 'tier-curator',
    name: 'Curator',
    tagline: 'A monthly taste of Crate — 4 to 5 hand-picked items.',
    monthlyPriceLabel: '$32',
    annualPriceLabel: '$320',
    annualSavingsLabel: '$64',
    cadenceUnitLabel: 'box',
    features: [
      '4–5 curated items each month',
      'Free shipping in the continental US',
      'Skip a box anytime — no penalty',
      'Members-only seasonal previews',
    ],
    ctaKey: 'tierPlanCard.cta.curator',
    ctaDefault: 'Start Curator',
  },
  {
    id: 'tier-collector',
    name: 'Collector',
    tagline: 'Our most-loved tier — 6 to 7 items + a quarterly surprise.',
    monthlyPriceLabel: '$48',
    annualPriceLabel: '$480',
    annualSavingsLabel: '$96',
    cadenceUnitLabel: 'box',
    features: [
      '6–7 curated items each month',
      'Quarterly limited-edition collectible',
      'Swap up to 2 items per box',
      'Early access to new editions',
      'Free shipping worldwide',
    ],
    popular: true,
    ctaKey: 'tierPlanCard.cta.collector',
    ctaDefault: 'Choose Collector',
  },
  {
    id: 'tier-connoisseur',
    name: 'Connoisseur',
    tagline: 'The full archive — every drop and a hand-written note from us.',
    monthlyPriceLabel: '$78',
    annualPriceLabel: '$780',
    annualSavingsLabel: '$156',
    cadenceUnitLabel: 'box',
    features: [
      '9–10 curated items each month',
      'Every limited edition the moment it drops',
      'Unlimited swaps and a custom note',
      'A complimentary anniversary box',
      'Concierge curation calls (twice a year)',
    ],
    ctaKey: 'tierPlanCard.cta.connoisseur',
    ctaDefault: 'Go Connoisseur',
  },
]

export const upcomingShipmentSteps: ShipmentStep[] = [
  {
    id: 'ordered',
    title: 'Curation locked in',
    description: 'Your Hearth & Heirloom selections were finalized by your curator.',
    date: 'Apr 1, 2026',
    status: 'completed',
  },
  {
    id: 'packed',
    title: 'Hand-packed in Portland',
    description:
      'Each piece was wrapped in unbleached muslin and tucked into the kraft box with a hand-written note.',
    date: 'Apr 5, 2026',
    status: 'completed',
  },
  {
    id: 'in-transit',
    title: 'On the way',
    description: 'Picked up by the carrier — tracking is now live.',
    date: 'Apr 7, 2026',
    status: 'current',
    carrier: 'UPS Ground',
    trackingNumber: '1Z 999 AA1 0123 4567 84',
  },
  {
    id: 'out-for-delivery',
    title: 'Out for delivery',
    description: 'Your courier will leave the box at your front door.',
    date: 'Apr 9, 2026',
    status: 'upcoming',
  },
  {
    id: 'unbox',
    title: 'Unbox & enjoy',
    description: 'Tag #crateunbox to share what you discover.',
    date: 'Apr 9, 2026',
    status: 'upcoming',
  },
]

export const shipmentHistory: ShipmentSummary[] = [
  {
    id: 'ship_2026_03',
    boxName: 'Garden Table — March',
    shippedDate: 'Mar 7, 2026',
    status: 'delivered',
    trackingNumber: '1Z 999 AA1 0123 4567 11',
    itemPreview: ['Heirloom seed trio', 'Lemongrass infusion oil', 'Tasting cards'],
  },
  {
    id: 'ship_2026_02',
    boxName: 'Studio Staples — February',
    shippedDate: 'Feb 7, 2026',
    status: 'delivered',
    trackingNumber: '1Z 999 AA1 0123 4567 22',
    itemPreview: ['Hand-pressed pigments', 'Cold-press sketchbook', 'Studio essay zine'],
  },
  {
    id: 'ship_2026_01',
    boxName: 'Coastal Craft — January',
    shippedDate: 'Jan 7, 2026',
    status: 'delivered',
    trackingNumber: '1Z 999 AA1 0123 4567 33',
    itemPreview: ['Sea-salt soak', 'Kelp ceramic dish', 'Tide poetry chapbook'],
  },
]

export const invoiceHistory: InvoiceRow[] = [
  {
    id: 'inv_2026_04',
    date: 'Apr 1, 2026',
    description: 'Collector — April box',
    amountLabel: '$48.00',
    status: 'paid',
  },
  {
    id: 'inv_2026_03',
    date: 'Mar 1, 2026',
    description: 'Collector — March box',
    amountLabel: '$48.00',
    status: 'paid',
  },
  {
    id: 'inv_2026_02',
    date: 'Feb 1, 2026',
    description: 'Collector — February box',
    amountLabel: '$48.00',
    status: 'paid',
  },
  {
    id: 'inv_2026_01',
    date: 'Jan 1, 2026',
    description: 'Collector — January box',
    amountLabel: '$48.00',
    status: 'paid',
  },
]

export interface BoxItemPreview {
  id: string
  name: string
  category: string
  retailValueLabel: string
  imageUrl: string
  imageAlt: string
  swappable: boolean
  excluded?: boolean
  description: string
}

export const currentBoxItems: BoxItemPreview[] = [
  {
    id: 'item-candle',
    name: 'Hand-poured beeswax candle',
    category: 'Home',
    retailValueLabel: '$28',
    imageUrl: 'https://picsum.photos/seed/trove-item-1/240/240',
    imageAlt: 'A pale-amber beeswax candle with hand-trimmed wick.',
    swappable: true,
    description:
      'Made in small batches by Quill & Ember in Bend, Oregon. Burns clean for 32 hours.',
  },
  {
    id: 'item-linen',
    name: 'Indigo-dyed linen napkins (set of 2)',
    category: 'Home',
    retailValueLabel: '$24',
    imageUrl: 'https://picsum.photos/seed/trove-item-2/240/240',
    imageAlt: 'Two folded indigo-dyed linen napkins on a wooden tray.',
    swappable: true,
    description: 'Stone-washed European flax, naturally dyed by Wren Studio.',
  },
  {
    id: 'item-syrup',
    name: 'Wild-rose sipping syrup',
    category: 'Pantry',
    retailValueLabel: '$22',
    imageUrl: 'https://picsum.photos/seed/trove-item-3/240/240',
    imageAlt: 'A small amber glass bottle of wild-rose syrup with a kraft label.',
    swappable: true,
    description: 'Co-fermented with Cascadian honey by The Slow Pantry.',
  },
  {
    id: 'item-coaster',
    name: 'Hand-thrown stoneware coaster',
    category: 'Home',
    retailValueLabel: '$18',
    imageUrl: 'https://picsum.photos/seed/trove-item-4/240/240',
    imageAlt: 'A speckled cream stoneware coaster on a linen napkin.',
    swappable: true,
    excluded: true,
    description: 'Wheel-thrown by Hollow Studio — minor speckling is intentional.',
  },
  {
    id: 'item-card',
    name: 'Letterpress correspondence cards (4)',
    category: 'Stationery',
    retailValueLabel: '$14',
    imageUrl: 'https://picsum.photos/seed/trove-item-5/240/240',
    imageAlt: 'Four letterpress cards stacked with a kraft envelope.',
    swappable: true,
    description: 'Pressed in Portland on cotton stock — sized for handwritten notes.',
  },
  {
    id: 'item-zine',
    name: 'A short essay zine: "On finding wonder"',
    category: 'Reading',
    retailValueLabel: '$6',
    imageUrl: 'https://picsum.photos/seed/trove-item-6/240/240',
    imageAlt: 'A small saddle-stitched essay zine on a textured paper background.',
    swappable: false,
    description: 'A 16-page meditation written by guest curator Esme Larkin.',
  },
]
