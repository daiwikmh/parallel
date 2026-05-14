import { db } from './client'
import fs from 'fs'
import path from 'path'

const schemaPath = path.join(import.meta.dir, 'schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')
db.exec(sql)

const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>
console.log('Tables present:', tables.map((t) => t.name).join(', '))

const counts = tables.map((t) => {
  const row = db.query(`SELECT COUNT(*) as c FROM ${t.name}`).get() as { c: number }
  return `${t.name}=${row.c}`
})
console.log('Row counts:', counts.join('  '))
