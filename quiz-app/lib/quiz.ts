/**
 * Quiz domain logic. Separated from the UI so scoring and the pre/post form
 * selection can be reasoned about without React.
 * Questions come from data/questions.json, the same file the Excel workbook
 * generator reads, so the app and the analysis share one set of learning
 * objectives. The workbook models each objective as a four-option item; the app
 * presents some of them as interactive tasks (`task`) scored right or wrong.
 */
import data from "@/data/questions.json";

export type Mode = "pre" | "post";
export type Kind = "chat" | "url" | "cards" | "swipe" | "redflags" | "match" | "order";

export type Task =
  | { kind: "swipe"; intro: string; cards: { text: string; scam: boolean }[] }
  | { kind: "redflags"; intro: string; segments: { t: string; flag?: boolean }[] }
  | { kind: "match"; intro: string; left: string[]; right: string[] }
  | { kind: "order"; intro: string; steps: string[] };

interface Variant {
  prompt: string;
  options: string[];
  answer: number;
  why: string;
  task?: Task;
}
interface RawQuestion {
  id: string;
  topic: string;
  kind: Kind;
  objective: string;
  a: Variant;
  b: Variant;
}

export interface Question extends Variant {
  id: string;
  topic: string;
  kind: Kind;
  objective: string;
}

export interface Response {
  correct: boolean;
  pick?: number; // option index, only for the four-option kinds
}

const BANK = data as unknown as { topics: Record<string, string>; questions: RawQuestion[] };

export const TOPIC_LABELS = BANK.topics;
export const KIND_LABELS: Record<Kind, string> = {
  chat: "Reply in the chat",
  url: "Spot the real website",
  cards: "Pick the safest move",
  swipe: "Scam or safe?",
  redflags: "Tap the red flags",
  match: "Match the lines",
  order: "Put it in order",
};
export const LETTERS = "ABCD";

// Pre uses form A and post uses form B: parallel items for the same objective.
export function questionsFor(mode: Mode): Question[] {
  const form = mode === "pre" ? "a" : "b";
  return BANK.questions.map((q) => ({ id: q.id, topic: q.topic, kind: q.kind, objective: q.objective, ...q[form] }));
}

export interface TopicScore {
  topic: string;
  label: string;
  correct: number;
  total: number;
}

export function topicScores(questions: Question[], responses: Response[]): TopicScore[] {
  return Object.entries(TOPIC_LABELS).map(([topic, label]) => {
    const indexes = questions.flatMap((q, i) => (q.topic === topic ? [i] : []));
    return { topic, label, total: indexes.length, correct: indexes.filter((i) => responses[i]?.correct).length };
  });
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function responsesCsv(id: string, name: string, mode: Mode, questions: Question[], responses: Response[]) {
  const header = "Participant_ID,Participant_Name,Assessment_Stage,Question_ID,Task_Type,Selected_Answer,Is_Correct";
  const rows = questions.map((q, i) => {
    const r = responses[i];
    const selected = r.pick === undefined ? "" : LETTERS[r.pick];
    return [id, csvCell(name), mode === "pre" ? "Pre" : "Post", q.id, q.kind, selected, r.correct ? 1 : 0].join(",");
  });
  return [header, ...rows].join("\n");
}
