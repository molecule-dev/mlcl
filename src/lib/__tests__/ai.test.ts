/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
    _mockCreate: mockCreate,
  }
})

// Access the mock after vi.mock
import * as sdk from '@anthropic-ai/sdk'
const mockCreate = (sdk as any)._mockCreate as ReturnType<typeof vi.fn>

describe('ai', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('isAIAvailable', () => {
    it('should return true when ANTHROPIC_API_KEY is set', async () => {
      const origKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      try {
        // Re-import to get fresh module
        const { isAIAvailable } = await import('../ai.js')
        expect(isAIAvailable()).toBe(true)
      } finally {
        if (origKey !== undefined) {
          process.env.ANTHROPIC_API_KEY = origKey
        } else {
          delete process.env.ANTHROPIC_API_KEY
        }
      }
    })

    it('should return false when ANTHROPIC_API_KEY is not set', async () => {
      const origKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      try {
        const { isAIAvailable } = await import('../ai.js')
        expect(isAIAvailable()).toBe(false)
      } finally {
        if (origKey !== undefined) {
          process.env.ANTHROPIC_API_KEY = origKey
        }
      }
    })
  })

  describe('generateCode', () => {
    it('should call Anthropic API with correct params', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '```typescript\nconsole.log("hello")\n```' }],
      })

      const { generateCode } = await import('../ai.js')
      const result = await generateCode('system prompt', 'context', 'task')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-5-5',
          max_tokens: 8192,
          system: 'system prompt',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'context', cache_control: { type: 'ephemeral' } },
                { type: 'text', text: 'task' },
              ],
            },
          ],
        }),
      )
      expect(result).toBe('console.log("hello")')
    })

    it('should extract code from typescript fence', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '```typescript\nconst x = 1;\n```' }],
      })

      const { generateCode } = await import('../ai.js')
      const result = await generateCode('sys', 'ctx', 'task')

      expect(result).toBe('const x = 1;')
    })

    it('should extract code from ts fence', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '```ts\nconst y = 2;\n```' }],
      })

      const { generateCode } = await import('../ai.js')
      const result = await generateCode('sys', 'ctx', 'task')

      expect(result).toBe('const y = 2;')
    })

    it('should fall back to raw text when no fence', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'const z = 3;' }],
      })

      const { generateCode } = await import('../ai.js')
      const result = await generateCode('sys', 'ctx', 'task')

      expect(result).toBe('const z = 3;')
    })

    it('should throw on non-text response blocks', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      })

      const { generateCode } = await import('../ai.js')
      await expect(generateCode('sys', 'ctx', 'task')).rejects.toThrow(
        'Unexpected AI response type',
      )
    })
  })

  describe('generateCodeBatch', () => {
    it('should run tasks in parallel and return map', async () => {
      let callIndex = 0
      mockCreate.mockImplementation(async () => {
        callIndex++
        return {
          content: [{ type: 'text', text: `code-${callIndex}` }],
        }
      })

      const { generateCodeBatch } = await import('../ai.js')
      const results = await generateCodeBatch('sys', 'ctx', [
        { key: 'a', task: 'task-a' },
        { key: 'b', task: 'task-b' },
      ])

      expect(results.size).toBe(2)
      expect(results.has('a')).toBe(true)
      expect(results.has('b')).toBe(true)
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })
  })
})
