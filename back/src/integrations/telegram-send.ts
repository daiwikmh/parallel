export async function sendTelegramText(chatId: string, text: string): Promise<string> {
  const token = process.env.TG_BOT_TOKEN
  if (!token) return 'telegram:no-token'
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(7_000),
    })
    const body = (await r.json()) as { ok?: boolean; description?: string }
    return body.ok ? 'telegram' : `telegram:err:${body.description?.slice(0, 60) ?? 'unknown'}`
  } catch (e) {
    return `telegram:err:${(e as Error).message.slice(0, 60)}`
  }
}
