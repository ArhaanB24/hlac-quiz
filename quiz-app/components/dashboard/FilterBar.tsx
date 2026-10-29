"use client";

/** Sticky filters: scenario, topic and pre/post view. Every section reads the same state, so nothing can disagree. */
import type { ScenarioChoice } from "@/lib/analytics";
import { shortTopic } from "./theme";
import { Segmented } from "./ChartCard";

export type View = "compare" | "pre" | "post";

interface Props {
  choice: ScenarioChoice;
  topic: string | null;
  view: View;
  topics: string[];
  onChoice: (c: ScenarioChoice) => void;
  onTopic: (t: string | null) => void;
  onView: (v: View) => void;
}

export function FilterBar({ choice, topic, view, topics, onChoice, onTopic, onView }: Props) {
  const filtered = choice !== "All" || topic !== null || view !== "compare";
  return (
    <div className="filters">
      <div className="filters-inner">
        <Segmented label="Intervention" value={choice} onChange={onChoice}
          options={[{ value: "All", label: "Both" }, { value: "Social", label: "Social media" }, { value: "Seminar", label: "Seminar" }]} />
        <Segmented label="Quiz stage" value={view} onChange={onView}
          options={[{ value: "compare", label: "Pre vs post" }, { value: "pre", label: "Pre" }, { value: "post", label: "Post" }]} />
        <div className="chips" role="group" aria-label="Topic filter">
          <button className={`chip ${topic === null ? "on" : ""}`} aria-pressed={topic === null} onClick={() => onTopic(null)}>All topics</button>
          {topics.map((t) => (
            <button key={t} className={`chip ${topic === t ? "on" : ""}`} aria-pressed={topic === t} onClick={() => onTopic(topic === t ? null : t)}>
              {shortTopic(t)}
            </button>
          ))}
        </div>
        {filtered && <button className="chip reset" onClick={() => { onChoice("All"); onTopic(null); onView("compare"); }}>Reset</button>}
      </div>
    </div>
  );
}
