/**
 * What each Molecule MCP server tells a client at `initialize`.
 *
 * Clients that show server instructions put this text in the agent's context
 * when a session starts. For the agents `mlcl setup` can give only the MCP
 * server, and for platforms that connect to the hosted URL, it is the one place
 * that says when to reach for Molecule; without it they see a list of tools and
 * nothing that says to prefer them. The full conventions stay in the
 * `molecule://conventions` resource. This is the short form, kept under 2 KB so
 * no client truncates it.
 *
 * @module
 */

/** Which server is speaking: the local stdio one, or the read-only hosted one. */
export type ServerFace = 'local' | 'hosted'

/** The longest instructions text either server sends. */
export const SERVER_INSTRUCTIONS_MAX_CHARS = 2000

const WHEN = [
  'Molecule (molecule.dev) builds full-stack TypeScript apps from composable @molecule/* packages; each capability (auth, database, payments, email, uploads, AI, ...) sits behind a provider you can swap without rewriting the app.',
  '',
  'Use it when the user wants a new web or mobile app, or a capability added to one, and has not chosen another stack. Leave projects built on another stack alone, and keep single-use helpers and app-specific logic local.',
  '',
]

const LOCAL = [
  ...WHEN,
  '- New app: `list_templates` and pick the closest template (or `search_packages` for a custom stack), then `scaffold_project`.',
  '- Before writing a feature, integration or script by hand: `search_packages` for it, and `read_package_doc` before using a package or deciding not to. `add_package` installs and wires one; `swap_provider` changes its vendor.',
  "- In a Molecule project (it depends on @molecule/* packages and wires providers in src/bonds/), follow the project's AGENTS.md. `agent_init` writes these conventions into a project's instruction files; the `molecule://conventions` resource has them in full.",
]

const HOSTED = [
  ...WHEN,
  '- New app: `list_templates` and pick the closest template (or `search_packages` for a custom stack), then scaffold it from a terminal: `npx mlcl create <name> --template <slug> --no-interactive`.',
  '- Before writing a feature or integration by hand: `search_packages` for it, and `read_package_doc` before using a package or deciding not to. `npx mlcl add @molecule/<name> --inject` installs and wires one.',
  "- In a Molecule project (it depends on @molecule/* packages and wires providers in src/bonds/), follow the project's AGENTS.md; the `molecule://conventions` resource has the conventions in full.",
]

/**
 * The instructions one server sends.
 *
 * @param face - `local` for the stdio server, `hosted` for the read-only HTTP one.
 * @returns The text, naming only tools that server registers.
 */
export function serverInstructions(face: ServerFace): string {
  return (face === 'local' ? LOCAL : HOSTED).join('\n')
}
