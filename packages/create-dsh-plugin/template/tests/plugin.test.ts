import { describe, expect, it, vi } from 'vitest'
import { apply, name } from '../src/index.js'

interface RegisteredTool {
  name: string
  description: string
  // defineTool compiles the parameters DSL into a JSON Schema:
  // `required: true` on a field becomes a root-level `required: string[]`.
  parameters: {
    type: string
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
  output: { schema: unknown; render: (args: unknown, value: unknown) => unknown[] }
  execute: (args: Record<string, unknown>, exec: { signal: AbortSignal }) => Promise<unknown>
}

function createMockContext() {
  const registered: RegisteredTool[] = []
  const ctx = {
    tools: {
      register: vi.fn((tool: RegisteredTool) => {
        registered.push(tool)
      }),
    },
  }
  return { ctx, registered }
}

describe('{{PLUGIN_SHORT_NAME}}', () => {
  it('exposes the metadata the loader expects', () => {
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('registers a well-formed tool', () => {
    const { ctx, registered } = createMockContext()
    apply(ctx as never)

    expect(ctx.tools.register).toHaveBeenCalledOnce()
    const tool = registered[0]
    expect(tool.name).toBe('greet')
    expect(tool.description).toBeTruthy()
    // The DSL is compiled to JSON Schema: the field is required via the
    // root-level required array, not a per-field flag.
    expect(tool.parameters.properties.name).toMatchObject({ type: 'string' })
    expect(tool.parameters.required).toContain('name')
    expect(tool.output.schema).toBeDefined()
    expect(typeof tool.output.render).toBe('function')
    expect(typeof tool.execute).toBe('function')
  })

  it('execute() returns the canonical value declared by output.schema', async () => {
    const { registered } = createMockContext()
    apply({ tools: { register: (t: RegisteredTool) => registered.push(t) } } as never)

    const tool = registered[0]
    const value = await tool.execute({ name: 'Ada' }, { signal: new AbortController().signal })
    expect(value).toBe('Hello, Ada!')

    const rendered = tool.output.render({ name: 'Ada' }, value)
    expect(rendered).toEqual([{ type: 'text', text: 'Hello, Ada!' }])
  })

  it('execute() honors the abort signal', async () => {
    const { registered } = createMockContext()
    apply({ tools: { register: (t: RegisteredTool) => registered.push(t) } } as never)

    const controller = new AbortController()
    controller.abort()
    await expect(
      registered[0].execute({ name: 'Ada' }, { signal: controller.signal }),
    ).rejects.toThrow(/aborted/)
  })
})
