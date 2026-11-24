/**
 * `mlcl inject` makes no Anthropic API request unless `--ai` asks for one.
 *
 * AI code generation used to switch on whenever ANTHROPIC_API_KEY was in the environment. Coding
 * agents such as Claude Code run with that key for their own use, so every `mlcl add --inject` they
 * ran made a request billed to it, for the smoke tests' `vi.mock()` block: 5 to 11 s of a 7 to 13 s
 * add in the harness eval, for test files a project Molecule did not create never keeps. The
 * heuristics write the same files, and every scaffold already uses them.
 *
 * The real `ai.ts` runs here; only the SDK is replaced, so the test sees each request it would send.
 *
 * @module
 */
import { rm } from 'node:fs/promises'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: sdk.create }
  },
}))

import Inject from '../../commands/inject.js'
import { disableAI, enableAI, isAIAvailable } from '../ai.js'
import { planInjection, synthesizeProjectFiles } from '../injector.js'
import { createTestProject } from './create-test-project.js'

const PACKAGE = '@molecule/api-resource-device'
const savedKey = process.env.ANTHROPIC_API_KEY
let project: string

beforeAll(async () => {
  project = await createTestProject()
})

afterAll(async () => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = savedKey
  await rm(project, { recursive: true, force: true })
})

afterEach(() => {
  disableAI()
  sdk.create.mockReset()
})

/** Plan and synthesize one injection, the way `mlcl inject -m <package>` does. */
async function synthesize(): Promise<void> {
  const plan = await planInjection(PACKAGE, project)
  expect(plan.moleculePackage, 'the plan must resolve for this test').toBeTruthy()
  await synthesizeProjectFiles([plan], [PACKAGE], project)
}

describe('AI code generation is opt-in', () => {
  it('sends no request with ANTHROPIC_API_KEY set and no --ai (OLD MUSTFAIL)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    expect(isAIAvailable()).toBe(false)
    await synthesize()
    expect(sdk.create).not.toHaveBeenCalled()
  })

  it('counterexample: --ai with a key asks the model', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    sdk.create.mockResolvedValue({
      content: [{ type: 'text', text: '```ts\nexport const generated = true\n```' }],
    })
    enableAI()
    expect(isAIAvailable()).toBe(true)
    await synthesize()
    expect(sdk.create).toHaveBeenCalled()
  })

  it('--ai without a key uses the heuristics', () => {
    delete process.env.ANTHROPIC_API_KEY
    enableAI()
    expect(isAIAvailable()).toBe(false)
  })

  it('builds no smoke tests (and asks for no vi.mock block) for a project that keeps its own (OLD MUSTFAIL)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    sdk.create.mockResolvedValue({
      content: [{ type: 'text', text: '```ts\nexport const generated = true\n```' }],
    })
    enableAI()
    const plan = await planInjection(PACKAGE, project)
    const files = await synthesizeProjectFiles([plan], [PACKAGE], project, undefined, undefined, {
      smokeTests: false,
    })
    expect(
      files.filter((file) => file.targetPath.includes('__tests__')).map((f) => f.targetPath),
    ).toEqual([])
    const mockRequests = sdk.create.mock.calls.filter(([request]) =>
      JSON.stringify(request).includes('Generate vi.mock()'),
    )
    expect(mockRequests).toHaveLength(0)
    // Counterexample: a Molecule project still gets them.
    const own = await synthesizeProjectFiles([plan], [PACKAGE], project)
    expect(own.some((file) => file.targetPath.includes('__tests__'))).toBe(true)
  })

  it('the inject command leaves it off unless --ai is passed (OLD MUSTFAIL)', () => {
    expect(Inject.flags.ai.default).toBe(false)
    expect(Inject.flags.ai.allowNo, '`--no-ai` (create, scripts) must still parse').toBe(true)
  })
})
