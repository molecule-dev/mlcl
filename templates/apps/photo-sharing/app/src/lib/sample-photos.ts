/**
 * Curated sample data used by polished pages while a backend isn't wired.
 * Component prop interfaces match the photos/albums/galleries shapes implied
 * by `api/handlers/photos.ts` + DESIGN.md + screen-map.json.
 *
 * TODO: replace these arrays with `useHttpClient()` calls to /api/photos,
 * /api/albums, /api/galleries once those endpoints are stable in the
 * mock-server fixture set.
 */

export interface SamplePhoto {
  id: string
  title: string
  caption: string
  author: string
  author_handle: string
  cover_index: number
  favorite_count: number
  comment_count: number
  view_count: number
  uploaded_at: string
  tags: string[]
  album_id?: string
  exif: {
    camera: string
    lens: string
    focal_length: string
    aperture: string
    shutter_speed: string
    iso: string
    location: string
    taken_at: string
  }
  /** Aspect bucket — 'tall' | 'wide' | 'square' — used by the masonry layout. */
  aspect: 'tall' | 'wide' | 'square'
}

export interface SampleAlbum {
  id: string
  title: string
  description: string
  curator: string
  curator_handle: string
  photo_count: number
  cover_index: number
  updated_at: string
}

export interface SampleGallery {
  id: string
  title: string
  description: string
  curator: string
  cover_indices: [number, number, number, number]
  photo_count: number
  is_featured: boolean
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'p_blue_hour',
    title: 'Blue Hour Over Reykjavík',
    caption: 'Last light off the basalt rooftops, fifteen minutes after sunset.',
    author: 'Astrid Halvorsen',
    author_handle: 'astrid',
    cover_index: 0,
    favorite_count: 1248,
    comment_count: 42,
    view_count: 18_402,
    uploaded_at: '2026-04-22T18:30:00Z',
    tags: ['cityscape', 'twilight', 'iceland'],
    album_id: 'a_nordic_winter',
    exif: {
      camera: 'Sony α7R V',
      lens: 'Sony FE 24-70mm f/2.8 GM II',
      focal_length: '35mm',
      aperture: 'ƒ/4.0',
      shutter_speed: '1/60s',
      iso: 'ISO 200',
      location: 'Reykjavík, Iceland',
      taken_at: '2026-02-14',
    },
    aspect: 'wide',
  },
  {
    id: 'p_atelier',
    title: "The Sculptor's Atelier",
    caption: 'Fourth-floor studio in the Marais. North light hits the marble at 3pm.',
    author: 'Léon Caillebotte',
    author_handle: 'leon',
    cover_index: 1,
    favorite_count: 894,
    comment_count: 31,
    view_count: 9_220,
    uploaded_at: '2026-04-19T10:15:00Z',
    tags: ['portrait', 'documentary', 'paris'],
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focal_length: '28mm',
      aperture: 'ƒ/2.8',
      shutter_speed: '1/250s',
      iso: 'ISO 400',
      location: 'Paris, France',
      taken_at: '2026-03-02',
    },
    aspect: 'tall',
  },
  {
    id: 'p_kelp_forest',
    title: 'Kelp Cathedral',
    caption:
      'Eighteen meters down off Anacapa Island. Sunbeams refracting through giant bladder kelp.',
    author: 'Mira Okafor',
    author_handle: 'mira',
    cover_index: 2,
    favorite_count: 2_104,
    comment_count: 87,
    view_count: 31_408,
    uploaded_at: '2026-04-17T22:00:00Z',
    tags: ['underwater', 'wildlife', 'pacific'],
    exif: {
      camera: 'Nikon Z9',
      lens: 'NIKKOR Z 14-30mm f/4 S',
      focal_length: '17mm',
      aperture: 'ƒ/8.0',
      shutter_speed: '1/200s',
      iso: 'ISO 800',
      location: 'Channel Islands, USA',
      taken_at: '2026-04-04',
    },
    aspect: 'square',
  },
  {
    id: 'p_alpenglow',
    title: 'Alpenglow on the Cuillin',
    caption: 'Eleven minutes between the storm clearing and the sun cutting out.',
    author: 'Eilidh Ross',
    author_handle: 'eilidh',
    cover_index: 3,
    favorite_count: 612,
    comment_count: 19,
    view_count: 6_440,
    uploaded_at: '2026-04-15T07:45:00Z',
    tags: ['landscape', 'mountains', 'scotland'],
    exif: {
      camera: 'Fujifilm GFX100 II',
      lens: 'GF 32-64mm f/4 R LM WR',
      focal_length: '45mm',
      aperture: 'ƒ/11',
      shutter_speed: '1/30s',
      iso: 'ISO 100',
      location: 'Isle of Skye, Scotland',
      taken_at: '2026-01-18',
    },
    aspect: 'wide',
  },
  {
    id: 'p_marketplace',
    title: 'Spice Quarter, 6:14am',
    caption: 'Vendors setting up before the muezzin calls. Twenty seconds of empty alley.',
    author: 'Sami Halabi',
    author_handle: 'sami',
    cover_index: 4,
    favorite_count: 1_504,
    comment_count: 56,
    view_count: 22_810,
    uploaded_at: '2026-04-12T05:30:00Z',
    tags: ['street', 'documentary', 'morocco'],
    exif: {
      camera: 'Ricoh GR IIIx',
      lens: '40mm f/2.8 (fixed)',
      focal_length: '40mm',
      aperture: 'ƒ/5.6',
      shutter_speed: '1/125s',
      iso: 'ISO 800',
      location: 'Marrakech, Morocco',
      taken_at: '2026-03-21',
    },
    aspect: 'tall',
  },
  {
    id: 'p_dune',
    title: 'Sand & Wind, Erg Chebbi',
    caption: 'A single dune line, pre-dawn. The wind reset everything within an hour.',
    author: 'Astrid Halvorsen',
    author_handle: 'astrid',
    cover_index: 5,
    favorite_count: 980,
    comment_count: 24,
    view_count: 11_204,
    uploaded_at: '2026-04-10T04:50:00Z',
    tags: ['landscape', 'minimal', 'sahara'],
    exif: {
      camera: 'Sony α7R V',
      lens: 'Sony FE 70-200mm f/2.8 GM OSS II',
      focal_length: '135mm',
      aperture: 'ƒ/8.0',
      shutter_speed: '1/250s',
      iso: 'ISO 200',
      location: 'Erg Chebbi, Morocco',
      taken_at: '2026-03-19',
    },
    aspect: 'wide',
  },
  {
    id: 'p_storefront',
    title: 'After Hours, Tribeca',
    caption: 'A typewriter shop closing up. The neon sign hums for thirty more minutes.',
    author: 'Jules Patel',
    author_handle: 'jules',
    cover_index: 6,
    favorite_count: 720,
    comment_count: 14,
    view_count: 5_980,
    uploaded_at: '2026-04-08T23:10:00Z',
    tags: ['street', 'night', 'newyork'],
    exif: {
      camera: 'Leica M11',
      lens: 'Summicron 35mm f/2 ASPH',
      focal_length: '35mm',
      aperture: 'ƒ/2.8',
      shutter_speed: '1/60s',
      iso: 'ISO 1600',
      location: 'New York, USA',
      taken_at: '2026-04-04',
    },
    aspect: 'square',
  },
  {
    id: 'p_lupines',
    title: 'Lupines at Hapuna',
    caption: 'Two minutes of usable light. The trades came up at sunset and shut it down.',
    author: 'Mira Okafor',
    author_handle: 'mira',
    cover_index: 0,
    favorite_count: 1_088,
    comment_count: 33,
    view_count: 14_502,
    uploaded_at: '2026-04-05T19:50:00Z',
    tags: ['nature', 'macro', 'hawaii'],
    exif: {
      camera: 'Nikon Z9',
      lens: 'NIKKOR Z 105mm f/2.8 VR S Macro',
      focal_length: '105mm',
      aperture: 'ƒ/4.0',
      shutter_speed: '1/500s',
      iso: 'ISO 400',
      location: 'Big Island, Hawaii',
      taken_at: '2026-03-30',
    },
    aspect: 'tall',
  },
  {
    id: 'p_bridges',
    title: 'Six Bridges, One Frame',
    caption: 'Long exposure off Tower Bridge. The rain started right after.',
    author: 'Léon Caillebotte',
    author_handle: 'leon',
    cover_index: 1,
    favorite_count: 540,
    comment_count: 9,
    view_count: 4_120,
    uploaded_at: '2026-04-02T22:30:00Z',
    tags: ['cityscape', 'long-exposure', 'london'],
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focal_length: '28mm',
      aperture: 'ƒ/11',
      shutter_speed: '15s',
      iso: 'ISO 100',
      location: 'London, UK',
      taken_at: '2026-03-28',
    },
    aspect: 'wide',
  },
  {
    id: 'p_grain_fields',
    title: 'Wheat & Stormlight',
    caption: 'Late June, north of Avignon. Five minutes of golden hour, then a downpour.',
    author: 'Eilidh Ross',
    author_handle: 'eilidh',
    cover_index: 2,
    favorite_count: 866,
    comment_count: 22,
    view_count: 8_604,
    uploaded_at: '2026-03-30T18:55:00Z',
    tags: ['landscape', 'agriculture', 'provence'],
    exif: {
      camera: 'Fujifilm GFX100 II',
      lens: 'GF 100-200mm f/5.6 R LM OIS WR',
      focal_length: '180mm',
      aperture: 'ƒ/8.0',
      shutter_speed: '1/250s',
      iso: 'ISO 200',
      location: 'Provence, France',
      taken_at: '2026-03-25',
    },
    aspect: 'square',
  },
  {
    id: 'p_silver_falls',
    title: 'Silver Falls, Three-Stop Filter',
    caption: 'A 1.6-second exposure with a polarizer. The rocks were waxed by mist.',
    author: 'Sami Halabi',
    author_handle: 'sami',
    cover_index: 3,
    favorite_count: 1_212,
    comment_count: 38,
    view_count: 16_205,
    uploaded_at: '2026-03-28T11:20:00Z',
    tags: ['landscape', 'long-exposure', 'oregon'],
    exif: {
      camera: 'Ricoh GR IIIx',
      lens: '40mm f/2.8 (fixed)',
      focal_length: '40mm',
      aperture: 'ƒ/16',
      shutter_speed: '1.6s',
      iso: 'ISO 100',
      location: 'Silver Falls, Oregon, USA',
      taken_at: '2026-02-21',
    },
    aspect: 'tall',
  },
  {
    id: 'p_studio_portrait',
    title: 'Backstage, Act Two',
    caption: 'Three frames between curtain calls. The lighting director was kind.',
    author: 'Jules Patel',
    author_handle: 'jules',
    cover_index: 4,
    favorite_count: 432,
    comment_count: 11,
    view_count: 3_404,
    uploaded_at: '2026-03-25T20:05:00Z',
    tags: ['portrait', 'editorial', 'theater'],
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux 50mm f/1.4 ASPH',
      focal_length: '50mm',
      aperture: 'ƒ/1.7',
      shutter_speed: '1/125s',
      iso: 'ISO 800',
      location: 'BAM, Brooklyn, USA',
      taken_at: '2026-03-22',
    },
    aspect: 'square',
  },
]

