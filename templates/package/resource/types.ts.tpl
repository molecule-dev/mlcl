/**
 * {{PASCAL_NAME}} types.
 *
 * @module
 */

export interface {{PASCAL_NAME}} {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

export type Create{{PASCAL_NAME}}Input = Omit<{{PASCAL_NAME}}, 'id' | 'createdAt' | 'updatedAt'>
export type Update{{PASCAL_NAME}}Input = Partial<Create{{PASCAL_NAME}}Input>
