"use client";

/** Animated KPI tile. `data-value` carries the exact figure so it can be checked against the workbook. */
import { useCountUp } from "./useCountUp";

interface Props {
  id: string;
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: string;
  tone?: "green" | "red" | "plain";
  delay?: number;
}

export function KpiCard({ id, label, value, format, sub, tone = "plain", delay = 0 }: Props) {
  const shown = useCountUp(value);
  return (
    <div className={`kpi ${tone}`} data-testid={`kpi-${id}`} data-value={value} style={{ animationDelay: `${delay}ms` }}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{format(shown)}</strong>
      {sub && <small className="kpi-sub">{sub}</small>}
    </div>
  );
}
