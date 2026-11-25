/**
 * CLI entry — connects the molecule MCP server over stdio. The server itself
 * lives in server.ts so tests can import it without triggering a transport.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { warmCli } from './cli-command.js'
import { startBackgroundUpdate } from './machine-install.js'
import { moleculeServer } from './server.js'

async function main(): Promise<void> {
  // The client closing stdin ends the session, and clients wait for this process before they
  // exit themselves: exit now, without waiting on a telemetry POST (up to 5 s to a slow
  // collector) or the CLI download still in flight. A tool call's own CLI child goes with it.
  process.stdin.once('end', () => process.exit(0))
  await moleculeServer.connect(new StdioServerTransport())
  // Fetch the CLI (when it is not installed) while the client is still reading the tool list.
  warmCli()
  // A machine install checks for a newer version once a day, after the client has its tools.
  startBackgroundUpdate()
  process.stderr.write('molecule-mcp ready\n')
}

main().catch((e) => {
  process.stderr.write(
    `molecule-mcp failed to start: ${e instanceof Error ? e.message : String(e)}\n`,
  )
  process.exit(1)
})
