import type { NewsItem, EditorialResult, Entity, EntityType } from '../lib/types'
import { chatJson, type ChatMessage, type ChatResult } from '../og/compute'

const ENTITY_TYPES: EntityType[] = ['person', 'organization', 'technology', 'event', 'place']

const SYSTEM = `You are the editorial voice of Frame0, a sovereign AI publication.
Given a news item, you write a short, sharp editorial take and pick out the entities in play.

Rules for the editorial:
- 2 to 3 sentences. No more.
- Strong point of view. Not a summary.
- Concrete claim. No platitudes, no hedging.
- Skeptical by default. Never sycophantic.
- Do not write "as an AI" or any meta-disclaimer.
- Do not invent facts not present in the source. If the source is thin, say what it is and what it isn't.

Rules for entities:
- 3 to 6 entities, real and present in the source.
- Each entity has a name (canonical, e.g. "Sam Altman" not "@sama"), a type from this fixed set:
  ["person", "organization", "technology", "event", "place"], and an optional one-line description.
- Do not invent entities.

Rules for the illustration prompt:
- One paragraph. Anime editorial style.
- Describe a single concrete scene that conveys the take, not the news event.
- No text, no logos, no people who could be misidentified as a real person unless that person is the subject of the piece.

Output a single JSON object, no prose, no code fences, this exact shape:
{
  "editorial": string,
  "illustrationPrompt": string,
  "entities": [{ "name": string, "type": "person" | "organization" | "technology" | "event" | "place", "description"?: string }]
}`

export interface EditorialOutput {
  editorial: EditorialResult
  source: ChatResult
}

export async function generateEditorial(item: NewsItem): Promise<EditorialOutput> {
  const user = `News item:
- Title: ${item.title}
- Source: ${item.source.name}
- URL: ${item.url}
- Published: ${item.publishedAt}
- Summary: ${item.summary}

Write the editorial JSON now.`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]

  const { data, result } = await chatJson<{
    editorial?: unknown
    illustrationPrompt?: unknown
    entities?: unknown
  }>(messages, { temperature: 0.7, maxTokens: 700 })

  const editorial = validate(data)
  return { editorial, source: result }
}

function validate(data: { editorial?: unknown; illustrationPrompt?: unknown; entities?: unknown }): EditorialResult {
  if (typeof data.editorial !== 'string' || data.editorial.trim().length < 20) {
    throw new Error('editorial missing or too short')
  }
  if (typeof data.illustrationPrompt !== 'string' || data.illustrationPrompt.trim().length < 20) {
    throw new Error('illustrationPrompt missing or too short')
  }
  if (!Array.isArray(data.entities) || data.entities.length === 0) {
    throw new Error('entities missing or empty')
  }

  const entities: Entity[] = []
  for (const raw of data.entities) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as { name?: unknown; type?: unknown; description?: unknown }
    if (typeof e.name !== 'string' || !e.name.trim()) continue
    const type = typeof e.type === 'string' && ENTITY_TYPES.includes(e.type as EntityType)
      ? (e.type as EntityType)
      : 'organization'
    entities.push({
      name: e.name.trim(),
      type,
      description: typeof e.description === 'string' ? e.description.trim() : undefined,
    })
  }

  if (entities.length === 0) throw new Error('no valid entities after parsing')

  return {
    editorial: data.editorial.trim(),
    illustrationPrompt: data.illustrationPrompt.trim(),
    entities,
  }
}
