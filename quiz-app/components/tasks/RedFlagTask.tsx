"use client";

/** Tap the suspicious phrases in a message. Correct only if every red flag is found and nothing else is tapped. */
import { useState } from "react";
import type { Task } from "@/lib/quiz";
import type { TaskProps } from "./types";

export function RedFlagTask({ task, onResolve }: TaskProps & { task: Extract<Task, { kind: "redflags" }> }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);

  function toggle(i: number) {
    if (checked) return;
    const next = new Set(picked);
    if (!next.delete(i)) next.add(i);
    setPicked(next);
  }

  function check() {
    setChecked(true);
    onResolve({ correct: task.segments.every((s, i) => picked.has(i) === !!s.flag) });
  }

  const stateOf = (i: number) => {
    const flagged = !!task.segments[i].flag;
    if (!checked) return picked.has(i) ? "picked" : "";
    if (flagged) return picked.has(i) ? "hit" : "missed";
    return picked.has(i) ? "false-alarm" : "";
  };

  return (
    <>
      <div className="phone">
        <div className="phone-bar">Message</div>
        <p className="bubble in flags">
          {task.segments.map((s, i) => (
            // A span (not a button) so phrases flow as running text instead of breaking into boxes.
            <span
              key={i}
              role="button"
              tabIndex={checked ? -1 : 0}
              className={`flag ${stateOf(i)}`}
              aria-pressed={picked.has(i)}
              onClick={() => toggle(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
            >
              {s.t}
            </span>
          ))}
        </p>
      </div>
      {checked ? (
        <p className="legend">
          <span className="hit">Found</span> <span className="missed">Missed red flag</span>{" "}
          <span className="false-alarm">Not actually a red flag</span>
        </p>
      ) : (
        <button className="btn primary" disabled={picked.size === 0} onClick={check}>
          Check my answer ({picked.size} tapped)
        </button>
      )}
    </>
  );
}
