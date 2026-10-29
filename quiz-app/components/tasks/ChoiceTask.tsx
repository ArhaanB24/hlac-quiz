"use client";

/** Four-option questions. `kind` only changes how the options look (chat reply, address bar, card). */
import { useState } from "react";
import { LETTERS, type Question } from "@/lib/quiz";
import type { TaskProps } from "./types";

export function ChoiceTask({ q, onResolve }: TaskProps & { q: Question }) {
  const [selected, setSelected] = useState<number | null>(null);

  function choose(i: number) {
    if (selected !== null) return;
    setSelected(i);
    onResolve({ correct: i === q.answer, pick: i });
  }

  return (
    <>
      {q.kind === "chat" && (
        <div className="phone" aria-hidden="false">
          <div className="phone-bar">WhatsApp</div>
          <div className="bubble in">{q.prompt}</div>
        </div>
      )}
      <div className="options" role="radiogroup" aria-label="Answer options">
        {q.options.map((text, i) => {
          const state = selected === null ? "" : i === q.answer ? "right" : i === selected ? "wrong" : "dim";
          return (
            <button
              key={i}
              role="radio"
              aria-checked={selected === i}
              disabled={selected !== null}
              className={`option ${q.kind} ${state}`}
              onClick={() => choose(i)}
            >
              <span className="letter">{LETTERS[i]}</span>
              {q.kind === "url" ? (
                <span className="text urlbar"><span aria-hidden="true">🔒</span> <code>{text}</code></span>
              ) : (
                <span className="text">{text}</span>
              )}
              {selected !== null && i === q.answer && <span className="mark" aria-label="Correct answer">✓</span>}
              {selected === i && i !== q.answer && <span className="mark" aria-label="Your answer, incorrect">✕</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
