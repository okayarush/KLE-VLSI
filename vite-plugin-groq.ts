import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
]

let cachedResolvedModel: string | null = null
let loadedViteEnv: Record<string, string> = {}
let configRootDir = process.cwd()

function getGroqKey(): string | null {
  // 1. Check Vite's loaded env
  if (loadedViteEnv.GROQ_API_KEY && loadedViteEnv.GROQ_API_KEY.trim()) {
    const val = loadedViteEnv.GROQ_API_KEY.trim()
    if (!val.includes('your_groq_key_here')) return val
  }

  // 2. Check process.env
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    const val = process.env.GROQ_API_KEY.trim()
    if (!val.includes('your_groq_key_here')) return val
  }

  // 3. Search potential .env.local locations dynamically
  const candidateDirs = [
    configRootDir,
    process.cwd(),
    join(process.cwd(), 'web'),
    join(process.cwd(), '..'),
    ...(typeof import.meta.dirname === 'string'
      ? [import.meta.dirname, join(import.meta.dirname, '..'), join(import.meta.dirname, 'web')]
      : []),
  ]

  const candidateFileNames = ['.env.local', '.env']

  for (const dir of candidateDirs) {
    for (const fileName of candidateFileNames) {
      const fullPath = join(dir, fileName)
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf8')
          for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim()
            if (trimmed.startsWith('#')) continue
            const m = trimmed.match(/^GROQ_API_KEY\s*=\s*(.*)$/)
            if (m && m[1]) {
              const val = m[1].trim().replace(/^["']|["']$/g, '')
              if (val && !val.includes('your_groq_key_here')) {
                return val
              }
            }
          }
        } catch {
          // ignore read error and try next candidate
        }
      }
    }
  }

  return null
}

async function resolveWorkingModel(apiKey: string): Promise<string> {
  if (cachedResolvedModel) return cachedResolvedModel

  try {
    const resp = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (resp.ok) {
      const data = (await resp.json()) as any
      const availableIds: string[] = (data.data || []).map((m: any) => m.id)
      for (const candidate of CANDIDATE_MODELS) {
        if (availableIds.includes(candidate)) {
          cachedResolvedModel = candidate
          console.log(`[Groq AI] Resolved active model: ${candidate}`)
          return candidate
        }
      }
    }
  } catch (err) {
    console.warn('[Groq AI] Model discovery request failed, falling back to default:', err)
  }

  // Fallback to first candidate
  cachedResolvedModel = CANDIDATE_MODELS[0]
  return cachedResolvedModel
}

async function callGroqWithFallback(
  apiKey: string,
  requestPayload: {
    systemPrompt: string
    userPrompt: string
    temperature?: number
    max_tokens?: number
    response_format?: any
  },
): Promise<{ ok: boolean; status: number; content?: string; error?: any }> {
  const preferredModel = await resolveWorkingModel(apiKey)
  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
  ]

  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      const resp = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: requestPayload.temperature ?? 0.2,
          max_tokens: requestPayload.max_tokens ?? 3000,
          response_format: requestPayload.response_format ?? { type: 'json_object' },
          messages: [
            { role: 'system', content: requestPayload.systemPrompt },
            { role: 'user', content: requestPayload.userPrompt },
          ],
        }),
      })

      const result = (await resp.json()) as any

      if (resp.ok) {
        cachedResolvedModel = model
        const content = result.choices?.[0]?.message?.content ?? '{}'
        return { ok: true, status: 200, content }
      }

      // If model not found (404), continue loop to next candidate
      if (resp.status === 404 || result?.error?.code === 'model_not_found') {
        console.warn(`[Groq AI] Model ${model} returned 404, attempting fallback candidate...`)
        lastError = result
        continue
      }

      // If other API error (e.g. rate limit, bad request), return immediately
      return { ok: false, status: resp.status, error: result }
    } catch (err: any) {
      lastError = { message: err?.message }
    }
  }

  return { ok: false, status: 502, error: lastError }
}

function createAiMiddleware() {
  return async (req: any, res: any, next: any) => {
    if (!req.url?.startsWith('/api/ai/')) return next()

    // Handle CORS / preflight
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    const apiKey = getGroqKey()

    // Endpoint: GET /api/ai/health
    if (req.url === '/api/ai/health' && req.method === 'GET') {
      const activeModel = apiKey ? await resolveWorkingModel(apiKey) : CANDIDATE_MODELS[0]
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          ok: true,
          configured: !!apiKey,
          model: activeModel,
          candidateModels: CANDIDATE_MODELS,
          provider: 'Groq Cloud LPU',
        }),
      )
      return
    }

    // Only POST for AI generation endpoints
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end('Method Not Allowed')
      return
    }

    if (!apiKey) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: 'GROQ_API_KEY_MISSING',
          message:
            'GROQ_API_KEY is not set in web/.env.local. Please set GROQ_API_KEY=gsk_... to enable real-life AI Mentor.',
        }),
      )
      return
    }

    // Read body
    let body = ''
    req.on('data', (chunk: any) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}')

        // Route: POST /api/ai/questions
        if (req.url === '/api/ai/questions') {
          const result = await callGroqWithFallback(apiKey, {
            systemPrompt: data.systemPrompt,
            userPrompt: data.userPrompt,
            temperature: 0.2,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          if (!result.ok) {
            res.end(JSON.stringify(result.error ?? { error: 'GROQ_CALL_FAILED' }))
            return
          }
          res.end(result.content)
          return
        }

        // Route: POST /api/ai/viva
        if (req.url === '/api/ai/viva') {
          const result = await callGroqWithFallback(apiKey, {
            systemPrompt: data.systemPrompt,
            userPrompt: data.userPrompt,
            temperature: 0.2,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          if (!result.ok) {
            res.end(JSON.stringify(result.error ?? { error: 'GROQ_CALL_FAILED' }))
            return
          }
          res.end(result.content)
          return
        }

        // Route: POST /api/ai/analyze
        if (req.url === '/api/ai/analyze') {
          const result = await callGroqWithFallback(apiKey, {
            systemPrompt: data.systemPrompt,
            userPrompt: data.userPrompt,
            temperature: 0.2,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          if (!result.ok) {
            res.end(JSON.stringify(result.error ?? { error: 'GROQ_CALL_FAILED' }))
            return
          }
          res.end(result.content)
          return
        }

        res.statusCode = 404
        res.end('Unknown AI endpoint')
      } catch (err: any) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'AI_INTERNAL_ERROR', message: err?.message }))
      }
    })
  }
}

export function groqAiPlugin(): Plugin {
  return {
    name: 'groq-ai-plugin',
    configResolved(config) {
      configRootDir = config.root || process.cwd()
      try {
        loadedViteEnv = {
          ...loadEnv(config.mode, configRootDir, ''),
          ...loadEnv(config.mode, process.cwd(), ''),
        }
      } catch {
        // fallback
      }
      const key = getGroqKey()
      console.log(`[Groq AI Plugin] Initialized. GROQ_API_KEY detected: ${key ? 'YES (configured)' : 'NO (missing in .env.local)'}`)
    },
    configureServer(server) {
      server.middlewares.use(createAiMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createAiMiddleware())
    },
  }
}
