import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const parentURL = context.parentURL ? new URL(context.parentURL) : null
      if (parentURL && parentURL.protocol === 'file:') {
        for (const ext of ['.ts', '.tsx', '.js', '/index.ts']) {
          const targetURL = new URL(specifier + ext, parentURL)
          if (existsSync(fileURLToPath(targetURL))) {
            return nextResolve(targetURL.href, context)
          }
        }
      }
    }
    throw err
  }
}
