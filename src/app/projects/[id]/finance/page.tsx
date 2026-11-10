"use client";

import { useState } from "react";
import { LineChart } from "@/components/line-chart";
import { Button, EmptyState, Panel, StatusMessage, ToolHeader, inputClass } from "@/components/ui";
import { useProjectSlice } from "@/components/use-current-project";
import {
  DEFAULT_SCENARIO,
  PROJECTION_MONTHS,
  formatMoney,
  projectScenario,
  summarizeScenario,
  type MonthRow,
  type ScenarioSummary,
} from "@/lib/finance";
import { appendText, patchItem, removeItem } from "@/lib/list";
import { MAX_SCENARIOS, scenarioSchema, type Project, type Scenario } from "@/lib/schema";
import { newId, updateProject } from "@/lib/store";

type NumericKey = Exclude<keyof Scenario, "id" | "name">;

const FIELDS: { key: NumericKey; label: string; step: string }[] = [
  { key: "price", label: "Price per sale ($)", step: "0.01" },
  { key: "unitsPerMonth", label: "Sales in month 1", step: "1" },
  { key: "growthPct", label: "Monthly growth in sales (%)", step: "1" },
  { key: "variableCost", label: "Cost per sale ($)", step: "0.01" },
  { key: "fixedCosts", label: "Fixed costs per month ($)", step: "1" },
  { key: "startingCash", label: "Starting cash ($)", step: "1" },
];

const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

const METRICS = [
  { key: "cash", label: "Cash balance" },
  { key: "net", label: "Monthly profit" },
  { key: "revenue", label: "Revenue" },
] as const satisfies readonly { key: keyof MonthRow; label: string }[];

const MONTH_LABELS = Array.from({ length: PROJECTION_MONTHS }, (_, i) => `M${i + 1}`);

const describe = {
  breakEvenUnits: (s: ScenarioSummary) =>
    s.breakEvenUnits === null
      ? "Never: each sale loses money"
      : `${s.breakEvenUnits.toLocaleString()} sales a month`,
  breakEvenMonth: (s: ScenarioSummary) =>
    s.breakEvenMonth === null
      ? `Not within ${PROJECTION_MONTHS} months`
      : `Month ${s.breakEvenMonth}`,
  runway: (s: ScenarioSummary) =>
    s.runwayMonths === null
      ? `Cash lasts all ${PROJECTION_MONTHS} months`
      : s.runwayMonths === 0
        ? "Runs out in month 1"
        : `${s.runwayMonths} months, then runs out`,
  margin: (s: ScenarioSummary) =>
    `${formatMoney(s.margin)}${s.marginPercent === null ? "" : ` (${Math.round(s.marginPercent)}%)`}`,
};

const ROWS: { label: string; value: (s: ScenarioSummary) => string }[] = [
  { label: "Contribution margin per sale", value: describe.margin },
  { label: "Break-even sales", value: describe.breakEvenUnits },
  { label: "First profitable month", value: describe.breakEvenMonth },
  { label: "Cash runway", value: describe.runway },
  { label: `Revenue over ${PROJECTION_MONTHS} months`, value: (s) => formatMoney(s.totalRevenue) },
  { label: `Cash after ${PROJECTION_MONTHS} months`, value: (s) => formatMoney(s.endingCash) },
];

