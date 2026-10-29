/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { renderLlmsTxt } from './src/lib/llms'
import { parseRun, type Bench, type Run, type WorkbenchMeta } from './src/lib/results'

const REPO = resolve(__dirname, '..')
const DASHBOARD_URL = 'https://hyperxq.github.io/Project-Builder-workbenches-/'

// The app reads scorecards through import.meta.glob, which only exists inside
// Vite's module graph; the config runs in plain Node, so it reads them itself.
function readResults(): { meta: Map<string, WorkbenchMeta>; runs: Run[] } {
  const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
  const meta = new Map<string, WorkbenchMeta>()
  const runs: Run[] = []
  for (const workbench of readdirSync(REPO).filter((name) => name.startsWith('workbench-'))) {
    const metaPath = join(REPO, workbench, 'workbench.json')
    if (existsSync(metaPath)) meta.set(workbench, readJson(metaPath))
    const results = join(REPO, workbench, 'results')
    if (!existsSync(results)) continue
    for (const dir of readdirSync(results)) {
      const benchPath = join(results, dir, 'bench.json')
      const run = existsSync(benchPath) ? parseRun(benchPath, readJson(benchPath) as Bench) : null
      if (run) runs.push(run)
    }
  }
  return { meta, runs }
}

function llmsTxt(): Plugin {
  const render = () => {
    const { meta, runs } = readResults()
    return renderLlmsTxt(meta, runs, { generatedAt: new Date().toISOString(), siteUrl: DASHBOARD_URL })
  }
  return {
    name: 'llms-txt',
    configureServer(server) {
      server.middlewares.use('/llms.txt', (_req, res) => {
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end(render())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: render() })
    },
  }
}

export default defineConfig({
  server: {
    port: 3020,
    strictPort: true,
    fs: {
      // bench.json files live in the sibling workbench folders
      allow: ['..'],
    },
  },
  preview: {
    port: 3020,
    strictPort: true,
  },
  plugins: [react(), tailwindcss(), llmsTxt()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
