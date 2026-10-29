"use client";

/** Participant-level views: score distribution, improvement categories, change histogram, pre-vs-post scatter, learner lists. */
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { CATEGORIES, type Analysis, type ParticipantResult, pct, pp } from "@/lib/analytics";
import { ChartCard, ChartTooltip } from "./ChartCard";
import type { View } from "./FilterBar";
import { CATEGORY_COLOR, CATEGORY_LABEL, COLOR, legendText } from "./theme";

// Deterministic jitter so participants with identical scores stay individually visible; tooltips show exact values.
function jitter(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 100) / 100 - 0.5) * 3;
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: ParticipantResult }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="tip">
      <strong>{p.name} <small>({p.id})</small></strong>
      <div>Pre {pct(p.prePct, 0)} → Post {pct(p.postPct, 0)}</div>
      <div>{pp(p.changePp, 0)} · {CATEGORY_LABEL[p.category]}</div>
    </div>
  );
}

function LearnerList({ title, people }: { title: string; people: ParticipantResult[] }) {
  return (
    <div className="learners">
      <h4>{title}</h4>
      <ol>
        {people.map((p) => (
          <li key={p.id}>
            <span>{p.name} <small>{p.id}</small></span>
            <b className={p.changePp >= 0 ? "up" : "down"}>{pp(p.changePp, 0)}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ParticipantSection({ analysis, view }: { analysis: Analysis; view: View }) {
  const { participants, categories, scoreDist, changeDist, kpis } = analysis;
  const byGain = [...participants].sort((a, b) => b.changePp - a.changePp || a.name.localeCompare(b.name));
  const pieData = categories.map((c) => ({ ...c, name: CATEGORY_LABEL[c.category] }));

  return (
    <>
      <div className="grid-2">
        <ChartCard title="Score distribution" subtitle={`Participants by number of correct answers (out of ${analysis.questionCount}).`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDist} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLOR.grid} />
              <XAxis dataKey="score" tickLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip content={<ChartTooltip suffix="" digits={0} />} cursor={{ fill: "#15803d14" }} />
              <Legend iconType="circle" formatter={legendText} />
              {view !== "post" && <Bar dataKey="pre" name="Pre" fill={COLOR.pre} radius={[4, 4, 0, 0]} />}
              {view !== "pre" && <Bar dataKey="post" name="Post" fill={COLOR.post} radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Who improved?" subtitle="Share of participants by size of change in score.">
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="none">
                  {pieData.map((c) => <Cell key={c.category} fill={CATEGORY_COLOR[c.category]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip suffix=" participants" digits={0} />} />
                <Legend iconType="circle" formatter={legendText} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><strong>{pct(kpis.improvedShare, 0)}</strong><span>improved</span></div>
          </div>
        </ChartCard>
      </div>

      <div className="grid-2">
        <ChartCard title="Individual score changes" subtitle="How many participants gained or lost each number of points.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={changeDist} margin={{ top: 8, right: 8, left: -18, bottom: 16 }}>
              <CartesianGrid vertical={false} stroke={COLOR.grid} />
              <XAxis dataKey="change" tickLine={false} fontSize={12} label={{ value: "Change in correct answers", position: "insideBottom", offset: -10, fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip content={<ChartTooltip suffix=" participants" digits={0} />} cursor={{ fill: "#15803d14" }} />
              <ReferenceLine x={0} stroke="#9aa3af" />
              <Bar dataKey="count" name="Participants" radius={[4, 4, 0, 0]}>
                {changeDist.map((d) => <Cell key={d.change} fill={d.change > 0 ? COLOR.post : d.change < 0 ? COLOR.social : COLOR.pre} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pre vs post, per participant" subtitle="Above the dashed line = improved. Points are nudged slightly so overlaps stay visible.">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: -8, bottom: 28 }}>
              <CartesianGrid stroke={COLOR.grid} />
              <XAxis type="number" dataKey="x" domain={[-4, 104]} ticks={[0, 25, 50, 75, 100]} unit="%" fontSize={12} tickLine={false} label={{ value: "Pre score", position: "insideBottom", offset: -6, fontSize: 12 }} />
              <YAxis type="number" dataKey="y" domain={[-4, 104]} ticks={[0, 25, 50, 75, 100]} unit="%" fontSize={12} tickLine={false} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#9aa3af" strokeDasharray="5 5" />
              <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: "3 3" }} />
              {CATEGORIES.map((c) => (
                <Scatter key={c} name={CATEGORY_LABEL[c]} fill={CATEGORY_COLOR[c]} fillOpacity={0.8}
                  data={participants.filter((p) => p.category === c).map((p) => ({ ...p, x: p.prePct * 100 + jitter(p.id), y: p.postPct * 100 + jitter(p.id + "y") }))} />
              ))}
              <Legend iconType="circle" formatter={legendText} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid-2">
        <LearnerList title="Biggest learning gains" people={byGain.slice(0, 5)} />
        <LearnerList title="Smallest gains - may need follow-up" people={byGain.slice(-5).reverse()} />
      </div>
    </>
  );
}
