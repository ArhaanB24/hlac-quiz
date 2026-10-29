"use client";

/** Question-level insights: biggest improvements and the questions still below the accuracy target. */
import { useState, useSyncExternalStore } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Analysis, POST_TARGET, SUBSTANTIAL_GAIN_PP, pct } from "@/lib/analytics";
import { ChartCard, ChartTooltip, Segmented } from "./ChartCard";
import { COLOR } from "./theme";

type Metric = "gain" | "post";

const NARROW = "(max-width: 640px)";
function useNarrow() {
  return useSyncExternalStore(
    (notify) => { const m = window.matchMedia(NARROW); m.addEventListener("change", notify); return () => m.removeEventListener("change", notify); },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export function QuestionSection({ analysis }: { analysis: Analysis }) {
  const [metric, setMetric] = useState<Metric>("gain");
  const narrow = useNarrow();
  const rows = analysis.questions
    .map((q) => ({ ...q, label: `${q.id} ${q.objective}`, gain: q.gainPp, postPct: q.post * 100 }))
    .sort((a, b) => (metric === "gain" ? b.gain - a.gain : a.postPct - b.postPct));
  const struggling = analysis.questions.filter((q) => q.post < POST_TARGET).sort((a, b) => a.post - b.post);
  const height = Math.max(280, rows.length * 34 + 40);

  return (
    <div className="grid-2 wide-left">
      <ChartCard title="Question-level results" height={height}
        subtitle={metric === "gain" ? "Sorted by improvement. Dark green = substantial gain (25 pp or more)." : `Sorted by post-quiz accuracy. Dashed line = ${pct(POST_TARGET, 0)} target.`}
        actions={<Segmented label="Metric" value={metric} onChange={setMetric} options={[{ value: "gain", label: "Improvement" }, { value: "post", label: "Post accuracy" }]} />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={COLOR.grid} />
            <XAxis type="number" domain={metric === "post" ? [0, 100] : [(min: number) => Math.min(0, Math.floor(min)), "auto"]} unit={metric === "post" ? "%" : " pp"} tickLine={false} fontSize={12} />
            <YAxis type="category" dataKey="label" width={narrow ? 40 : 250} tickLine={false} axisLine={false} fontSize={11}
              tickFormatter={(v: string) => (narrow ? v.slice(0, 3) : v.length > 38 ? `${v.slice(0, 37)}…` : v)} />
            <Tooltip content={<ChartTooltip suffix={metric === "post" ? "%" : " pp"} />} cursor={{ fill: "#15803d14" }} />
            {metric === "post" && <ReferenceLine x={POST_TARGET * 100} stroke={COLOR.social} strokeDasharray="5 5" />}
            <Bar dataKey={metric === "gain" ? "gain" : "postPct"} name={metric === "gain" ? "Improvement" : "Post accuracy"} radius={[0, 6, 6, 0]}>
              {rows.map((r) => (
                <Cell key={r.id} fill={metric === "gain"
                  ? (r.gain < 0 ? COLOR.social : r.gain >= SUBSTANTIAL_GAIN_PP ? COLOR.post : "#7cc59a")
                  : (r.post < POST_TARGET ? COLOR.social : COLOR.post)} />
              ))}
              <LabelList dataKey={metric === "gain" ? "gain" : "postPct"} position="right" fontSize={11} formatter={(v: unknown) => Number(v).toFixed(0)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <section className="card">
        <h3>Still struggling</h3>
        <p className="muted">Post-quiz accuracy below {pct(POST_TARGET, 0)}.</p>
        {struggling.length === 0 ? (
          <p className="all-clear">Every question is at or above target in this view. 🎉</p>
        ) : (
          <ul className="struggle">
            {struggling.map((q) => (
              <li key={q.id}>
                <div><strong>{q.objective}</strong><small>{q.id}</small></div>
                <div className="bar"><div className="bar-fill red" style={{ width: `${q.post * 100}%` }} /></div>
                <small>{pct(q.pre, 0)} before → {pct(q.post, 0)} after</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
