"use client";

/** Social media vs seminar, always side by side (the intervention filter does not apply here; the topic filter does). */
import { Bar, BarChart, CartesianGrid, Legend, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Analysis, pct, pp } from "@/lib/analytics";
import { ChartCard, ChartTooltip } from "./ChartCard";
import { COLOR, shortTopic, legendText } from "./theme";

export function ComparisonSection({ social, seminar }: { social: Analysis; seminar: Analysis }) {
  const metrics = [
    { name: "Average pre", Social: social.kpis.avgPre * 100, Seminar: seminar.kpis.avgPre * 100 },
    { name: "Average post", Social: social.kpis.avgPost * 100, Seminar: seminar.kpis.avgPost * 100 },
    { name: "Participants improved", Social: social.kpis.improvedShare * 100, Seminar: seminar.kpis.improvedShare * 100 },
  ];
  const gains = social.topics.map((t, i) => ({ name: shortTopic(t.topic), Social: t.gainPp, Seminar: seminar.topics[i].gainPp }));
  const rows = [
    ["Absolute improvement", pp(social.kpis.gainPp), pp(seminar.kpis.gainPp)],
    ["Relative improvement", social.kpis.relative === null ? "n/a" : pct(social.kpis.relative), seminar.kpis.relative === null ? "n/a" : pct(seminar.kpis.relative)],
    ["Improved substantially", pct(social.categories[0].share, 0), pct(seminar.categories[0].share, 0)],
    ["Scored lower", pct(social.categories[3].share, 0), pct(seminar.categories[3].share, 0)],
  ];

  return (
    <>
      <div className="grid-2">
        <ChartCard title="Headline comparison" subtitle="Average scores and share of participants who improved.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLOR.grid} />
              <XAxis dataKey="name" tickLine={false} fontSize={12} interval={0} />
              <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#c81e2d14" }} />
              <Legend iconType="circle" formatter={legendText} />
              <Bar dataKey="Social" name="Social media" fill={COLOR.social} radius={[6, 6, 0, 0]}><LabelList dataKey="Social" position="top" fontSize={11} formatter={(v: unknown) => `${Math.round(Number(v))}`} /></Bar>
              <Bar dataKey="Seminar" name="Seminar" fill={COLOR.seminar} radius={[6, 6, 0, 0]}><LabelList dataKey="Seminar" position="top" fontSize={11} formatter={(v: unknown) => `${Math.round(Number(v))}`} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Learning gain by topic" subtitle="Percentage-point improvement in each intervention.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gains} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLOR.grid} />
              <XAxis dataKey="name" tickLine={false} fontSize={12} interval={0} />
              <YAxis unit=" pp" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip content={<ChartTooltip suffix=" pp" />} cursor={{ fill: "#15803d14" }} />
              <Legend iconType="circle" formatter={legendText} />
              <Bar dataKey="Social" name="Social media" fill={COLOR.social} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Seminar" name="Seminar" fill={COLOR.seminar} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card table-card">
        <table>
          <thead><tr><th>Measure</th><th>Social media</th><th>Seminar</th></tr></thead>
          <tbody>{rows.map(([m, a, b]) => <tr key={m}><th scope="row">{m}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
        <p className="muted note">Percentage-point change is post minus pre; relative improvement divides that by the pre-quiz average.</p>
      </div>
    </>
  );
}
