/**
 * Per-user demo seeding for messaging-app.
 *
 * A fresh user signing up needs SOMETHING in their inbox or every page
 * is empty. We create:
 *
 *   - Three "demo" peer users (deterministic, idempotent on email)
 *   - A contact row for each peer
 *   - Three direct conversations (one per peer) seeded with a few
 *     messages (the peer's "hello" + a system message)
 *   - One group ("Hush Beta Testers") with the user + two peers,
 *     plus a couple of group messages
 *   - A welcome notification + a "security" notification
 *
 * All seed actions are idempotent on (viewer_id) so re-invoking is a
 * no-op. Promises are de-duplicated per-process with a Map so concurrent
 * GET requests during the very first seconds after signup don't double-
 * insert.
 *
 * @module
 */

import { count, create, findMany, query, updateById } from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'

const DEMO_PEERS = [
  {
    email: 'avery@hush.demo',
    name: 'Avery Park',
    status_text: 'On focus mode',
    phone: '+1 (555) 010-1102',
  },
  {
    email: 'jordan@hush.demo',
    name: 'Jordan Vega',
    status_text: 'In a meeting',
    phone: '+1 (555) 010-1103',
  },
  {
    email: 'reese@hush.demo',
    name: 'Reese Tanaka',
    status_text: 'Out for a walk',
    phone: '+1 (555) 010-1104',
  },
]

interface UserRow {
  id: string
  email: string | null
  name: string | null
}

