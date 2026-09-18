/**
 * {{PASCAL_NAME}} route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

export const routes = [
  { method: 'post', path: '/{{TABLE_NAME}}', handler: 'create' },
  { method: 'get', path: '/{{TABLE_NAME}}', handler: 'list' },
  { method: 'get', path: '/{{TABLE_NAME}}/:id', handler: 'read' },
  { method: 'patch', path: '/{{TABLE_NAME}}/:id', handler: 'update' },
  { method: 'delete', path: '/{{TABLE_NAME}}/:id', handler: 'del' },
] as const
