"use client";

/**
 * Organiser analytics dashboard. Loads the shared response records once, then
 * derives every KPI and chart from them using the selected filters, so a data
 * change or a filter change updates all sections together.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type DashboardData, type ScenarioChoice, analyze, parseDashboardData, pct, pp, scenarioData,
} from "@/lib/analytics";
import { shortTopic } from "./theme";
import { ComparisonSection } from "./ComparisonSection";
import { FilterBar, type View } from "./FilterBar";
import { KpiCard } from "./KpiCard";
import { ParticipantSection } from "./ParticipantSection";
import { QuestionSection } from "./QuestionSection";
import { TopicSection } from "./TopicSection";

const DATA_URL = "/data/dashboard-data.json";
const WORKBOOK_URL = "/data/cybersecurity_awareness_impact.xlsx";

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: DashboardData };

function useDashboardData() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ state: "loading" });
    fetch(DATA_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`The data file could not be loaded (HTTP ${res.status}).`);
        return res.json();
      })
      .then((json) => setLoad({ state: "ready", data: parseDashboardData(json) }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoad({ state: "error", message: err.message });
      });
    return () => controller.abort();
  }, [attempt]);

  return { load, retry: useCallback(() => setAttempt((a) => a + 1), []) };
}

function Skeleton() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="kpis">{Array.from({ length: 5 }, (_, i) => <div key={i} className="kpi skel" />)}</div>
      <div className="grid-2"><div className="card skel tall" /><div className="card skel tall" /></div>
    </div>
  );
}

function StateBox({ title, text, action }: { title: string; text: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="card state-box" role="alert">
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {action && <button className="btn primary" onClick={action.run}>{action.label}</button>}
    </div>
  );
}

export function Dashboard() {
  const { load, retry } = useDashboardData();
  const [choice, setChoice] = useState<ScenarioChoice>("All");
  const [topic, setTopic] = useState<string | null>(null);
  const [view, setView] = useState<View>("compare");

  const data = load.state === "ready" ? load.data : null;
  const analysis = useMemo(() => (data ? analyze(data, choice, topic) : null), [data, choice, topic]);
  const social = useMemo(() => (data ? analyze(data, "Social", topic) : null), [data, topic]);
  const seminar = useMemo(() => (data ? analyze(data, "Seminar", topic) : null), [data, topic]);

  return (
    <div className="dash">
      <header className="dash-head">
        <p className="eyebrow">Organiser dashboard</p>
        <h1>Did the <span className="glow">awareness</span> work?</h1>
        <p className="lede">
          Pre- and post-quiz results for the social media campaign and the in-person seminar, calculated live from the
          participant records in the Excel workbook.
          {" "}<a className="link" href={WORKBOOK_URL} download>Download the workbook</a>
        </p>
      </header>

      {load.state === "loading" && <Skeleton />}
      {load.state === "error" && <StateBox title="Couldn't load the dashboard data" text={load.message} action={{ label: "Try again", run: retry }} />}

      {data && (
        <>
          <FilterBar choice={choice} topic={topic} view={view} topics={data.topics} onChoice={setChoice} onTopic={setTopic} onView={setView} />
          {!analysis || !social || !seminar ? (
            <StateBox title="No data to show" text="There are no participant responses for this selection. Try a different filter." action={{ label: "Reset filters", run: () => { setChoice("All"); setTopic(null); } }} />
          ) : (
            <Sections data={data} analysis={analysis} choice={choice} topic={topic} view={view} social={social} seminar={seminar} onTopic={setTopic} />
          )}
        </>
      )}
    </div>
  );
}

type A = NonNullable<ReturnType<typeof analyze>>;

function Sections({ data, analysis, choice, topic, view, social, seminar, onTopic }: {
  data: DashboardData; analysis: A; choice: ScenarioChoice; topic: string | null; view: View; social: A; seminar: A; onTopic: (t: string | null) => void;
}) {
  const k = analysis.kpis;
  const sd = scenarioData(data, choice);
  const label = topic ? `${sd.label} · ${shortTopic(topic)}` : sd.label;
  const bestTopic = [...analysis.topics].sort((a, b) => b.gainPp - a.gainPp)[0];
  const bestQ = [...analysis.questions].sort((a, b) => b.gainPp - a.gainPp)[0];
  const weakQ = [...analysis.questions].sort((a, b) => a.post - b.post)[0];

  return (
    <>
      <section id="overview" className="dash-section">
        <h2>Overview <small>{label}</small></h2>
        <div className="kpis">
          <KpiCard id="participants" label="Participants" value={k.n} format={(v) => Math.round(v).toString()} sub="matched pre and post" delay={0} />
          <KpiCard id="avgPre" label="Average pre score" value={k.avgPre * 100} format={(v) => `${v.toFixed(1)}%`} delay={80} />
          <KpiCard id="avgPost" label="Average post score" value={k.avgPost * 100} format={(v) => `${v.toFixed(1)}%`} tone="green" delay={160} />
          <KpiCard id="gainPp" label="Improvement" value={k.gainPp} format={(v) => pp(v)} tone={k.gainPp >= 0 ? "green" : "red"}
            sub={k.relative === null ? "percentage points" : `${pct(k.relative)} relative to baseline`} delay={240} />
          <KpiCard id="improved" label="Participants who improved" value={k.improvedShare * 100} format={(v) => `${v.toFixed(1)}%`} tone="green"
            sub={`${analysis.categories[2].count} unchanged · ${analysis.categories[3].count} scored lower`} delay={320} />
        </div>
        <ul className="insights">
          <li>Average score moved from <b>{pct(k.avgPre)}</b> to <b>{pct(k.avgPost)}</b> ({pp(k.gainPp)}).</li>
          {!topic && <li>Largest topic gain: <b>{bestTopic.topic}</b> ({pp(bestTopic.gainPp)}).</li>}
          <li>Largest question gain: <b>{bestQ.objective}</b> ({pp(bestQ.gainPp)}).</li>
          <li>{weakQ.post < 0.6 ? <>Needs more education: <b>{weakQ.objective}</b> ({pct(weakQ.post, 0)} correct after).</> : <>Weakest question still at <b>{pct(weakQ.post, 0)}</b> after: <b>{weakQ.objective}</b>.</>}</li>
        </ul>
      </section>

      <section id="topics" className="dash-section">
        <h2>Topic-wise improvement <small>{sd.label}</small></h2>
        <TopicSection analysis={analysis} topic={topic} view={view} onTopic={onTopic} />
      </section>

      <section id="participants" className="dash-section">
        <h2>Participant performance <small>{label}</small></h2>
        <ParticipantSection analysis={analysis} view={view} />
      </section>

      <section id="comparison" className="dash-section">
        <h2>Intervention comparison <small>{topic ? shortTopic(topic) : "all topics"}</small></h2>
        <ComparisonSection social={social} seminar={seminar} />
      </section>

      <section id="questions" className="dash-section">
        <h2>Question-level insights <small>{label}</small></h2>
        <QuestionSection analysis={analysis} />
      </section>
    </>
  );
}
