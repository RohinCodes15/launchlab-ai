"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type ChartSeries = { name: string; color: string; values: number[] };

interface LineChartProps {
  title: string;
  series: ChartSeries[];
  labels: string[];
  format: (value: number) => string;
}

// The SVG is drawn at its rendered pixel width (not scaled from a fixed viewBox), so text
// stays at its real font size on phones. DEFAULT_WIDTH is used until it is measured.
const DEFAULT_WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 16, right: 20, bottom: 30, left: 72 };
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
// Minimum horizontal room for one month label, in pixels.
const MIN_LABEL_SPACING = 44;
const TICK_COUNT = 4;

/** Round tick values that cover [min, max] and always include 0. */
export function niceTicks(min: number, max: number, count: number = TICK_COUNT): number[] {
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0) === lo ? lo + 1 : Math.max(max, 0);
  const rough = (hi - lo) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  return Array.from(
    { length: Math.round((end - start) / step) + 1 },
    (_, i) => Math.round((start + i * step) * 100) / 100,
  );
}

/** Line chart with a crosshair tooltip (pointer or arrow keys), a legend, and direct end labels. */
export function LineChart({ title, series, labels, format }: LineChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const measured = Math.round(entry.contentRect.width);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const labelEvery = Math.max(
    1,
    Math.ceil((labels.length * MIN_LABEL_SPACING) / Math.max(plotW, 1)),
  );
  const ticks = niceTicks(
    Math.min(...series.flatMap((s) => s.values)),
    Math.max(...series.flatMap((s) => s.values)),
  );
  const yMin = ticks[0];
  const yMax = ticks.at(-1) ?? 1;
  const x = (i: number) =>
    PAD.left + (labels.length > 1 ? (i * plotW) / (labels.length - 1) : plotW / 2);
  const y = (v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin || 1)) * PLOT_H;
  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const slot = plotW / Math.max(1, labels.length - 1);

  function handleKey(event: KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setActive((i) =>
      Math.min(labels.length - 1, Math.max(0, (i ?? (step > 0 ? -1 : labels.length)) + step)),
    );
  }

  const leftPct = active === null ? 0 : (x(active) / width) * 100;
  const shift = leftPct > 70 ? "-100%" : leftPct < 30 ? "0%" : "-50%";

  return (
    <figure className="flex flex-col gap-3">
      <div ref={boxRef} className="relative">
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${title}. Use the left and right arrow keys to read each month.`}
          tabIndex={0}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="h-auto w-full overflow-visible rounded-lg"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-muted" : "stroke-line"}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {format(tick)}
              </text>
            </g>
          ))}
          {labels.map((label, i) =>
            i === labels.length - 1 ||
            (i % labelEvery === 0 && labels.length - 1 - i >= labelEvery) ? (
              <text
                key={label}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted text-[11px]"
              >
                {label}
              </text>
            ) : null,
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              className="stroke-muted"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {series.map((s) => (
            <path
              key={s.name}
              d={path(s.values)}
              fill="none"
              style={{ stroke: s.color }}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {active !== null &&
            series.map((s) => (
              <circle
                key={s.name}
                cx={x(active)}
                cy={y(s.values[active])}
                r={4}
                style={{ fill: s.color }}
                className="stroke-surface"
                strokeWidth={2}
              />
            ))}
          {labels.map((label, i) => (
            <rect
              key={label}
              x={x(i) - slot / 2}
              y={PAD.top}
              width={slot}
              height={PLOT_H}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
            />
          ))}
        </svg>
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg"
            style={{ left: `${leftPct}%`, transform: `translateX(${shift})` }}
          >
            <p className="font-semibold">{labels[active]}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {series.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted">{s.name}</span>
                  <span className="ml-auto pl-3 font-medium tabular-nums">
                    {format(s.values[active])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {series.length > 1 && (
        <figcaption>
          <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {series.map((s) => (
              <li key={s.name} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </li>
            ))}
          </ul>
        </figcaption>
      )}
    </figure>
  );
}
