"use client";

/**
 * One question section. Chooses the interactive component for the question's
 * kind and shows the explanation once the participant has answered, so the
 * "why" appears right where they just made the decision.
 */
import { useState } from "react";
import { KIND_LABELS, TOPIC_LABELS, type Question, type Response } from "@/lib/quiz";
import { ChoiceTask } from "./tasks/ChoiceTask";
import { MatchTask } from "./tasks/MatchTask";
import { OrderTask } from "./tasks/OrderTask";
import { RedFlagTask } from "./tasks/RedFlagTask";
import { SwipeTask } from "./tasks/SwipeTask";

export function QuestionCard({ index, q, onResolve }: { index: number; q: Question; onResolve: (r: Response) => void }) {
  const [result, setResult] = useState<Response | null>(null);

  function resolve(r: Response) {
    setResult(r);
    onResolve(r);
  }

  const task = q.task;
  const heading = task?.intro ?? (q.kind === "chat" ? "A message arrives. What do you do?" : q.prompt);

  return (
    <article className="card q-card" id={`q-${q.id}`}>
      <div className="tags">
        <span className="q-num">{index + 1}</span>
        <span className="tag">{TOPIC_LABELS[q.topic]}</span>
        <span className="tag alt">{KIND_LABELS[q.kind]}</span>
      </div>
      <h2 className="prompt">{heading}</h2>

      {task?.kind === "swipe" ? <SwipeTask task={task} onResolve={resolve} />
        : task?.kind === "redflags" ? <RedFlagTask task={task} onResolve={resolve} />
        : task?.kind === "match" ? <MatchTask task={task} onResolve={resolve} />
        : task?.kind === "order" ? <OrderTask task={task} onResolve={resolve} />
        : <ChoiceTask q={q} onResolve={resolve} />}

      <div aria-live="polite">
        {result && (
          <div className={`feedback ${result.correct ? "good" : "bad"}`}>
            <strong>{result.correct ? "Nice catch!" : "Not quite."}</strong> {q.why}
          </div>
        )}
      </div>
    </article>
  );
}
