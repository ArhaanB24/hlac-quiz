"use client";

/**
 * Completion section at the bottom of the page: score ring, per-topic breakdown,
 * personalised advice and a CSV download of the participant's responses.
 */
import { type Mode, type Question, type Response, responsesCsv, topicScores } from "@/lib/quiz";

// Topic-specific next steps shown only where the participant got most items wrong.
const ADVICE: Record<string, string> = {
  whatsapp: "Treat unknown numbers and urgent 'family' requests with suspicion. Never share a WhatsApp code, and turn on two-step verification.",
  phishing: "Type web addresses or use official apps instead of clicking links, check the domain carefully, and never share OTPs with anyone.",
  everyday: "You never need a PIN to receive money, no agency does 'digital arrest', and genuine support never asks for remote access.",
  prevention: "Pause when you see urgency or secrecy, verify through a number you already trust, and report fraud fast at 1930 or cybercrime.gov.in.",
};

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const WEAK_BELOW = 0.6;

function verdict(pct: number) {
  if (pct >= 85) return "Scam-proof champion";
  if (pct >= 65) return "Sharp-eyed defender";
  if (pct >= 40) return "Getting savvy";
  return "Time to level up";
}

interface Props {
  id: string;
  name: string;
  mode: Mode;
  questions: Question[];
  responses: Response[];
  onRestart: () => void;
}

export function Results({ id, name, mode, questions, responses, onRestart }: Props) {
  const score = responses.filter((r) => r.correct).length;
  const pct = Math.round((score / questions.length) * 100);
  const topics = topicScores(questions, responses);
  const weak = topics.filter((t) => t.correct / t.total < WEAK_BELOW);
  const missed = questions.filter((_, i) => !responses[i].correct);

  function download() {
    const blob = new Blob([responsesCsv(id, name, mode, questions, responses)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${id}_${mode}_responses.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="results" id="results" aria-labelledby="results-title">
      <p className="eyebrow">{mode === "pre" ? "Pre-quiz" : "Post-quiz"} complete</p>
      <h2 id="results-title" className="results-title">{name}, you are a {verdict(pct)}</h2>

      <div className="score-ring" role="img" aria-label={`Score ${score} out of ${questions.length}, ${pct} percent`}>
        <svg viewBox="0 0 120 120">
          <circle className="ring-bg" cx="60" cy="60" r={RING_RADIUS} />
          <circle className="ring-fg" cx="60" cy="60" r={RING_RADIUS} strokeDasharray={RING_LENGTH}
            style={{ ["--target" as string]: RING_LENGTH * (1 - pct / 100) }} />
        </svg>
        <div className="ring-text"><strong>{score}/{questions.length}</strong><span>{pct}%</span></div>
      </div>

      <div className="card left">
        <h3>Your score by topic</h3>
        {topics.map((t, i) => (
          <div key={t.topic} className="topic-row">
            <div className="topic-head"><span>{t.label}</span><span>{t.correct}/{t.total}</span></div>
            <div className="bar"><div className="bar-fill" style={{ width: `${(t.correct / t.total) * 100}%`, animationDelay: `${i * 120}ms` }} /></div>
          </div>
        ))}
      </div>

      <div className="card left">
        <h3>Your action plan</h3>
        {weak.length === 0 ? (
          <p>Strong across every topic. Keep verifying before you click, pay or share, and help someone else spot a scam this week.</p>
        ) : (
          <ul className="advice">{weak.map((t) => <li key={t.topic}><strong>{t.label}:</strong> {ADVICE[t.topic]}</li>)}</ul>
        )}
      </div>

      {missed.length > 0 && (
        <div className="card left">
          <h3>Review what you missed</h3>
          {missed.map((q) => (
            <details key={q.id} className="review">
              <summary>{q.objective}</summary>
              <p>{q.why}</p>
            </details>
          ))}
        </div>
      )}

      <p className="muted">Your participant ID is <strong>{id}</strong>. It is saved in this browser so your pre and post quizzes link up.</p>
      <div className="cta-row center">
        <button className="btn ghost" onClick={download}>Download my responses (CSV)</button>
        <button className="btn primary" onClick={onRestart}>{mode === "pre" ? "Back to top" : "Retake"}</button>
      </div>
    </section>
  );
}
