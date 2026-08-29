import { describe, expect, it, vi } from 'vitest'
import { apply, name } from '../src/index.js'

type AnyTool = {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: { schema: unknown; render: (args: never, value: never) => unknown[] }
  execute: (args: Record<string, unknown>, exec: { signal: AbortSignal }) => Promise<unknown>
  presentResult?: (args: unknown, result: { meta?: unknown; isError?: boolean }) => unknown
}

function harness() {
  const tools = new Map<string, AnyTool>()
  apply({
    tools: {
      register: vi.fn((tool: AnyTool) => {
        tools.set(tool.name, tool)
      }),
    },
  } as never)
  const signal = () => new AbortController().signal
  return {
    tools,
    run: (tool: string, args: Record<string, unknown> = {}) => tools.get(tool)!.execute(args, { signal: signal() }),
  }
}

describe('dsh-plugin-pet', () => {
  it('exposes the metadata the loader expects', () => {
    expect(name).toBe('pet')
  })

  it('registers three well-formed tools', () => {
    const { tools } = harness()
    expect([...tools.keys()].sort()).toEqual(['pet_feed', 'pet_play', 'pet_status'])
    for (const tool of tools.values()) {
      expect(tool.description).toBeTruthy()
      expect(tool.output.schema).toBeDefined()
      expect(typeof tool.output.render).toBe('function')
    }
  })

  it('feeding raises energy', async () => {
    const { run } = harness()
    const before = await run('pet_status')
    await run('pet_feed', { snack: 'fish' })
    const after = await run('pet_status')
    expect((after as { energy: number }).energy).toBeGreaterThan((before as { energy: number }).energy)
  })

  it('playing raises mood and costs energy', async () => {
    const { run } = harness()
    const before = (await run('pet_status')) as { mood: string; energy: number }
    await run('pet_play')
    const after = (await run('pet_status')) as { mood: string; energy: number }
    expect(after.energy).toBeLessThan(before.energy)
    // mood is a string label ('hungry' | 'bored' | 'content' | 'happy') —
    // playing must move it up the ladder, not down.
    const ladder = ['hungry', 'bored', 'content', 'happy']
    expect(ladder.indexOf(after.mood)).toBeGreaterThanOrEqual(ladder.indexOf(before.mood))
  })

  it('rejects empty snacks (schema-inexpressible constraint checked in execute)', async () => {
    const { run } = harness()
    await expect(run('pet_feed', { snack: '  ' })).rejects.toThrow(/non-empty/)
  })

  it('presentResult is a pure function of the persisted meta', async () => {
    const { tools, run } = harness()
    const value = await run('pet_status')
    const card1 = tools.get('pet_status')!.presentResult?.({}, { meta: value })
    const card2 = tools.get('pet_status')!.presentResult?.({}, { meta: value })
    expect(card1).toEqual(card2)
    expect(JSON.stringify(card1)).toContain('energy')
  })
})
