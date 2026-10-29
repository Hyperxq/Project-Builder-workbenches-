/**
 * llms.txt: the results as plain markdown for agents. Statuses come from
 * evaluateExperiment, the same rule the dashboard renders.
 */
import type { CriterionResult, Experiment } from './experiments'
import { cohortRuns, evaluateExperiment } from './experiments'
import type { Run, WorkbenchMeta } from './results'

const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const percent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value)}%`

function criterionLine({ criterion, treatment, baseline, changePct, met }: CriterionResult): string {
  const needs = `needs ≤ ${criterion.max_change_pct}%`
  const measured =
    treatment === null || baseline === null || changePct === null
      ? `not captured (${needs})`
      : `${number(treatment)} against ${number(baseline)} (${percent(changePct)}, ${met ? 'met' : 'not met'}; ${needs})`
  return `  - ${criterion.aggregate} ${criterion.metric}: ${measured}`
}

function experimentBlock(workbench: string, meta: WorkbenchMeta, experiment: Experiment, runs: Run[]): string {
  const result = evaluateExperiment(experiment, runs)
  const rate = (value: number | null) => (value === null ? 'n/a' : `${Math.round(value * 100)}%`)
  const lines = [
    `### ${meta.title}: ${experiment.title} (\`${experiment.id}\`)`,
    '',
    `- Status: ${result.status} (${result.reason})`,
    `- Hypothesis: ${experiment.hypothesis}`,
    `- Variable: ${experiment.variable}`,
    `- Runs: ${result.runs.treatment} ${experiment.treatment.label}, ${result.runs.baseline} ${experiment.baseline.label}`,
    `- Prediction (${experiment.prediction.combine} of), treatment against baseline:`,
    ...result.criteria.map(criterionLine),
    `- First-attempt pass rate: ${rate(result.quality.treatmentPassRate)} treatment, ${rate(result.quality.baselinePassRate)} baseline`,
    ...(experiment.recorded_checks ?? []).map(
      (check) => `- Recorded check: ${check.criterion}: ${check.outcome} (${check.source})`,
    ),
    ...(experiment.interpretation ? [`- Experimenter's note, not scored: ${experiment.interpretation}`] : []),
    `- README: ${workbench}/README.md`,
  ]
  return lines.join('\n')
}

export function renderLlmsTxt(
  meta: Map<string, WorkbenchMeta>,
  runs: Run[],
  { generatedAt, siteUrl }: { generatedAt: string; siteUrl: string },
): string {
  const latest: string[] = []
  const history: string[] = []
  for (const [workbench, wb] of [...meta].sort(([a], [b]) => a.localeCompare(b))) {
    const experiments = wb.experiments ?? []
    const hasRuns = (e: Experiment) =>
      cohortRuns(runs, e.treatment).length > 0 || cohortRuns(runs, e.baseline).length > 0
    // Experiments are appended to workbench.json as they are registered.
    const current = experiments.findLast(hasRuns) ?? experiments.at(-1)
    for (const experiment of [...experiments].reverse()) {
      const block = experimentBlock(workbench, wb, experiment, runs)
      ;(experiment === current ? latest : history).push(block)
    }
  }
  return [
    '# Project Builder workbenches',
    '',
    '> Controlled experiments on whether Project Builder schematics make coding agents cheaper or faster at equal quality. Each workbench runs a with-schematics arm against a without-schematics arm, and each experiment declares its hypothesis and a measurable prediction. Every status below is computed from the committed bench.json scorecards, the same way the dashboard computes it.',
    '',
    `Generated ${generatedAt} from workbench-*/workbench.json and workbench-*/results/*/bench.json. Dashboard: ${siteUrl}`,
    '',
    '## Latest',
    '',
    'The most recent experiment of each workbench.',
    '',
    latest.join('\n\n'),
    '',
    '## History',
    '',
    'Every earlier experiment, newest first within each workbench.',
    '',
    history.join('\n\n'),
    '',
  ].join('\n')
}
