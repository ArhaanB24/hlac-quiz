"use client";

/** Shared chart frame and tooltip so every chart looks like part of the same application. */
import type { ReactNode } from "react";

export function ChartCard({ title, subtitle, height = 300, actions, children }: {
  title: string; subtitle?: string; height?: number; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="card chart-card">
      <header className="chart-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="chart-body" style={{ height }}>{children}</div>
    </section>
  );
}

interface TipItem { name?: string | number; value?: number | string | readonly (number | string)[]; color?: string; fill?: string }

export function ChartTooltip({ active, payload, label, suffix = "%", digits = 1 }: {
  active?: boolean; payload?: readonly TipItem[]; label?: string | number; suffix?: string; digits?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      {label !== undefined && <strong>{label}</strong>}
      {payload.map((item, i) => (
        <div key={i} className="tip-row">
          <span className="tip-dot" style={{ background: item.color ?? item.fill }} />
          <span>{item.name}</span>
          <b>{typeof item.value === "number" ? item.value.toFixed(digits) : String(item.value)}{suffix}</b>
        </div>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
