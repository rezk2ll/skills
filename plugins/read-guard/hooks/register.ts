import type { Register } from 'claude-code'

const BINARY = /\.(png|jpe?g|gif|webp|svg|pdf|ipynb)$/i

export const register: Register = (on, options) => {
  const maxBytes = Number(options.maxBytes) || 40_000
  const capLines = Number(options.capLines) || 400

  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    if (e.limit !== undefined || e.offset !== undefined || BINARY.test(e.file_path)) {
      return next(e)
    }

    const stat = await $.fs.stat(e.file_path).catch(() => undefined)
    if (stat === undefined || stat.size <= maxBytes) {
      return next(e)
    }

    const ran = await next({ ...e, limit: capLines })
    if (ran.deny !== undefined) {
      return ran
    }

    const note = `read-guard: ${e.file_path} is ${Math.round(stat.size / 1000)} KB, so only its first ${capLines} lines were read. Find the part you need first (Grep, or a code search tool), then Read it with offset/limit.`

    return { ...ran, context: [...(ran.context ?? []), note] }
  })
}
