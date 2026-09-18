import { create, findMany } from '@molecule/api-database'

const MAX_REVISIONS_KEPT = 50

/**
 * Snapshot the current state of a record into the `revisions` table.
 * Call BEFORE any update — the snapshot represents "what it looked
 * like at the start of this edit".
 */
export async function snapshot(
  table: string,
  record: { id: string } & Record<string, unknown>,
  actorUserId: string,
): Promise<void> {
  const [latest] = (await findMany('revisions', {
    where: [
      { field: 'table_name', operator: '=', value: table },
      { field: 'record_id', operator: '=', value: record.id },
    ],
    orderBy: [{ field: 'revision_number', direction: 'desc' }],
    limit: 1,
  })) as { revision_number: number }[]

  const nextNumber = (latest?.revision_number ?? 0) + 1

  await create('revisions', {
    table_name: table,
    record_id: record.id,
    revision_number: nextNumber,
    actor_user_id: actorUserId,
    state: record,
    created_at: new Date().toISOString(),
  })

  // Compact: drop oldest if we exceed the cap. Real production would
  // keep monthly snapshots before that, but this example stays simple.
  if (nextNumber > MAX_REVISIONS_KEPT) {
    const overflow = await findMany('revisions', {
      where: [
        { field: 'table_name', operator: '=', value: table },
        { field: 'record_id', operator: '=', value: record.id },
      ],
      orderBy: [{ field: 'revision_number', direction: 'asc' }],
      limit: 1,
    })
    if (overflow[0]) {
      const id = (overflow[0] as { id: string }).id
      const { deleteById } = await import('@molecule/api-database')
      await deleteById('revisions', id)
    }
  }
}