function ScenarioEditor({
  scenario,
  index,
  onChange,
  onRemove,
}: {
  scenario: Scenario;
  index: number;
  onChange: (patch: Partial<Scenario>) => void;
  onRemove: () => void;
}) {
  // Text the student is still typing that is not a valid number yet: shown, never saved.
  const [drafts, setDrafts] = useState<Partial<Record<NumericKey, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<NumericKey, string>>>({});

  function handleChange(key: NumericKey, text: string) {
    const value = text.trim() === "" ? Number.NaN : Number(text);
    const result = Number.isFinite(value) ? scenarioSchema.shape[key].safeParse(value) : null;
    if (result?.success) {
      setDrafts((d) => ({ ...d, [key]: undefined }));
      setErrors((e) => ({ ...e, [key]: undefined }));
      onChange({ [key]: result.data });
    } else {
      setDrafts((d) => ({ ...d, [key]: text }));
      setErrors((e) => ({
        ...e,
        [key]: result ? result.error.issues[0].message : "Enter a number",
      }));
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ background: SERIES_COLORS[index] }}
        />
        <input
          aria-label={`Name of scenario ${index + 1}`}
          value={scenario.name}
          maxLength={40}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`${inputClass} font-semibold`}
        />
        <Button
          size="sm"
          variant="ghost"
          className="!text-danger"
          aria-label={`Delete scenario ${scenario.name || index + 1}`}
          onClick={onRemove}
        >
          Delete
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {FIELDS.map((field) => {
          const id = `${scenario.id}-${field.key}`;
          const error = errors[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-xs font-medium text-muted">
                {field.label}
              </label>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                step={field.step}
                value={drafts[field.key] ?? String(scenario[field.key])}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={`${inputClass} tabular-nums`}
              />
              {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function scenarioText(scenario: Scenario) {
  return {
    revenue: `Pricing assumption (${scenario.name}): ${formatMoney(scenario.price)} per sale, about ${scenario.unitsPerMonth} sales in month 1, growing ${scenario.growthPct}% a month. Illustrative estimate, not tested.`,
    costs: `Cost assumption (${scenario.name}): ${formatMoney(scenario.variableCost)} per sale plus ${formatMoney(scenario.fixedCosts)} a month.`,
  };
}

export default function FinancePage() {
  const { project, save } = useProjectSlice("finance");
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("cash");
  const [message, setMessage] = useState<string>();
  if (!project) return null;
  const { scenarios } = project.finance;

  const add = () =>
    save((f) => ({
      scenarios: [
        ...f.scenarios,
        {
          ...(f.scenarios.at(-1) ?? DEFAULT_SCENARIO),
          id: newId(),
          name: f.scenarios.length === 0 ? "Base case" : `Scenario ${f.scenarios.length + 1}`,
        },
      ],
    }));

  if (scenarios.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ToolHeader title="Finance Studio">
          Model prices, costs, and cash from your own assumptions.
        </ToolHeader>
        <EmptyState
          title="No scenarios yet."
          actions={
            <Button variant="primary" onClick={add}>
              Create a scenario
            </Button>
          }
        >
          A scenario is one set of assumptions: a price, how many you sell, and what it costs. Make
          two or three to compare.
        </EmptyState>
      </div>
    );
  }

  const projections = scenarios.map((s) => projectScenario(s));
  const summaries = scenarios.map((s, i) => summarizeScenario(s, projections[i]));
  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? "";

  function applyScenario(scenario: Scenario, target: "canvas" | "pitch") {
    const text = scenarioText(scenario);
    const change =
      target === "canvas"
        ? (p: Project) => ({
            ...p,
            canvas: {
              ...p.canvas,
              revenueStreams: appendText(p.canvas.revenueStreams, text.revenue),
              costStructure: appendText(p.canvas.costStructure, text.costs),
            },
          })
        : (p: Project) => ({
            ...p,
            slides: p.slides.map((slide) =>
              slide.kind === "business-model"
                ? { ...slide, body: appendText(slide.body, `${text.revenue}\n${text.costs}`) }
                : slide,
            ),
          });
    if (target === "pitch" && !project?.slides.some((slide) => slide.kind === "business-model")) {
      setMessage("Generate a pitch first, then add a scenario to it.");
      return;
    }
    const ok = project && updateProject(project.id, change);
    setMessage(
      ok
        ? `Added “${scenario.name}” to your ${target === "canvas" ? "Revenue Streams and Cost Structure" : "business model slide"}.`
        : "There was no room to add it. Shorten that section first.",
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <ToolHeader title="Finance Studio">
          Model prices, costs, and cash from your own assumptions. Change a number and every result
          updates.
        </ToolHeader>
        <Button variant="primary" onClick={add} disabled={scenarios.length >= MAX_SCENARIOS}>
          Add scenario
        </Button>
      </div>
      <p role="note" className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
        <span className="font-semibold">Illustrative estimates only.</span> These figures are
        arithmetic on the assumptions you typed. They are not a forecast and not financial or
        investment advice.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((scenario, index) => (
          <ScenarioEditor
            key={scenario.id}
            scenario={scenario}
            index={index}
            onChange={(patch) =>
              save((f) => ({ scenarios: patchItem(f.scenarios, scenario.id, patch) }))
            }
            onRemove={() => save((f) => ({ scenarios: removeItem(f.scenarios, scenario.id) }))}
          />
        ))}
      </div>

      <Panel
        title={`${metricLabel} by month`}
        description="Hover or use the arrow keys on the chart to read each month."
        actions={
          <div
            role="group"
            aria-label="Chart metric"
            className="flex rounded-lg border border-line p-0.5"
          >
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={metric === m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${metric === m.key ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <LineChart
          title={`${metricLabel} by month for ${scenarios.map((s) => s.name).join(", ")}`}
          labels={MONTH_LABELS}
          format={formatMoney}
          series={scenarios.map((s, i) => ({
            name: s.name || `Scenario ${i + 1}`,
            color: SERIES_COLORS[i],
            values: projections[i].map((row) => row[metric]),
          }))}
        />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-fg">
            Show the numbers as a table
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-right text-xs tabular-nums">
              <caption className="sr-only">{metricLabel} by month</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="p-2 text-left font-medium">
                    Month
                  </th>
                  {scenarios.map((s) => (
                    <th key={s.id} scope="col" className="p-2 font-medium">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTH_LABELS.map((label, month) => (
                  <tr key={label} className="border-t border-line">
                    <th scope="row" className="p-2 text-left font-normal">
                      {label}
                    </th>
                    {projections.map((rows, i) => (
                      <td key={scenarios[i].id} className="p-2">
                        {formatMoney(rows[month][metric])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Panel>

      <Panel
        title="Scenario comparison"
        description="Break-even is fixed costs ÷ contribution margin. Runway counts the full months before cash goes below zero."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th scope="col" className="p-2 text-left font-medium text-muted">
                  Result
                </th>
                {scenarios.map((s, i) => (
                  <th key={s.id} scope="col" className="p-2 text-left font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ background: SERIES_COLORS[i] }}
                      />
                      {s.name || `Scenario ${i + 1}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <th scope="row" className="p-2 text-left font-normal text-muted">
                    {row.label}
                  </th>
                  {summaries.map((summary, i) => (
                    <td key={scenarios[i].id} className="p-2 tabular-nums">
                      {row.value(summary)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line">
                <th scope="row" className="p-2 text-left font-normal text-muted">
                  Use it
                </th>
                {scenarios.map((s) => (
                  <td key={s.id} className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        onClick={() => applyScenario(s, "canvas")}
                        aria-label={`Add ${s.name} to canvas`}
                      >
                        Add to canvas
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => applyScenario(s, "pitch")}
                        aria-label={`Add ${s.name} to pitch`}
                      >
                        Add to pitch
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {message && <StatusMessage>{message}</StatusMessage>}
      </Panel>
    </div>
  );
}
