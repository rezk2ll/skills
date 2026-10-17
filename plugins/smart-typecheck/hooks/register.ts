import type { EngineInterface, Register } from 'claude-code'

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|svelte|vue)$/

const parent = (path: string) => path.slice(0, path.lastIndexOf('/'))

const findCheckProject = async ($: EngineInterface, file: string, root: string, script: string) => {
  for (let dir = parent(file); dir.startsWith(root) && dir.length > 0; dir = parent(dir)) {
    const manifest = `${dir}/package.json`
    if (await $.fs.exists(manifest)) {
      const pkg = JSON.parse(await $.fs.read(manifest))
      return pkg.scripts?.[script] ? dir : undefined
    }
  }
  return undefined
}

export const register: Register = (on, options) => {
  const script = String(options.script || 'check')
  const runner = String(options.packageManager || 'npm')
  const edited = new Set<string>()

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const isEdit = e.tool === 'Edit' || e.tool === 'Write'
    if (isEdit && ran.deny === undefined && !ran.isError && CODE.test(e.file_path)) {
      edited.add(e.file_path)
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined || edited.size === 0) {
      return result
    }

    const files = [...edited]
    edited.clear()
    const root = await $.session.root()
    const projects = new Set<string>()
    for (const file of files) {
      const project = await findCheckProject($, file, root, script)
      if (project) projects.add(project)
    }

    for (const project of projects) {
      const name = project.slice(root.length + 1) || project
      $.ui.status(`${script} ${name}...`)
      const { exitCode } = await $.process.run([runner, 'run', script], { cwd: project, timeoutMs: 180_000 })
      $.ui.status(undefined)
      if (exitCode !== 0) {
        $.ui.toast(`${script} failed in ${name}: run ${runner} run ${script}`)
      }
    }

    return result
  })
}
