import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first, then .env as fallback. .env.local wins.
const root = process.cwd()
dotenv.config({ path: path.join(root, '.env.local') })
dotenv.config({ path: path.join(root, '.env') })
