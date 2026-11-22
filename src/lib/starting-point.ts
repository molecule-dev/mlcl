/**
 * How a coding agent chooses the starting point of a new app: a flagship template or a custom
 * stack of packages.
 *
 * These are the rules the Molecule harness's own starting-point selection follows (molecule.dev's
 * selection step): judge a template on its full catalog, start from one only when it covers the
 * core of the request and is the right size for it, use `static-site` for a site with no server,
 * and otherwise build a custom stack with SQLite unless another database is needed. Every surface
 * another harness reads — the `mlcl templates` header, the conventions section, the
 * build-with-molecule skill and the MCP tools — prints these same lines, so a harness makes the
 * choice the same way wherever it reads about templates. Tests hold each surface to this text.
 *
 * @module
 */

/**
 * The rules, one bullet each, with `cli` as the command prefix (`mlcl` where the CLI itself is
 * printing, `npx mlcl` in documents a harness reads before mlcl is installed).
 *
 * @param cli - The command prefix to show.
 * @returns The rule lines, without bullet characters.
 */
export function startingPointRules(cli = 'npx mlcl'): string[] {
  return [
    `Read the catalog of each strong candidate (at most ~4): \`${cli} templates <slug>\` shows its data model, API handlers, screens and integrations. The one-line descriptions undersell templates; judge fit on the catalog.`,
    'Start from a template only if it covers the core of the request, not because it is the closest match. When two fit, take the one whose data model and screens are most specific to what is being built.',
    'Right-size it: a simple app (a to-do list, a habit tracker, notes) gets a lean template or a small custom stack, never a feature-heavy template (billing, teams, push, calendar) whose features nobody asked for.',
    'A site with no accounts, server or database (a blog, docs, a portfolio, a landing page) is the `static-site` template.',
    'A template keeps the database its migrations were written for. When the user names a database no fitting template uses, build a custom stack with it.',
    `Otherwise build a custom stack: \`${cli} search <capability>\` for each capability the app needs (at most ~5 searches), then \`${cli} create <name> --type full-stack --framework react --packages <the packages found> --no-interactive\`. Include \`@molecule/api-database-sqlite\` unless the user named another database or the app needs PostgreSQL (high concurrency, complex queries, \`@molecule/api-search-postgres\`).`,
    'Decide as soon as you can judge fit, then scaffold.',
  ]
}

/** The sentence that introduces the rules. */
export const STARTING_POINT_LEAD =
  'Each template is a complete app with its own data model, API and screens, so choose the starting point deliberately:'

/**
 * The rules as a Markdown list under their lead sentence, the form the conventions section and the
 * build-with-molecule skill carry verbatim.
 *
 * @param cli - The command prefix to show.
 * @param indent - Spaces before each line, for a list nested under a numbered step.
 * @returns The Markdown block, without a trailing newline.
 */
export function startingPointMarkdown(cli = 'npx mlcl', indent = ''): string {
  return [
    `${indent}${STARTING_POINT_LEAD}`,
    '',
    ...startingPointRules(cli).map((rule) => `${indent}- ${rule}`),
  ].join('\n')
}
