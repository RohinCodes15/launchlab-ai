import type { Scenario } from "./schema";

/**
 * Finance Studio formulas. Everything here is arithmetic on the student's own
 * assumptions: an illustrative estimate, not a forecast and not investment advice.
 */

export const PROJECTION_MONTHS = 12;

export type MonthRow = {
  month: number;
  units: number;
  revenue: number;
  costs: number;
  net: number;
  cash: number;
};

export const DEFAULT_SCENARIO: Omit<Scenario, "id" | "name"> = {
  price: 5,
  unitsPerMonth: 20,
  growthPct: 10,
  variableCost: 1,
  fixedCosts: 50,
  startingCash: 100,
};

/** What one sale contributes toward fixed costs. */
export const contributionMargin = (s: Scenario): number => s.price - s.variableCost;

/** Contribution margin as a percentage of price; null when the price is zero. */
export const marginPercent = (s: Scenario): number | null =>
  s.price > 0 ? (contributionMargin(s) / s.price) * 100 : null;

/** Whole units per month needed to cover fixed costs; null when each sale loses money or breaks even. */
export const breakEvenUnits = (s: Scenario): number | null =>
  contributionMargin(s) > 0 ? Math.ceil(s.fixedCosts / contributionMargin(s)) : null;

/** Month-by-month projection with compounding unit growth and a running cash balance. */
export function projectScenario(s: Scenario, months: number = PROJECTION_MONTHS): MonthRow[] {
  return Array.from({ length: months }, (_, index) => {
    const units = s.unitsPerMonth * (1 + s.growthPct / 100) ** index;
    const revenue = units * s.price;
    const costs = units * s.variableCost + s.fixedCosts;
    return { month: index + 1, units, revenue, costs, net: revenue - costs };
  }).reduce<MonthRow[]>(
    (rows, row) => [...rows, { ...row, cash: (rows.at(-1)?.cash ?? s.startingCash) + row.net }],
    [],
  );
}

/** First month whose net cash flow is zero or better; null if none within the projection. */
export const breakEvenMonth = (rows: MonthRow[]): number | null =>
  rows.find((row) => row.net >= 0)?.month ?? null;

/** Full months the cash lasts before the balance goes negative; null if it never does in the projection. */
export function runwayMonths(rows: MonthRow[]): number | null {
  const firstNegative = rows.find((row) => row.cash < 0);
  return firstNegative ? firstNegative.month - 1 : null;
}

export type ScenarioSummary = {
  margin: number;
  marginPercent: number | null;
  breakEvenUnits: number | null;
  breakEvenMonth: number | null;
  runwayMonths: number | null;
  totalRevenue: number;
  endingCash: number;
};

export function summarizeScenario(
  s: Scenario,
  rows: MonthRow[] = projectScenario(s),
): ScenarioSummary {
  return {
    margin: contributionMargin(s),
    marginPercent: marginPercent(s),
    breakEvenUnits: breakEvenUnits(s),
    breakEvenMonth: breakEvenMonth(rows),
    runwayMonths: runwayMonths(rows),
    totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    endingCash: rows.at(-1)?.cash ?? s.startingCash,
  };
}

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  }).format(value);