export const SAMPLE_ALBUMS: SampleAlbum[] = [
  {
    id: 'a_nordic_winter',
    title: 'Nordic Winter',
    description:
      'Eight months across Iceland, Lofoten, and Svalbard. Mostly available light, mostly cold hands.',
    curator: 'Astrid Halvorsen',
    curator_handle: 'astrid',
    photo_count: 38,
    cover_index: 0,
    updated_at: '2026-04-23T09:00:00Z',
  },
  {
    id: 'a_paris_atelier',
    title: 'Studios Of The Marais',
    description:
      'A documentary series on six painters and one bookbinder. Composed in available north light.',
    curator: 'Léon Caillebotte',
    curator_handle: 'leon',
    photo_count: 21,
    cover_index: 1,
    updated_at: '2026-04-19T15:30:00Z',
  },
  {
    id: 'a_underwater',
    title: 'Pacific, Below',
    description:
      'Kelp forests, blue water, and three close encounters with sea otters off the California coast.',
    curator: 'Mira Okafor',
    curator_handle: 'mira',
    photo_count: 56,
    cover_index: 2,
    updated_at: '2026-04-18T22:10:00Z',
  },
  {
    id: 'a_skye_diaries',
    title: 'Skye Diaries',
    description:
      'Twelve days on the Cuillin ridge in heavy weather. Eight rolls of HP5 + two SD cards.',
    curator: 'Eilidh Ross',
    curator_handle: 'eilidh',
    photo_count: 34,
    cover_index: 3,
    updated_at: '2026-04-15T08:00:00Z',
  },
  {
    id: 'a_morocco',
    title: 'Routes Of The Atlas',
    description:
      'A six-week traverse from Casablanca to the Sahara. Markets, mountain passes, and one camel.',
    curator: 'Sami Halabi',
    curator_handle: 'sami',
    photo_count: 47,
    cover_index: 4,
    updated_at: '2026-04-12T06:00:00Z',
  },
  {
    id: 'a_after_hours',
    title: 'After Hours',
    description: 'New York between 11pm and 4am. Most are pushed two stops.',
    curator: 'Jules Patel',
    curator_handle: 'jules',
    photo_count: 18,
    cover_index: 5,
    updated_at: '2026-04-08T23:30:00Z',
  },
]

