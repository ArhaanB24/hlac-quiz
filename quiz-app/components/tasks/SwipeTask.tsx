"use client";

/**
 * Tinder-style scam-or-safe cards. Swipe left = scam, right = safe; the buttons
 * do the same so it works with a keyboard or a mouse and for anyone who can't drag.
 */
import { useRef, useState } from "react";
import type { Task } from "@/lib/quiz";
import type { TaskProps } from "./types";

const SWIPE_THRESHOLD = 90;

export function SwipeTask({ task, onResolve }: TaskProps & { task: Extract<Task, { kind: "swipe" }> }) {
  const [calls, setCalls] = useState<boolean[]>([]); // true = participant said "scam"
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const index = calls.length;
  const done = index === task.cards.length;

  function decide(saidScam: boolean) {
    const next = [...calls, saidScam];
    setCalls(next);
    setDx(0);
    if (next.length === task.cards.length) {
      onResolve({ correct: next.every((call, i) => call === task.cards[i].scam) });
    }
  }

  function release() {
    if (startX.current === null) return;
    startX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) decide(dx < 0);
    else setDx(0);
  }

  if (done) {
    return (
      <ul className="swipe-summary">
        {task.cards.map((card, i) => {
          const right = calls[i] === card.scam;
          return (
            <li key={i} className={right ? "ok" : "no"}>
              <span className="mark">{right ? "✓" : "✕"}</span>
              <span>{card.text} <strong>{card.scam ? "(Scam)" : "(Safe)"}</strong></span>
            </li>
          );
        })}
      </ul>
    );
  }

  const card = task.cards[index];
  const lean = dx < -20 ? "lean-scam" : dx > 20 ? "lean-safe" : "";
  return (
    <div className="swipe">
      <div className="swipe-dots" aria-label={`Card ${index + 1} of ${task.cards.length}`}>
        {task.cards.map((_, i) => <span key={i} className={i < index ? "done" : i === index ? "now" : ""} />)}
      </div>
      <div
        className={`swipe-card ${lean}`}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: startX.current === null ? "transform .25s" : "none" }}
        onPointerDown={(e) => { startX.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (startX.current !== null) setDx(e.clientX - startX.current); }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <p>{card.text}</p>
        <small>← swipe or tap a button →</small>
      </div>
      <div className="swipe-buttons">
        <button className="btn danger" onClick={() => decide(true)}>🚨 Scam</button>
        <button className="btn safe" onClick={() => decide(false)}>✅ Safe</button>
      </div>
    </div>
  );
}
