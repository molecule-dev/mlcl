/** Compiled Node entry point for an isolated README check. @module */
import { checkDocsSerial, type DocsCheckRequest } from './docs-check.js'

let completed = false
process.on('disconnect', () => {
  if (!completed) process.exit(1)
})
process.once('message', (request: DocsCheckRequest) => {
  void (async () => {
    if (
      !request?.registry?.packages ||
      typeof request.moleculeDir !== 'string' ||
      !Array.isArray(request.packageNames) ||
      !request.packageNames.every((name) => typeof name === 'string')
    )
      throw new Error('Invalid README check request')
    const result = await checkDocsSerial(
      request.registry,
      request.moleculeDir,
      request.packageNames,
    )
    if (!process.send) throw new Error('README check worker requires IPC')
    process.send(result, (error) => {
      completed = true
      if (error) process.exitCode = 1
      if (process.connected) process.disconnect?.()
    })
  })().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    completed = true
    process.exitCode = 1
    if (process.connected) process.disconnect?.()
  })
})