async function ensureDemoPeer(p: {
  email: string
  name: string
  status_text: string
  phone: string
}): Promise<string> {
  const existing = await findMany<UserRow>('users', {
    where: [{ field: 'email', operator: '=', value: p.email }],
    limit: 1,
  })
  if (existing[0]?.id) return String(existing[0].id)
  // Use raw query to insert into the users table so we control the id
  // and stay idempotent. Resource-User normally drives signup; demo
  // peers don't have a password (they exist only to be messaged).
  const result = await query<{ id: string }>(
    `INSERT INTO public.users (id, email, name, status_text, phone, last_seen_at, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now(), now())
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [p.email, p.name, p.status_text, p.phone],
  )
  if (result.rows[0]?.id) return String(result.rows[0].id)
  // Conflict path: re-read the row.
  const after = await findMany<UserRow>('users', {
    where: [{ field: 'email', operator: '=', value: p.email }],
    limit: 1,
  })
  return String(after[0]?.id)
}

async function safeEncrypt(value: string): Promise<string> {
  try {
    return await encrypt(value)
  } catch (_error) {
    // encryption unavailable at seed time — store plaintext and let the bond handle it on first read
    return value
  }
}

const seedPromises = new Map<string, Promise<void>>()

/**
 * Seed demo data for a single viewer. Idempotent on contact_count > 0.
 * Concurrent calls for the same viewer share the same promise.
 */
export async function seedDemoForUserOnce(viewerId: string): Promise<void> {
  if (!viewerId) return
  let p = seedPromises.get(viewerId)
  if (!p) {
    p = doSeed(viewerId).catch((e) => {
      seedPromises.delete(viewerId)
      throw e
    })
    seedPromises.set(viewerId, p)
  }
  return p
}

async function doSeed(viewerId: string): Promise<void> {
  const existingContacts = await count('contacts', [
    { field: 'user_id', operator: '=', value: viewerId },
  ])
  if (existingContacts > 0) return

  // Make sure the viewer has a last_seen_at so other users see their
  // online presence.
  await updateById('users', viewerId, { last_seen_at: new Date().toISOString() })

  const peerIds: string[] = []
  for (const p of DEMO_PEERS) {
    const id = await ensureDemoPeer(p)
    peerIds.push(id)
  }

  const now = Date.now()

  // Contacts (viewer → each peer)
  for (const [i, pid] of peerIds.entries()) {
    await create('contacts', {
      user_id: viewerId,
      contact_user_id: pid,
      nickname: null,
      created_at: new Date(now - (i + 1) * 86400_000).toISOString(),
    })
  }

  // Reverse contacts so peers can also see the viewer (so /api/contacts
  // for a peer-driven test would return the user).
  for (const pid of peerIds) {
    await create('contacts', {
      user_id: pid,
      contact_user_id: viewerId,
      nickname: null,
      created_at: new Date(now).toISOString(),
    })
  }

  // Three direct conversations (viewer + each peer), each with two
  // intro messages so the inbox renders something useful.
  const intros = [
    'Hey! Welcome to Hush — proud to be your first DM.',
    'Quick reminder: messages here are end-to-end encrypted.',
    'Pinged a meeting link in a sec. Talk soon!',
  ]
  for (const [i, pid] of peerIds.entries()) {
    const created = await create('conversations', {
      type: 'direct',
      title: null,
      created_by: viewerId,
      group_id: null,
      created_at: new Date(now - (i + 1) * 3600_000).toISOString(),
    })
    const convo = created.data as { id: string } | undefined
    if (!convo?.id) continue

    await create('conversation_participants', {
      conversation_id: convo.id,
      user_id: viewerId,
      joined_at: new Date(now).toISOString(),
      unread_count: 0,
    })
    await create('conversation_participants', {
      conversation_id: convo.id,
      user_id: pid,
      joined_at: new Date(now).toISOString(),
      unread_count: 0,
    })

    const intro = intros[i] ?? intros[0]!
    const sentAt = new Date(now - (i + 1) * 3600_000 + 1000).toISOString()
    await create('messages', {
      conversation_id: convo.id,
      sender_id: pid,
      content: await safeEncrypt(intro),
      type: 'text',
      media_id: null,
      reply_to_message_id: null,
      created_at: sentAt,
    })
    const sentAt2 = new Date(now - (i + 1) * 3600_000 + 2000).toISOString()
    await create('messages', {
      conversation_id: convo.id,
      sender_id: pid,
      content: await safeEncrypt('Reply whenever — no pressure.'),
      type: 'text',
      media_id: null,
      reply_to_message_id: null,
      created_at: sentAt2,
    })
    await updateById('conversations', convo.id, {
      last_message_at: sentAt2,
      last_message_preview: 'Reply whenever — no pressure.',
      last_sender_id: pid,
    })
  }

  // One group with viewer + two peers
  const groupCreated = await create('groups', {
    owner_id: viewerId,
    name: 'Hush Beta Testers',
    description: 'Founding members. Bug reports, feature debates, the occasional cat photo.',
    encryption_enabled: true,
    created_at: new Date(now - 7 * 86400_000).toISOString(),
  })
  const group = groupCreated.data as { id: string } | undefined
  if (group?.id) {
    await create('group_members', {
      group_id: group.id,
      user_id: viewerId,
      role: 'admin',
      joined_at: new Date(now - 7 * 86400_000).toISOString(),
    })
    for (const pid of peerIds.slice(0, 2)) {
      await create('group_members', {
        group_id: group.id,
        user_id: pid,
        role: 'member',
        joined_at: new Date(now - 6 * 86400_000).toISOString(),
      })
    }
    const groupConvo = await create('conversations', {
      type: 'group',
      title: 'Hush Beta Testers',
      created_by: viewerId,
      group_id: group.id,
      created_at: new Date(now - 6 * 86400_000).toISOString(),
    })
    const gc = groupConvo.data as { id: string } | undefined
    if (gc?.id) {
      await create('conversation_participants', {
        conversation_id: gc.id,
        user_id: viewerId,
        joined_at: new Date(now - 6 * 86400_000).toISOString(),
        unread_count: 0,
      })
      for (const pid of peerIds.slice(0, 2)) {
        await create('conversation_participants', {
          conversation_id: gc.id,
          user_id: pid,
          joined_at: new Date(now - 6 * 86400_000).toISOString(),
          unread_count: 0,
        })
      }
      const gMsgAt = new Date(now - 86400_000).toISOString()
      await create('messages', {
        conversation_id: gc.id,
        sender_id: peerIds[0]!,
        content: await safeEncrypt('Pushed v0.4 — the offline queue should be smoother.'),
        type: 'text',
        media_id: null,
        reply_to_message_id: null,
        created_at: gMsgAt,
      })
      const gMsgAt2 = new Date(now - 7200_000).toISOString()
      await create('messages', {
        conversation_id: gc.id,
        sender_id: peerIds[1]!,
        content: await safeEncrypt(
          'Confirmed — sent two messages on the train, both delivered when I came back online.',
        ),
        type: 'text',
        media_id: null,
        reply_to_message_id: null,
        created_at: gMsgAt2,
      })
      await updateById('conversations', gc.id, {
        last_message_at: gMsgAt2,
        last_message_preview:
          'Confirmed — sent two messages on the train, both delivered when I came back online.',
        last_sender_id: peerIds[1]!,
      })
    }
  }

  // Welcome + security notifications.
  const existingNotif = await count('notifications', [
    { field: 'user_id', operator: '=', value: viewerId },
  ])
  if (existingNotif === 0) {
    await create('notifications', {
      user_id: viewerId,
      kind: 'system_message',
      payload: {
        title: 'Welcome to Hush',
        body: 'Your account is set up. Conversations are end-to-end encrypted by default.',
        href: '/inbox',
      },
      created_at: new Date(now).toISOString(),
    })
    await create('notifications', {
      user_id: viewerId,
      kind: 'security_event',
      payload: {
        title: 'New device linked',
        body: "This browser session is now linked to your account. You'll see it under Profile → Devices.",
        href: '/profile',
      },
      created_at: new Date(now - 600_000).toISOString(),
    })
    await create('notifications', {
      user_id: viewerId,
      kind: 'group_invite',
      payload: {
        title: 'You joined Hush Beta Testers',
        body: 'Founding members. Bug reports, feature debates, the occasional cat photo.',
        href: '/groups',
      },
      created_at: new Date(now - 1200_000).toISOString(),
    })
  }
}
