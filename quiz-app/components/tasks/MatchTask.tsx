"use client";

/**
 * Match-the-lines: tap an item on the left, then its partner on the right, and a
 * line is drawn between them. Tap-tap (not drag) so it works on touch screens
 * and with a keyboard. The right column is shown in a fixed scrambled order so
 * the answer is never simply "top to bottom".
 */
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Task } from "@/lib/quiz";
import type { TaskProps } from "./types";

// Display position j of the right column shows right[SCRAMBLE[j]].
const SCRAMBLE = [2, 0, 3, 1];

interface Line { x1: number; y1: number; x2: number; y2: number; }

export function MatchTask({ task, onResolve }: TaskProps & { task: Extract<Task, { kind: "match" }> }) {
  const [links, setLinks] = useState<(number | null)[]>(task.left.map(() => null)); // left i -> display j
  const [active, setActive] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [lines, setLines] = useState<(Line | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isRight = (i: number) => links[i] !== null && SCRAMBLE[links[i] as number] === i;

  const measure = useCallback(() => {
    const frame = box.current?.getBoundingClientRect();
    if (!frame) return;
    setLines(links.map((j, i) => {
      const l = leftRefs.current[i]?.getBoundingClientRect();
      const r = j === null ? undefined : rightRefs.current[j]?.getBoundingClientRect();
      if (!l || !r) return null;
      return { x1: l.right - frame.left, y1: l.top + l.height / 2 - frame.top, x2: r.left - frame.left, y2: r.top + r.height / 2 - frame.top };
    }));
  }, [links]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (box.current) observer.observe(box.current);
    return () => observer.disconnect();
  }, [measure]);

  function pickLeft(i: number) {
    if (!checked) setActive(active === i ? null : i);
  }

  function pickRight(j: number) {
    if (checked || active === null) return;
    // One partner per item: taking a right-hand slot frees whoever held it.
    setLinks(links.map((cur, i) => (i === active ? j : cur === j ? null : cur)));
    setActive(null);
  }

  function check() {
    setChecked(true);
    onResolve({ correct: task.left.every((_, i) => isRight(i)) });
  }

  const allLinked = links.every((j) => j !== null);
  const lineClass = (i: number) => (checked ? (isRight(i) ? "ok" : "no") : "");

  return (
    <>
      <div className="match" ref={box}>
        <div className="match-col">
          {task.left.map((text, i) => (
            <button
              key={i}
              ref={(el) => { leftRefs.current[i] = el; }}
              className={`match-item ${active === i ? "active" : ""} ${links[i] !== null ? "linked" : ""} ${checked ? lineClass(i) : ""}`}
              onClick={() => pickLeft(i)}
              aria-pressed={active === i}
            >
              {text}
            </button>
          ))}
        </div>
        <svg className="match-lines" aria-hidden="true">
          {lines.map((l, i) => l && (
            <path key={i} className={`match-line ${lineClass(i)}`}
              d={`M${l.x1},${l.y1} C${(l.x1 + l.x2) / 2},${l.y1} ${(l.x1 + l.x2) / 2},${l.y2} ${l.x2},${l.y2}`} />
          ))}
        </svg>
        <div className="match-col">
          {SCRAMBLE.map((src, j) => (
            <button
              key={j}
              ref={(el) => { rightRefs.current[j] = el; }}
              className={`match-item ${links.includes(j) ? "linked" : ""}`}
              disabled={checked}
              onClick={() => pickRight(j)}
            >
              {task.right[src]}
            </button>
          ))}
        </div>
      </div>
      {!checked && (
        <>
          <p className="hint">{active === null ? "Tap an item on the left to start a line." : "Now tap its match on the right."}</p>
          <button className="btn primary" disabled={!allLinked} onClick={check}>Check my matches</button>
        </>
      )}
    </>
  );
}
