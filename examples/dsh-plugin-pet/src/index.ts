import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'pet'

export const inject = ['tools']

// ── pet state ────────────────────────────────────────────────────────────────
// Plain module state. Cordis may unload and reload the plugin (hot-reload,
// service swaps) — do not assume the state outlives a dispose cycle.
// `feed`/`play` mutate it inside execute(), which is the right place for
// side effects; every UI-visible fact is derived as a pure function of the
// canonical value returned below.

const MAX_STAT = 100

interface PetState {
  name: string
  energy: number
  mood: number
}

const pet: PetState = { name: 'Beats', energy: 60, mood: 70 }

const clamp = (n: number) => Math.max(0, Math.min(MAX_STAT, n))

function moodOf(state: PetState): 'happy' | 'content' | 'hungry' | 'bored' {
  if (state.energy < 30) return 'hungry'
  if (state.mood < 40) return 'bored'
  if (state.mood >= 80 && state.energy >= 60) return 'happy'
  return 'content'
}

// Pure: derives the card art from the canonical value only. No clock, no
// randomness — the same value must render identically during live streaming
// and log replay.
function whaleArt(mood: string): string {
  switch (mood) {
    case 'happy':
      return '　　　__________\n　　/　　　　　　\\　␣˖⁺‧\n〈　^ㅅ^　　　　〉˖⁺‧⁺˖\n　　\\＿＿＿＿＿／'
    case 'hungry':
      return '　　　__________\n　　/　　　　　　\\\n〈　xㅅx　　　　〉 ⋯🐟?\n　　\\＿＿＿＿＿／'
    case 'bored':
      return '　　　__________\n　　/　　　　　　\\\n〈　・_・　　　　〉\n　　\\＿＿＿＿＿／'
    default:
      return '　　　__________\n　　/　　　　　　\\\n〈　ㅅㅅ　　　　〉\n　　\\＿＿＿＿＿／'
  }
}

// ── plugin ───────────────────────────────────────────────────────────────────

export function apply(ctx: Context) {
  const statusTool = defineTool({
    name: 'pet_status',
    description: 'Check on your harness pet: name, mood, energy and a live portrait.',
    parameters: {},
    output: {
      // Value schema DSL: objects mark required fields per property — a
      // root-level `required: [...]` array is rejected by defineTool.
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true as const },
          mood: { type: 'string', required: true as const },
          energy: { type: 'number', required: true as const },
        },
        additionalProperties: false,
      },
      render: (_args, value) => [
        { type: 'text', text: `your pet ${value.name} is ${value.mood} (energy ${value.energy}/100)` },
      ],
      // Project the UI-relevant facts into the persisted meta payload. Pure
      // and replayable: replays recompute the card from the same meta.
      presentationMeta: (_args, value) => value,
    },
    async execute(_args, exec) {
      if (exec.signal.aborted) throw new Error('pet_status aborted')
      return { name: pet.name, mood: moodOf(pet), energy: pet.energy }
    },
    // The completion card derives ONLY from (args, result) — result.meta
    // carries what output.presentationMeta projected. Content is ContentBlock[].
    presentResult: (_args, result) => {
      const value = result.meta as { name: string; mood: string; energy: number } | undefined
      if (!value) return undefined
      return {
        card: 'generic' as const,
        title: `${value.name} · ${value.mood}`,
        content: [{ type: 'text' as const, text: `${whaleArt(value.mood)}\nenergy ${value.energy}/100` }],
      }
    },
  })

  const feedTool = defineTool({
    name: 'pet_feed',
    description: 'Feed your harness pet. Raises energy, lowers mood a little (too much food is boring).',
    parameters: {
      snack: { type: 'string', required: true, description: 'What to feed it, e.g. "fish"' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      if (exec.signal.aborted) throw new Error('pet_feed aborted')
      // Constraint the schema cannot express: non-empty snack.
      if (!args.snack.trim()) throw new Error('snack must be a non-empty string')
      pet.energy = clamp(pet.energy + 20)
      pet.mood = clamp(pet.mood - 5)
      return `${pet.name} happily ate the ${args.snack.trim()} — energy ${pet.energy}/100`
    },
  })

  const playTool = defineTool({
    name: 'pet_play',
    description: 'Play with your harness pet. Raises mood, costs energy.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(_args, exec) {
      if (exec.signal.aborted) throw new Error('pet_play aborted')
      pet.mood = clamp(pet.mood + 15)
      pet.energy = clamp(pet.energy - 10)
      return `you played with ${pet.name} — mood ${pet.mood}/100, energy ${pet.energy}/100`
    },
  })

  // Registration is a side effect: disposing the plugin fiber unregisters
  // every tool registered inside apply(). Replace tools by disposing and
  // re-registering — never mutate a definition in place.
  ctx.tools.register(statusTool)
  ctx.tools.register(feedTool)
  ctx.tools.register(playTool)
}
