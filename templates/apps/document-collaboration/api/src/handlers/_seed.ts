/**
 * Per-user demo seeding for document-collaboration.
 *
 * On a freshly-signed-up account this writes:
 *   - 6 starter document_templates (system templates)
 *   - 3 demo documents owned by the user (so /dashboard isn't empty)
 *   - 3 starter notifications (so /notifications isn't empty)
 *
 * The seed is idempotent: it checks for the presence of each kind of
 * row before inserting and is safe to call multiple times.
 */

import { count, create, findOne } from '@molecule/api-database'

const TEMPLATES: Array<{
  name: string
  description: string
  category: string
  content: Record<string, unknown>
}> = [
  {
    name: 'Blog Post',
    description: 'A clear opening line, three short sections, and a closing thought.',
    category: 'writing',
    content: {
      blocks: [
        { type: 'heading', text: 'A short title that does the work' },
        { type: 'paragraph', text: 'Open with the line that you want to be remembered.' },
        { type: 'heading', text: 'The middle section' },
        { type: 'paragraph', text: 'Three or four paragraphs of careful argument.' },
        { type: 'heading', text: 'The close' },
        { type: 'paragraph', text: 'Land on a single, modest sentence.' },
      ],
    },
  },
  {
    name: 'Meeting Notes',
    description: 'Attendees, agenda, decisions, owners. The discipline is in the headers.',
    category: 'team',
    content: {
      blocks: [
        { type: 'heading', text: 'Meeting Notes' },
        { type: 'paragraph', text: 'Date · Attendees · Facilitator' },
        { type: 'heading', text: 'Agenda' },
        { type: 'paragraph', text: '1. … 2. … 3. …' },
        { type: 'heading', text: 'Decisions' },
        { type: 'paragraph', text: '— Decision · Owner · Due' },
      ],
    },
  },
  {
    name: 'Product Brief',
    description: 'Why now, who it is for, the smallest version that ships.',
    category: 'engineering',
    content: {
      blocks: [
        { type: 'heading', text: 'Product Brief' },
        { type: 'paragraph', text: 'One paragraph stating the problem and the audience.' },
        { type: 'heading', text: 'The smallest version' },
        { type: 'paragraph', text: 'What ships in week one.' },
      ],
    },
  },
  {
    name: 'RFC',
    description: 'Context, proposal, alternatives, drawbacks, open questions.',
    category: 'engineering',
    content: {
      blocks: [
        { type: 'heading', text: 'RFC: <subject>' },
        { type: 'paragraph', text: 'Author · Status · Last revised' },
        { type: 'heading', text: 'Context' },
        { type: 'paragraph', text: 'Set the stage in one paragraph.' },
        { type: 'heading', text: 'Proposal' },
        { type: 'paragraph', text: 'State what you propose to do, with intent.' },
      ],
    },
  },
  {
    name: 'Journal Entry',
    description: 'A page with a date and a wide left margin. Everything else is yours.',
    category: 'personal',
    content: {
      blocks: [
        { type: 'heading', text: '<Date>' },
        { type: 'paragraph', text: 'A few sentences about the morning.' },
      ],
    },
  },
  {
    name: 'Project Plan',
    description:
      'Goals, milestones, owners, risks. The plan that survives contact with the calendar.',
    category: 'team',
    content: {
      blocks: [
        { type: 'heading', text: 'Project Plan' },
        { type: 'paragraph', text: 'Owner · Started · Deadline' },
        { type: 'heading', text: 'Goals' },
        { type: 'paragraph', text: 'Three goals, in the language of outcomes.' },
        { type: 'heading', text: 'Milestones' },
        { type: 'paragraph', text: 'M1 · M2 · M3 — each with an owner.' },
      ],
    },
  },
]

let systemTemplatesSeeded = false

export const seedSystemTemplatesIfEmpty = async (): Promise<void> => {
  if (systemTemplatesSeeded) return
  try {
    const existing = await count('document_templates', [
      { field: 'is_system', operator: '=', value: true },
    ])
    if (existing > 0) {
      systemTemplatesSeeded = true
      return
    }
    const now = new Date()
    for (const tpl of TEMPLATES) {
      await create('document_templates', {
        owner_id: null,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        content: tpl.content,
        is_system: true,
        created_at: now,
        updated_at: now,
      })
    }
    systemTemplatesSeeded = true
  } catch (_error) {
    // intentional — seed is best-effort; failure must not block requests.
  }
}

const DEMO_DOCS: Array<{ title: string; content: Record<string, unknown> }> = [
  {
    title: 'Welcome to your studio',
    content: {
      blocks: [
        {
          type: 'heading',
          text: 'Welcome to your studio',
        },
        {
          type: 'paragraph',
          text: 'This is your first document. Click anywhere to edit, or press the New document button on the dashboard to start a new manuscript.',
        },
        {
          type: 'paragraph',
          text: 'Templates are at /templates — start a meeting note, a project plan, an RFC, or a journal entry from a thoughtful structure.',
        },
      ],
    },
  },
  {
    title: 'Q4 Planning Notes',
    content: {
      blocks: [
        { type: 'heading', text: 'Q4 Planning' },
        { type: 'paragraph', text: 'Themes, milestones, owners.' },
      ],
    },
  },
  {
    title: 'Studio Guidelines',
    content: {
      blocks: [
        { type: 'heading', text: 'Studio Guidelines' },
        { type: 'paragraph', text: 'House style. Voice, em-dashes, citations.' },
      ],
    },
  },
]

const DEMO_NOTIFICATIONS: Array<{
  type: string
  actor: string
  description: string
  href: string | null
  unread: boolean
}> = [
  {
    type: 'system_message',
    actor: 'Quillon',
    description: 'Welcome — your first manuscript is ready in the studio.',
    href: '/dashboard',
    unread: true,
  },
  {
    type: 'shared',
    actor: 'Quillon',
    description: 'Templates are ready — open one from the Templates page.',
    href: '/templates',
    unread: true,
  },
  {
    type: 'system_message',
    actor: 'Quillon',
    description: 'Tip: every save snapshots the prior version — see /history on any doc.',
    href: '/dashboard',
    unread: false,
  },
]

const seededUsers = new Set<string>()

export const seedDemoForUser = async (userId: string): Promise<void> => {
  if (seededUsers.has(userId)) return
  seededUsers.add(userId)
  try {
    // Documents — only seed if the user has none yet.
    const existingDoc = await findOne('documents', [
      { field: 'owner_id', operator: '=', value: userId },
    ])
    if (!existingDoc) {
      const now = new Date()
      for (const doc of DEMO_DOCS) {
        await create('documents', {
          owner_id: userId,
          template_id: null,
          title: doc.title,
          content: doc.content,
          status: 'draft',
          is_template: false,
          version: 1,
          trashed_at: null,
          created_at: now,
          updated_at: now,
        })
      }
    }
    // Notifications — only seed if the user has none yet.
    const existingNotif = await findOne('notifications', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!existingNotif) {
      const now = new Date()
      for (const n of DEMO_NOTIFICATIONS) {
        await create('notifications', {
          user_id: userId,
          type: n.type,
          actor: n.actor,
          description: n.description,
          href: n.href,
          unread: n.unread,
          created_at: now,
        })
      }
    }
  } catch (_error) {
    // intentional — seed is best-effort.
  }
}
