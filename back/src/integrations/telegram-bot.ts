interface TelegramUpdate {
  update_id: number
  message?: {
    chat: { id: number; type: string; username?: string; first_name?: string }
    text?: string
  }
}

let lastUpdateId = 0
let polling = false
let stopped = false

function token(): string | null {
  return process.env.TG_BOT_TOKEN ?? null
}

async function sendMessage(chatId: number | string, text: string): Promise<void> {
  const t = token()
  if (!t) return
  try {
    await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(7_000),
    })
  } catch (e) {
    console.warn('[tg-bot] sendMessage failed:', (e as Error).message)
  }
}

async function pollOnce(): Promise<void> {
  const t = token()
  if (!t) return
  try {
    const url = `https://api.telegram.org/bot${t}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    const body = (await res.json()) as { ok?: boolean; result?: TelegramUpdate[] }
    if (!body.ok || !body.result) return
    for (const upd of body.result) {
      lastUpdateId = Math.max(lastUpdateId, upd.update_id)
      if (!upd.message) continue
      const chatId = upd.message.chat.id
      const text = (upd.message.text ?? '').trim()
      const name = upd.message.chat.first_name ?? upd.message.chat.username ?? 'there'
      if (text === '/start' || text.toLowerCase().startsWith('/help')) {
        await sendMessage(
          chatId,
          `Hi ${name} — welcome to OG Times.\n\nYour chat ID is: ${chatId}\n\nPaste this into the OG Times sidebar (Telegram section) and your alerts will be delivered here.`,
        )
      } else if (text.toLowerCase() === '/id' || text.toLowerCase() === '/chatid') {
        await sendMessage(chatId, `Your chat ID is: ${chatId}`)
      } else {
        await sendMessage(chatId, `Your chat ID is: ${chatId}\n\nSend /start for setup instructions.`)
      }
    }
  } catch (e) {
    if (!stopped) console.warn('[tg-bot] poll error:', (e as Error).message)
  }
}

export function startTelegramBot(): void {
  if (polling) return
  if (!token()) {
    console.log('[tg-bot] TG_BOT_TOKEN not set; bot loop not started')
    return
  }
  polling = true
  console.log('[tg-bot] long-poll loop started')
  const loop = async (): Promise<void> => {
    while (!stopped) {
      await pollOnce()
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  void loop()
}

export function stopTelegramBot(): void {
  stopped = true
  polling = false
}
