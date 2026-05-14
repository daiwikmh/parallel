import '../lib/env'
import OpenAI from 'openai'

const apiKey = process.env.OG_INFERENCE_API
const baseURL = process.env.OG_INFERENCE_URL ?? 'https://router-api-testnet.integratenetwork.work/v1'

if (!apiKey) {
  console.warn('[og/compute] OG_INFERENCE_API not set — 0G inference disabled')
}

const client = apiKey ? new OpenAI({ baseURL, apiKey }) : null

export const DEFAULT_MODEL = process.env.OG_INFERENCE_MODEL ?? 'qwen/qwen-2.5-7b-instruct'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export interface OgTrace {
  request_id: string
  provider?: string
  billing?: {
    input_cost?: string
    output_cost?: string
    total_cost?: string
  }
}

export interface ChatResult {
  text: string
  model: string
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
  finishReason?: string
  trace?: OgTrace
}

export function isAvailable(): boolean {
  return client !== null
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  if (!client) throw new Error('0G inference disabled: OG_INFERENCE_API not set')

  const model = opts.model ?? DEFAULT_MODEL
  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
  })

  const choice = res.choices[0]
  const rawTrace = (res as unknown as { x_0g_trace?: OgTrace }).x_0g_trace
  return {
    text: choice?.message?.content ?? '',
    model: res.model,
    finishReason: choice?.finish_reason ?? undefined,
    usage: res.usage
      ? {
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          totalTokens: res.usage.total_tokens,
        }
      : undefined,
    trace: rawTrace && typeof rawTrace === 'object' ? rawTrace : undefined,
  }
}

export async function chatJson<T>(messages: ChatMessage[], opts: Omit<ChatOptions, 'json'> = {}): Promise<{ data: T; result: ChatResult }> {
  const result = await chat(messages, { ...opts, json: true })
  const raw = stripCodeFences(result.text)
  try {
    return { data: JSON.parse(raw) as T, result }
  } catch {
    throw new Error(`Model did not return valid JSON. Raw output: ${raw.slice(0, 300)}`)
  }
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  return trimmed
}
