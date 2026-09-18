/**
 * Bootstrap handler — seeds first-time users with a curated starter set
 * (collections, prompts, styles, sample generations, welcome notifications)
 * so the dashboard, gallery and prompt-lab pages render with realistic
 * content immediately after signup. Idempotent: subsequent calls
 * short-circuit when the user already has any seeded rows.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const COLLECTIONS = [
  {
    name: 'Aurora dreamscape',
    description: 'Auroral skies, glowing bioluminescent flora and northern light studies.',
  },
  {
    name: 'Studio portraits',
    description: 'Photoreal character portraits — actors, fashion editorials, archetypes.',
  },
  {
    name: 'Product launches',
    description: 'Concept renders for the Spring product line — packaging + lifestyle.',
  },
  {
    name: 'Storyboards',
    description: 'Sequential concept boards for the documentary intro reel.',
  },
] as const

const PROMPTS = [
  {
    title: 'Hero · Dreamscape sunset',
    prompt_text: 'A dreamscape of floating islands at sunset, photoreal, golden hour',
    negative_prompt: 'low contrast, blurry, watermark',
    tags: ['Hero', 'Photoreal', 'Sunset'],
  },
  {
    title: 'Concept · Art-deco starship',
    prompt_text: 'Concept-art of an art-deco starship interior, brass and teal palette',
    tags: ['Sci-fi', 'Concept'],
  },
  {
    title: 'Editorial · Rainy boulevard',
    prompt_text: 'Watercolor study of city rain on a quiet evening boulevard',
    tags: ['Editorial', 'Watercolor'],
  },
  {
    title: 'Game · Inventor isometric',
    prompt_text: 'Top-down isometric room of a tiny inventor surrounded by clockwork tools',
    negative_prompt: 'flat lighting, low detail',
    tags: ['Isometric', 'Game art'],
  },
] as const

const STYLES = [
  {
    name: 'Photoreal',
    description: 'Studio-grade photographic realism with cinematic lighting.',
    prompt_modifier: 'cinematic lighting, sharp focus, photoreal, 4K',
  },
  {
    name: 'Anime',
    description: 'Hand-drawn cel-shaded anime aesthetic with bold linework.',
    prompt_modifier: 'cel-shaded anime, bold linework, vibrant',
  },
  {
    name: 'Watercolor',
    description: 'Soft pigment washes, paper texture, organic edges.',
    prompt_modifier: 'watercolor wash, paper texture, soft edges',
  },
  {
    name: 'Cyberpunk',
    description: 'Neon-lit megacity vistas with chromatic aberration.',
    prompt_modifier: 'neon, cyberpunk, chromatic aberration, megacity',
  },
  {
    name: 'Oil painting',
    description: 'Classical oil painting with brushstroke detail and impasto.',
    prompt_modifier: 'oil painting, brushstroke detail, impasto',
  },
  {
    name: 'Isometric',
    description: 'Crisp isometric vector tiles with playful pastel palettes.',
    prompt_modifier: 'isometric, vector tiles, pastel',
  },
  {
    name: 'Concept art',
    description: 'Loose painterly concept-art for environments and characters.',
    prompt_modifier: 'painterly concept art, loose brushwork',
  },
  {
    name: 'Product',
    description: 'Clean studio product shots with infinite-curve backgrounds.',
    prompt_modifier: 'studio product shot, infinite curve backdrop',
  },
] as const

const GENERATIONS = [
  {
    prompt: 'Floating crystal islands above a lavender sea at dusk, photoreal',
    status: 'succeeded',
    model: 'reverie-xl-v3',
    seed: 184_204,
    size: '1792x1024',
  },
  {
    prompt: 'Cyberpunk koi pond, neon-pink reflections, isometric, rich detail',
    status: 'generating',
    model: 'reverie-flash',
    seed: 902_111,
    size: '1024x1024',
  },
  {
    prompt: 'Watercolor portrait of an aurora fox in a snowy birch forest',
    status: 'succeeded',
    model: 'reverie-xl-v3',
    seed: 5_582,
    size: '768x1024',
  },
  {
    prompt: 'Minimalist Bauhaus poster, stacked geometric clouds, mauve + amber',
    status: 'upscaled',
    model: 'reverie-print',
    seed: 11_443,
    size: '1024x1024',
  },
  {
    prompt: 'Macro shot of a glowing dandelion seed releasing iridescent spores',
    status: 'queued',
    model: 'reverie-xl-v3',
    seed: 71_912,
    size: '1024x1024',
  },
  {
    prompt: 'Neo-noir downtown, rain-slick streets, scattered umbrellas, cinematic',
    status: 'failed',
    model: 'reverie-flash',
    seed: 244_109,
    size: '1792x1024',
  },
  {
    prompt: 'Pastel concept art of a tea garden floating above pink clouds',
    status: 'succeeded',
    model: 'reverie-xl-v3',
    seed: 8_812,
    size: '1024x1024',
  },
  {
    prompt: 'Surreal underwater library, glowing jellyfish lanterns, art nouveau',
    status: 'succeeded',
    model: 'reverie-print',
    seed: 60_233,
    size: '1024x1024',
  },
] as const

const NOTIFICATIONS = [
  {
    kind: 'completed',
    title: 'Dream rendered',
    body: 'Floating crystal islands above a lavender sea at dusk',
    link: null,
  },
  {
    kind: 'upscaled',
    title: 'Image upscaled 4×',
    body: 'Pastel concept art of a tea garden floating above pink clouds',
    link: null,
  },
  {
    kind: 'queued',
    title: 'Prompt queued',
    body: 'Macro shot of a glowing dandelion seed',
    link: null,
  },
] as const

router.post('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }

    // Idempotent: bail if any of the user's bootstrap-targeted tables already has rows.
    const existing = await findMany<Record<string, unknown>>('collections', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existing.length > 0) {
      return res.json({ seeded: false })
    }

    for (const c of COLLECTIONS) {
      await create('collections', {
        user_id: userId,
        name: c.name,
        description: c.description,
        is_public: false,
      })
    }
    for (const p of PROMPTS) {
      await create('prompt_library', {
        user_id: userId,
        title: p.title,
        prompt_text: p.prompt_text,
        negative_prompt: 'negative_prompt' in p ? p.negative_prompt : null,
        // jsonb columns need JSON-encoded text — node-postgres serializes
        // raw JS arrays as Postgres arrays, which Postgres rejects as
        // invalid JSON.
        tags: JSON.stringify(p.tags),
        position: 0,
        last_used_at: null,
      })
    }
    for (const s of STYLES) {
      await create('style_presets', {
        user_id: userId,
        name: s.name,
        prompt_modifier: s.prompt_modifier,
        description: s.description,
        sample_image_url: null,
      })
    }
    for (const g of GENERATIONS) {
      await create('generations', {
        user_id: userId,
        prompt: g.prompt,
        status: g.status,
        model: g.model,
        seed: g.seed,
        size: g.size,
        provider: 'reverie',
        is_public: false,
        is_favorite: false,
      })
    }
    for (const n of NOTIFICATIONS) {
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link,
      })
    }
    // Seed an initial credit grant matching the starter plan's monthly
    // allowance (`creditsPerMonth` in handlers/plans.ts → starter). Keep
    // these in lock-step: a signup grant larger than the plan cap makes
    // the dashboard meter render past 100% and lies about how much a
    // user gets next month.
    await create('credit_ledger', {
      user_id: userId,
      delta: 120,
      reason: 'signup_grant',
      reference_id: null,
    })

    res.status(201).json({ seeded: true })
  } catch (err) {
    console.error('[bootstrap] failed:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