export const SAMPLE_GALLERIES: SampleGallery[] = [
  {
    id: 'g_blue_hour',
    title: 'Blue Hour, Worldwide',
    description:
      'A curator-selected collection of images shot in the fifteen minutes after sunset, from twelve countries.',
    curator: 'The Editors',
    cover_indices: [0, 5, 8, 3],
    photo_count: 42,
    is_featured: true,
  },
  {
    id: 'g_silent_streets',
    title: 'Silent Streets',
    description: "Empty street scenes, framed for what isn't there. Curated by Sami Halabi.",
    curator: 'Sami Halabi',
    cover_indices: [4, 6, 11, 1],
    photo_count: 28,
    is_featured: false,
  },
  {
    id: 'g_water_studies',
    title: 'Water Studies',
    description:
      'Long exposures, underwater, ice, and stormlight on rivers. Curated by Mira Okafor.',
    curator: 'Mira Okafor',
    cover_indices: [2, 8, 10, 5],
    photo_count: 33,
    is_featured: false,
  },
  {
    id: 'g_north_light',
    title: 'Available North Light',
    description: 'Studio and indoor portraiture lit by windows. Curated by Léon Caillebotte.',
    curator: 'Léon Caillebotte',
    cover_indices: [1, 11, 7, 4],
    photo_count: 19,
    is_featured: false,
  },
]
