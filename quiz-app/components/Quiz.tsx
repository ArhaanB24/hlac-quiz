"use client";

/**
 * Whole quiz as one vertically scrolling page: hero (name + pre/post choice),
 * all questions in sequence, then results. A single client component owns the
 * state because every section depends on the same name, mode and answers.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { loadParticipant, newParticipantId, saveParticipant } from "@/lib/participant";
import { type Mode, type Response, questionsFor } from "@/lib/quiz";
import { QuestionCard } from "./QuestionCard";
import { Results } from "./Results";

const TOPIC_PILLS = [
  { icon: "💬", title: "WhatsApp scams" },
  { icon: "🎣", title: "Phishing" },
  { icon: "💸", title: "Everyday fraud" },
  { icon: "🛡️", title: "Staying safe" },
];

export function Quiz() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [mode, setMode] = useState<Mode>("pre");
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0); // bumping this remounts every question so tasks start fresh
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const questionsRef = useRef<HTMLElement>(null);

  // Read from localStorage after mount so the server and first client render match.
  useEffect(() => {
    const saved = loadParticipant();
    if (saved) {
      setName(saved.name);
      setId(saved.id);
    } else {
      setId(newParticipantId());
    }
  }, []);

  useEffect(() => {
    if (started) questionsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [started]);

  const questions = useMemo(() => questionsFor(mode), [mode]);
  const answered = questions.filter((q) => responses[q.id]).length;
  const finished = started && answered === questions.length;
  const trimmedName = name.trim();

  function start() {
    if (!trimmedName || !id) return;
    saveParticipant({ id, name: trimmedName });
    setStarted(true);
  }

  function restart() {
    setResponses({});
    setStarted(false);
    setRun((r) => r + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {started && (
        <div className="sticky-bar">
          <div className="sticky-inner">
            <span className="who">{trimmedName}</span>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length}
              aria-valuenow={answered} aria-label="Quiz progress">
              <div className="progress-fill" style={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
            {finished ? (
              <a className="count done" href="#results">See results ↓</a>
            ) : (
              <span className="count">{answered}/{questions.length}</span>
            )}
          </div>
        </div>
      )}

      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Cybersecurity awareness challenge</p>
          <h1>Can you spot the <span className="glow">scam</span>?</h1>
          <p className="lede">
            12 hands-on challenges: match the lines, swipe scams from safe, tap the red flags and more. Scroll down
            as you go, then see your score, your weak spots and a personal action plan.
          </p>

          <div className="pills">
            {TOPIC_PILLS.map((t) => <span key={t.title} className="pill"><span aria-hidden="true">{t.icon}</span> {t.title}</span>)}
          </div>

          <form className="start-box" onSubmit={(e) => { e.preventDefault(); start(); }}>
            <label htmlFor="name">What should we call you?</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              autoComplete="given-name" maxLength={40} disabled={started} required />

            <fieldset className="segmented" disabled={started}>
              <legend>Which quiz is this?</legend>
              {(["pre", "post"] as const).map((m) => (
                <label key={m} className={mode === m ? "on" : ""}>
                  <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                  {m === "pre" ? "Before (pre-quiz)" : "After (post-quiz)"}
                </label>
              ))}
            </fieldset>

            <button className="btn primary" type="submit" disabled={!trimmedName || started}>
              {started ? "Challenge in progress ↓" : "Start the challenge"}
            </button>
            <small>Your results are linked automatically, no ID needed.</small>
          </form>
        </section>

        {started && (
          <section ref={questionsRef} className="questions" aria-label="Quiz questions">
            {questions.map((q, i) => (
              <QuestionCard key={`${run}-${mode}-${q.id}`} index={i} q={q}
                onResolve={(r) => setResponses((prev) => ({ ...prev, [q.id]: r }))} />
            ))}
          </section>
        )}

        {finished && (
          <Results id={id} name={trimmedName} mode={mode} questions={questions}
            responses={questions.map((q) => responses[q.id])} onRestart={restart} />
        )}
      </main>
    </>
  );
}
