// Applies supabase/migrations/*.sql to the hosted project using SUPABASE_DB_URL (no Supabase CLI or Docker needed).
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadEnv } from './env.mjs'

const env = loadEnv(['SUPABASE_DB_URL'])
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())')
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  const done = await client.query('select 1 from public._migrations where name=$1', [f])
  if (done.rowCount) { console.log('skip', f); continue }
  console.log('apply', f)
  try {
    await client.query('begin')
    await client.query(readFileSync(join(dir, f), 'utf8'))
    await client.query('insert into public._migrations(name) values ($1)', [f])
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    console.error('FAILED', f, e.message)
    process.exit(1)
  }
}
await client.query('alter table public._migrations enable row level security')
await client.end()
console.log('migrations up to date')
