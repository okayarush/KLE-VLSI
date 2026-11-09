import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Reads web/.env.local (git-ignored) merged over process.env; exits with a clear message if a required key is missing. */
export function loadEnv(required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL']) {
  const p = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
  const env = { ...process.env }
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  for (const k of required) if (!env[k]) { console.error(`Missing ${k} in web/.env.local`); process.exit(2) }
  return env
}
