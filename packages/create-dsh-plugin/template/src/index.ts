import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

// Display name used by harness diagnostics.
export const name = '{{PLUGIN_SHORT_NAME}}'

// 'tools' is provided by the harness. Declaring inject keeps this plugin
// PENDING until the tool registry is ready, and unloads it if the service
// goes away — registration then unwinds with it. Do not remove this line.
export const inject = ['tools']

export function apply(ctx: Context) {
  // Registration is a side effect: when the plugin fiber is disposed
  // (uninstall, hot-reload, service swap) the tool is unregistered for you.
  // Never mutate a tool definition after registering it — dispose and
  // re-register a replacement instead.
  ctx.tools.register(
    defineTool({
      name: 'greet',
      description: 'Greet someone by name.',
      parameters: {
        name: { type: 'string', required: true, description: 'The name to greet' },
        // Types are inferred from this schema and validated before execute()
        // runs. Constraints the schema cannot express (non-empty strings,
        // positive numbers, cross-field rules) must still be checked here.
        punctuation: { type: 'string', description: 'Trailing punctuation, defaults to "!"' },
      },
      output: {
        // Canonical value: the single source of truth persisted and handed
        // to PTC mode. Keep it a plain, useful JSON value.
        schema: { type: 'string' },
        // Model-visible rendering of the canonical value. Keep this a pure
        // function of (args, value) — no I/O, no clock, no randomness.
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        // exec.signal is the operational contract: honor it so in-flight
        // work is cancellable. Pass it into every async call you await.
        if (exec.signal.aborted) {
          throw new Error('greet aborted before it started')
        }
        return `Hello, ${args.name}${args.punctuation ?? '!'}`
      },
    }),
  )
}
