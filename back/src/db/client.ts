import '../lib/env'
import { Database } from 'bun:sqlite'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.OG_DB_PATH ?? path.join(process.cwd(), 'data', 'og-times.db')
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(dbPath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

export function now(): number {
  return Date.now()
}

export function tx<T>(fn: () => T): T {
  const wrapped = db.transaction(fn)
  return wrapped()
}
