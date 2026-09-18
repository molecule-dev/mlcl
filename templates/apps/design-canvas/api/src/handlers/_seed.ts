/**
 * Design canvas demo seed.
 *
 * - `seedGlobalsIfEmpty()` — public templates + design tokens (idempotent).
 *   Templates back the gallery on /templates and feed real `canvas_data`
 *   into POST /templates/:id/use. Design tokens back the /library page.
 *
 * - `seedDemoForUser(userId)` — one starter project + four notifications +
 *   a few project_activities so a freshly signed-up user lands on a
 *   populated /dashboard, /notifications, and /editor/:id without
 *   FALLBACK fixtures. Idempotent on user_id.
 */

import { count, create, findMany } from '@molecule/api-database'

const TEMPLATES = [
  {
    name: 'Mobile App Flow',
    description: 'iOS + Android frames with auth, onboarding, home, settings, and a dark variant.',
    category: 'UI Mockup',
    accent_color: '#7c3aed',
    icon_name: 'phone_iphone',
    usage_count: 4820,
    canvas_data: {
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 390, height: 844, fill: '#0f0a1f' },
        {
          type: 'text',
          x: 24,
          y: 64,
          width: 342,
          height: 56,
          text: 'Welcome to Atelier',
          fill: '#ffffff',
          font_size: 28,
        },
        { type: 'rect', x: 24, y: 720, width: 342, height: 56, fill: '#7c3aed' },
        {
          type: 'text',
          x: 24,
          y: 720,
          width: 342,
          height: 56,
          text: 'Get started',
          fill: '#ffffff',
          font_size: 18,
        },
      ],
    },
  },
  {
    name: 'Brand Identity Kit',
    description: 'Logo grid, color tokens, typography scale, voice guidelines, and brand snippets.',
    category: 'Branding',
    accent_color: '#ec4899',
    icon_name: 'palette',
    usage_count: 3120,
    canvas_data: {
      shapes: [
        { type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#fdf4ff' },
        {
          type: 'text',
          x: 80,
          y: 80,
          width: 800,
          height: 80,
          text: 'Brand Identity',
          fill: '#1e1535',
          font_size: 48,
        },
      ],
    },
  },
  {
    name: 'Empty-State Illustration Set',
    description: 'Twelve hand-drawn empty-states with the Atelier soft-violet palette baked in.',
    category: 'Illustration',
    accent_color: '#06b6d4',
    icon_name: 'draw',
    usage_count: 1840,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#ecfeff' }],
    },
  },
  {
    name: 'SaaS Pricing Page',
    description: 'Three-tier pricing with feature matrix, FAQ, and a closing CTA. Web + dark.',
    category: 'Marketing',
    accent_color: '#f59e0b',
    icon_name: 'monitoring',
    usage_count: 2680,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#fffbeb' }],
    },
  },
  {
    name: 'Design System Starter',
    description: 'Buttons, cards, form fields, and modal patterns with auto-layout primitives.',
    category: 'Design Ops',
    accent_color: '#10b981',
    icon_name: 'tune',
    usage_count: 5210,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#ecfdf5' }],
    },
  },
  {
    name: 'Editorial Poster Set',
    description: 'Eight A2 posters with grid systems, hero typography, and printable bleed marks.',
    category: 'Print',
    accent_color: '#7c3aed',
    icon_name: 'description',
    usage_count: 920,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#f5f3ff' }],
    },
  },
  {
    name: 'Web Landing Page',
    description:
      'Hero, feature triad, social proof, pricing teaser, and footer. Responsive shells.',
    category: 'Marketing',
    accent_color: '#ec4899',
    icon_name: 'web',
    usage_count: 4360,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#fdf4ff' }],
    },
  },
  {
    name: '24 × 24 Icon Set',
    description: 'A 96-icon UI library with stroke + filled variants and exportable SVGs.',
    category: 'Design Ops',
    accent_color: '#06b6d4',
    icon_name: 'apps',
    usage_count: 3970,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#ecfeff' }],
    },
  },
  {
    name: 'Brainstorm Whiteboard',
    description: 'Sticky notes, voting dots, journey maps, and retro frames for live workshops.',
    category: 'Workshop',
    accent_color: '#f59e0b',
    icon_name: 'extension',
    usage_count: 1730,
    canvas_data: {
      shapes: [{ type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#fffbeb' }],
    },
  },
] as const

const DESIGN_TOKENS = [
  // colors
  { section: 'colors', name: 'primary/600', value: '#7c3aed', role: 'Primary action · CTA' },
  { section: 'colors', name: 'primary/500', value: '#8b5cf6', role: 'Hover · interactive' },
  { section: 'colors', name: 'primary/400', value: '#a78bfa', role: 'Disabled · subdued' },
  { section: 'colors', name: 'accent/500', value: '#ec4899', role: 'Accent · highlight' },
  { section: 'colors', name: 'accent/400', value: '#f472b6', role: 'Accent hover' },
  { section: 'colors', name: 'canvas/500', value: '#06b6d4', role: 'Canvas accent · snap' },
  { section: 'colors', name: 'state/success', value: '#10b981', role: 'Success state' },
  { section: 'colors', name: 'state/warning', value: '#f59e0b', role: 'Warning · locked layer' },
  { section: 'colors', name: 'state/error', value: '#ef4444', role: 'Error · destructive' },
  { section: 'colors', name: 'neutral/900', value: '#1e1535', role: 'Body text · headings' },
  { section: 'colors', name: 'neutral/500', value: '#6b6380', role: 'Secondary text' },
  { section: 'colors', name: 'neutral/100', value: '#f5f3ff', role: 'Surface · panel' },
  // typography
  { section: 'typography', name: 'Display / 64', value: '64', role: 'Display · hero' },
  { section: 'typography', name: 'Headline / 40', value: '40', role: 'Headline · section' },
  { section: 'typography', name: 'Title / 24', value: '24', role: 'Title · card' },
  { section: 'typography', name: 'Body / 16', value: '16', role: 'Body · paragraph' },
  { section: 'typography', name: 'Mono / 13', value: '13', role: 'Mono · token caption' },
  // components
  { section: 'components', name: 'Button · Primary', value: 'btn-primary', role: 'Actions' },
  { section: 'components', name: 'Button · Ghost', value: 'btn-ghost', role: 'Actions' },
  { section: 'components', name: 'Card · Summary', value: 'card-summary', role: 'Cards' },
  { section: 'components', name: 'Card · Stat', value: 'card-stat', role: 'Cards' },
  {
    section: 'components',
    name: 'Avatar · Collaborator stack',
    value: 'avatar-stack',
    role: 'Identity',
  },
  { section: 'components', name: 'Input · Floating label', value: 'input-floating', role: 'Forms' },
  { section: 'components', name: 'Pill · Status', value: 'pill-status', role: 'Display' },
  { section: 'components', name: 'Modal · Export', value: 'modal-export', role: 'Overlays' },
  // effects
  {
    section: 'effects',
    name: 'Soft shadow / 24',
    value: '0 8px 24px rgba(124,58,237,0.18)',
    role: 'Box shadow',
  },
  {
    section: 'effects',
    name: 'Toolbar shadow / 4',
    value: '0 4px 14px rgba(124,58,237,0.12)',
    role: 'Box shadow',
  },
  { section: 'effects', name: 'Layer blur / 4px', value: 'blur(4px)', role: 'Filter' },
  {
    section: 'effects',
    name: 'Backdrop blur / xl',
    value: 'backdrop-blur(20px)',
    role: 'Backdrop filter',
  },
] as const

export async function seedGlobalsIfEmpty(): Promise<{
  templatesCreated: number
  tokensCreated: number
}> {
  const existing = await count('templates', [])
  let templatesCreated = 0
  if (existing === 0) {
    for (const t of TEMPLATES) {
      await create('templates', {
        name: t.name,
        description: t.description,
        category: t.category,
        accent_color: t.accent_color,
        icon_name: t.icon_name,
        usage_count: t.usage_count,
        thumbnail_url: null,
        canvas_data: t.canvas_data,
        is_public: true,
        created_at: new Date(),
      })
      templatesCreated++
    }
  }

  const tokenCount = await count('design_tokens', [])
  let tokensCreated = 0
  if (tokenCount === 0) {
    for (const tok of DESIGN_TOKENS) {
      await create('design_tokens', {
        section: tok.section,
        name: tok.name,
        value: tok.value,
        role: tok.role,
        metadata: {},
        created_at: new Date(),
      })
      tokensCreated++
    }
  }

  return { templatesCreated, tokensCreated }
}

const STARTER_PROJECT_PALETTE = ['#ede9fe', '#fce7f3', '#cffafe', '#fef3c7', '#dcfce7']

const STARTER_NOTIFICATIONS = [
  {
    kind: 'mention',
    actor_name: 'Mara Vieira',
    actor_color: '#7c3aed',
    sentence: 'mentioned you on',
    target_label: 'Welcome project',
    preview: 'Glad to have you on Atelier — give a quick intro!',
    bucket: 'today',
    minutesAgo: 4,
  },
  {
    kind: 'invite',
    actor_name: 'Niko Park',
    actor_color: '#ec4899',
    sentence: 'invited you to edit',
    target_label: 'Mobile Onboarding · v3',
    preview: null,
    bucket: 'today',
    minutesAgo: 38,
  },
  {
    kind: 'comment',
    actor_name: 'Iris Cho',
    actor_color: '#06b6d4',
    sentence: 'left a comment on',
    target_label: 'Atelier Design System',
    preview: 'The pricing card padding feels tight at the 12-col break.',
    bucket: 'today',
    minutesAgo: 120,
  },
  {
    kind: 'edit',
    actor_name: 'Theo Almeida',
    actor_color: '#f59e0b',
    sentence: 'updated 6 components on',
    target_label: 'Pricing Page · Explorations',
    preview: null,
    bucket: 'week',
    minutesAgo: 60 * 24,
  },
] as const

export async function seedDemoForUser(userId: string): Promise<{
  projectsCreated: number
  notificationsCreated: number
  activitiesCreated: number
}> {
  if (!userId) return { projectsCreated: 0, notificationsCreated: 0, activitiesCreated: 0 }

  const projectCount = await count('projects', [{ field: 'user_id', operator: '=', value: userId }])
  let projectsCreated = 0
  let projectId: string | null
  if (projectCount === 0) {
    const created = await create<Record<string, unknown>>('projects', {
      user_id: userId,
      team_id: null,
      name: 'Welcome project · Brand Refresh',
      width: 1920,
      height: 1080,
      canvas_data: {
        shapes: [
          { type: 'rect', x: 0, y: 0, width: 1920, height: 1080, fill: '#ede9fe' },
          {
            type: 'text',
            x: 80,
            y: 120,
            width: 1760,
            height: 80,
            text: 'Welcome to Atelier',
            fill: '#1e1535',
            font_size: 64,
          },
        ],
      },
      thumbnail_color: STARTER_PROJECT_PALETTE[0],
      created_at: new Date(),
      updated_at: new Date(),
    })
    const row = (created.data ?? created) as Record<string, unknown>
    projectId = String(row.id)
    projectsCreated = 1
  } else {
    const existing = await findMany<Record<string, unknown>>('projects', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 1,
    })
    projectId = existing[0] ? String(existing[0].id) : null
  }

  const notifCount = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  let notificationsCreated = 0
  if (notifCount === 0) {
    for (const n of STARTER_NOTIFICATIONS) {
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        actor_name: n.actor_name,
        actor_color: n.actor_color,
        sentence: n.sentence,
        target_label: n.target_label,
        target_href: projectId ? `/editor/${projectId}` : '/dashboard',
        preview: n.preview,
        bucket: n.bucket,
        unread: true,
        created_at: new Date(Date.now() - n.minutesAgo * 60_000),
        read_at: null,
      })
      notificationsCreated++
    }
  }

  let activitiesCreated = 0
  if (projectId) {
    const activityCount = await count('project_activities', [
      { field: 'project_id', operator: '=', value: projectId },
    ])
    if (activityCount === 0) {
      const items: Array<{ action: string; minutesAgo: number }> = [
        { action: 'opened', minutesAgo: 8 },
        { action: 'edited', minutesAgo: 6 },
        { action: 'commented', minutesAgo: 3 },
      ]
      for (const a of items) {
        await create('project_activities', {
          project_id: projectId,
          user_id: userId,
          action: a.action,
          metadata: {},
          created_at: new Date(Date.now() - a.minutesAgo * 60_000),
        })
        activitiesCreated++
      }
    }
  }

  return { projectsCreated, notificationsCreated, activitiesCreated }
}
