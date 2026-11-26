/** The pasteable invocation in command help, scaffold templates and MCP responses. */
export const CLI_COMMAND = 'npx mlcl'

/** Render a bundled template's CLI command placeholders. */
export function renderCliCommands(template) {
  return template.replaceAll('{{CLI_COMMAND}}', CLI_COMMAND)
}
