"use client";

/** Topic-wise accuracy and gain. Clicking a bar toggles the topic filter. */
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { Analysis } from "@/lib/analytics";
import { ChartCard, ChartTooltip } from "./ChartCard";
import type { View } from "./FilterBar";
import { COLOR, shortTopic, legendText } from "./theme";

export function TopicSection({ analysis, topic, view, onTopic }: {
  analysis: Analysis; topic: string | null; view: View; onTopic: (t: string | null) => void;
}) {
  const rows = analysis.topics.map((t) => ({ topic: t.topic, name: shortTopic(t.topic), pre: t.pre * 100, post: t.post * 100, gain: t.gainPp }));
  const dim = (t: string) => (topic && topic !== t ? 0.3 : 1);
  const toggle = (_: unknown, i: number) => onTopic(topic === rows[i].topic ? null : rows[i].topic);

  return (
    <div className="grid-2">
      <ChartCard title="Accuracy by topic" subtitle="Click a bar to filter by topic." height={320}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLOR.grid} />
            <XAxis dataKey="name" tickLine={false} interval={0} fontSize={12} />
            <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#c81e2d14" }} />
            <Legend iconType="circle" formatter={legendText} />
            {view !== "post" && (
              <Bar dataKey="pre" name="Pre" fill={COLOR.pre} radius={[6, 6, 0, 0]} onClick={toggle} cursor="pointer">
                {rows.map((r) => <Cell key={r.topic} fillOpacity={dim(r.topic)} />)}
                <LabelList dataKey="pre" position="top" fontSize={11} formatter={(v: unknown) => `${Math.round(Number(v))}`} />
              </Bar>
            )}
            {view !== "pre" && (
              <Bar dataKey="post" name="Post" fill={COLOR.post} radius={[6, 6, 0, 0]} onClick={toggle} cursor="pointer">
                {rows.map((r) => <Cell key={r.topic} fillOpacity={dim(r.topic)} />)}
                <LabelList dataKey="post" position="top" fontSize={11} formatter={(v: unknown) => `${Math.round(Number(v))}`} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Improvement by topic" subtitle="Change in accuracy, in percentage points." height={320}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 36, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={COLOR.grid} />
            <XAxis type="number" unit=" pp" tickLine={false} fontSize={12} />
            <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip content={<ChartTooltip suffix=" pp" />} cursor={{ fill: "#15803d14" }} />
            <Bar dataKey="gain" name="Gain" radius={[0, 6, 6, 0]} onClick={toggle} cursor="pointer">
              {rows.map((r) => <Cell key={r.topic} fill={r.gain >= 0 ? COLOR.post : COLOR.social} fillOpacity={dim(r.topic)} />)}
              <LabelList dataKey="gain" position="right" fontSize={11} formatter={(v: unknown) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
