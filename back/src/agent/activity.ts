export type ActivityAction =
  | 'SCAN'
  | 'PICK'
  | 'WRITE'
  | 'DONE'
  | 'ERROR'

export interface ActivityEvent {
  timestamp: number
  action: ActivityAction
  detail: string
}

const MAX_EVENTS = 50
const events: ActivityEvent[] = []

export function addActivity(action: ActivityAction, detail: string): ActivityEvent {
  const e: ActivityEvent = { timestamp: Date.now(), action, detail }
  events.unshift(e)
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
  return e
}

export function getActivity(limit = 20): ActivityEvent[] {
  return events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)))
}

export function clearActivity(): void {
  events.length = 0
}
