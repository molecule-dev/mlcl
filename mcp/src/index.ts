/**
 * CLI entry — connects the molecule MCP server over stdio. The server itself
 * lives in server.ts so tests can import it without triggering a transport.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { warmCli } from './cli-command.js'
import { moleculeServer } from './server.js'

async function main(): Promise<void> {
  await moleculeServer.connect(new StdioServerTransport())
  // Fetch the CLI (when it is not installed) while the client is still reading the tool list.
  warmCli()
  process.stderr.write('molecule-mcp ready\n')
}

main().catch((e) => {
  process.stderr.write(
    `molecule-mcp failed to start: ${e instanceof Error ? e.message : String(e)}\n`,
  )
  process.exit(1)
})
