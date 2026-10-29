"use client";

/** Put steps in order using up/down buttons (works without drag-and-drop, so it is keyboard and touch friendly). */
import { useState } from "react";
import type { Task } from "@/lib/quiz";
import type { TaskProps } from "./types";

// Fixed starting shuffle that is never already sorted.
const START = [2, 0, 3, 1];

export function OrderTask({ task, onResolve }: TaskProps & { task: Extract<Task, { kind: "order" }> }) {
  const [order, setOrder] = useState<number[]>(START); // order[pos] = index into task.steps
  const [checked, setChecked] = useState(false);

  function move(pos: number, delta: -1 | 1) {
    const target = pos + delta;
    if (checked || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[pos], next[target]] = [next[target], next[pos]];
    setOrder(next);
  }

  function check() {
    setChecked(true);
    onResolve({ correct: order.every((step, pos) => step === pos) });
  }

  return (
    <>
      <ol className="order">
        {order.map((step, pos) => {
          const state = !checked ? "" : step === pos ? "ok" : "no";
          return (
            <li key={step} className={`order-item ${state}`}>
              <span className="order-num">{pos + 1}</span>
              <span className="text">{task.steps[step]}</span>
              {!checked && (
                <span className="order-btns">
                  <button aria-label={`Move step up: ${task.steps[step]}`} disabled={pos === 0} onClick={() => move(pos, -1)}>▲</button>
                  <button aria-label={`Move step down: ${task.steps[step]}`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>▼</button>
                </span>
              )}
              {checked && <span className="mark">{step === pos ? "✓" : "✕"}</span>}
            </li>
          );
        })}
      </ol>
      {!checked ? (
        <button className="btn primary" onClick={check}>Check my order</button>
      ) : (
        order.some((step, pos) => step !== pos) && (
          <div className="correct-order">
            <strong>Right order:</strong>
            <ol>{task.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )
      )}
    </>
  );
}
