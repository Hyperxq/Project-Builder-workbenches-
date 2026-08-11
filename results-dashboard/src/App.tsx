import { WorkbenchSection } from './components/workbench-section'
import { groupByWorkbench, loadRuns } from './lib/results'

export default function App() {
  const runs = loadRuns()
  const workbenches = [...groupByWorkbench(runs).entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
      <header className="border-b border-hairline py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Workbench Results</h1>
        <p className="mt-1 text-sm text-body">
          Measured runs from every <span className="font-mono text-xs">workbench-*/results/</span>{' '}
          scorecard — schematics vs by-hand, cost, time and definition of done.
        </p>
      </header>

      <main>
        {workbenches.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No results yet</p>
            <p className="mt-1 text-sm text-mute">
              Run a measured benchmark (<span className="font-mono text-xs">claude-runner/bench.sh</span>)
              and refresh — scorecards are picked up automatically.
            </p>
          </div>
        ) : (
          workbenches.map(([name, wbRuns]) => (
            <WorkbenchSection key={name} name={name} runs={wbRuns} />
          ))
        )}
      </main>
    </div>
  )
}
