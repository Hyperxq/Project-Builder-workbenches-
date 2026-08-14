import { useMemo, useState } from 'react'
import leoUrl from './assets/leo.webp'
import { WorkbenchSection } from './components/workbench-section'
import { groupByWorkbench, loadRuns, loadWorkbenchMeta } from './lib/results'

const workbenchNumber = (name: string) => name.match(/workbench-(\d+)/)?.[1] ?? '—'

export default function App() {
  const runs = useMemo(() => loadRuns(), [])
  const meta = useMemo(() => loadWorkbenchMeta(), [])
  const runsByWorkbench = useMemo(() => groupByWorkbench(runs), [runs])
  const workbenches = useMemo(
    () => [...new Set([...meta.keys(), ...runsByWorkbench.keys()])].sort(),
    [meta, runsByWorkbench],
  )
  const [selectedName, setSelectedName] = useState(workbenches.at(-1) ?? '')
  const [navigationOpen, setNavigationOpen] = useState(false)
  const selectedMeta = meta.get(selectedName)

  if (workbenches.length === 0) {
    return (
      <main className="empty-state">
        <img className="empty-state__leo" src={leoUrl} alt="Leo, the workbench guide" />
        <h1>No measured results yet</h1>
        <p>Run a workbench scorecard and refresh this page.</p>
      </main>
    )
  }

  return (
    <div className={`decision-shell ${navigationOpen ? 'decision-shell--expanded' : ''}`}>
      <aside className="workbench-nav" aria-label="Workbench navigation">
        <div className="workbench-nav__brand">
          <img src={leoUrl} alt="Leo, the workbench guide" />
          {navigationOpen && (
            <div>
              <strong>Decision map</strong>
              <span>Choose a workbench</span>
            </div>
          )}
        </div>

        <button
          className="nav-toggle"
          type="button"
          aria-expanded={navigationOpen}
          aria-controls="workbench-list"
          onClick={() => setNavigationOpen((open) => !open)}
        >
          {navigationOpen ? 'Collapse map' : 'Open map'}
        </button>

        <ol id="workbench-list" className="workbench-nav__list">
          {workbenches.map((name) => {
            const active = name === selectedName
            const itemMeta = meta.get(name)
            return (
              <li key={name}>
                <button
                  type="button"
                  className="workbench-nav__item"
                  aria-current={active ? 'page' : undefined}
                  aria-label={`Workbench ${workbenchNumber(name)}: ${itemMeta?.title ?? name}`}
                  onClick={() => setSelectedName(name)}
                >
                  <span className="workbench-nav__number" aria-hidden="true">
                    {workbenchNumber(name)}
                  </span>
                  {navigationOpen && (
                    <span className="workbench-nav__copy">
                      <strong>{itemMeta?.title ?? name}</strong>
                      <span>{runsByWorkbench.get(name)?.length ?? 0} recorded arm-batch runs</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </aside>

      <main id="workbench-detail" className="workbench-detail" tabIndex={-1}>
        <WorkbenchSection
          key={selectedName}
          name={selectedName}
          runs={runsByWorkbench.get(selectedName) ?? []}
          meta={selectedMeta}
          onCompare={(name) => setSelectedName(name)}
          availableWorkbenches={workbenches}
        />
      </main>
    </div>
  )
}
