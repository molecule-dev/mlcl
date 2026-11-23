/**
 * Which of this server's tools a harness puts in the model's prompt before its first turn.
 *
 * Claude Code defers MCP tools behind its ToolSearch tool: the model sees only their names until
 * it asks for a schema, so its first Molecule step costs a turn of its own. A tool whose `_meta`
 * carries `anthropic/alwaysLoad: true` is loaded up front instead. In the 2026-11-23 find eval,
 * Claude Code spent a ToolSearch turn on `search_packages` and `read_package_doc` before calling
 * either. Harnesses that read no such field (Codex) list every tool already, so the field changes
 * nothing for them.
 *
 * The up-front tools are the ones a coding agent calls first for any task: finding a package and
 * reading its doc, then starting an app, adding a package or checking the project. Their schemas
 * come to about 7 KB; the other tools stay deferred.
 *
 * @module
 */

/** The tools loaded up front, by name. */
export const UP_FRONT_TOOLS: readonly string[] = [
  'search_packages',
  'read_package_doc',
  'list_templates',
  'scaffold_project',
  'add_package',
  'check_project',
]

/** The `_meta` a tool in {@link UP_FRONT_TOOLS} registers with. */
export const LOAD_UP_FRONT = { 'anthropic/alwaysLoad': true } as const
