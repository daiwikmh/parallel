import { db } from './client'
import { seedEntityAliases } from './repo'
import fs from 'fs'
import path from 'path'

const schemaPath = path.join(import.meta.dir, 'schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')
db.exec(sql)

const ADDITIVE_COLUMNS: Array<{ table: string; column: string; type: string }> = [
  { table: 'briefs', column: 'storage_hash', type: 'TEXT' },
  { table: 'briefs', column: 'chain_tx_hash', type: 'TEXT' },
  { table: 'commissions', column: 'tg_alerts', type: 'INTEGER NOT NULL DEFAULT 1' },
  { table: 'commissions', column: 'tg_briefs', type: 'INTEGER NOT NULL DEFAULT 0' },
]
for (const { table, column, type } of ADDITIVE_COLUMNS) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch (e) {
    if (!String((e as Error).message).includes('duplicate column')) throw e
  }
}

const aliasFkInfo = db.query<{ name: string; sql: string }, []>(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name='entity_aliases'`).get()
if (aliasFkInfo && aliasFkInfo.sql.includes('REFERENCES entities')) {
  db.exec(`DROP TABLE entity_aliases`)
  db.exec(`CREATE TABLE entity_aliases (alias_lower TEXT PRIMARY KEY, entity_id TEXT NOT NULL, created_at INTEGER NOT NULL)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entity_aliases_entity ON entity_aliases(entity_id)`)
}

seedEntityAliases()

const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>
console.log('Tables present:', tables.map((t) => t.name).join(', '))

const counts = tables.map((t) => {
  const row = db.query(`SELECT COUNT(*) as c FROM ${t.name}`).get() as { c: number }
  return `${t.name}=${row.c}`
})
console.log('Row counts:', counts.join('  '))
