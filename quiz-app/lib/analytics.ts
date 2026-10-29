/**
 * Pure analytics over the raw response records in public/data/dashboard-data.json
 * (the same rows written to the Excel response sheets). Nothing here is a stored
 * chart value: every KPI and series is recomputed from the records, using the same
 * rules as the workbook formulas (Is_Correct = selected equals correct answer,
 * percentage = points / question count, categories by change in score).
 * Kept free of React so the maths can be checked against the workbook directly.
 */
export type Rec = [participantId: string, questionId: string, selected: string];
export type ScenarioKey = "Social" | "Seminar";
export type ScenarioChoice = ScenarioKey | "All";
export type Category = "Substantial" | "Modest" | "Unchanged" | "Lower";

export interface QuestionInfo { id: string; topic: string; objective: string; preCorrect: string; postCorrect: string }
export interface ScenarioData { label: string; participants: { id: string; name: string }[]; pre: Rec[]; post: Rec[] }
export interface DashboardData { questions: QuestionInfo[]; topics: string[]; scenarios: Record<ScenarioKey, ScenarioData> }

export const SCENARIO_KEYS: ScenarioKey[] = ["Social", "Seminar"];
export const CATEGORIES: Category[] = ["Substantial", "Modest", "Unchanged", "Lower"];
// Same rule as the workbook: a gain of 3 of 12 questions (25 percentage points) is "substantial".
export const SUBSTANTIAL_GAIN_PP = 25;
export const POST_TARGET = 0.6;

export interface ParticipantResult {
  id: string; name: string; pre: number; post: number; change: number;
  prePct: number; postPct: number; changePp: number; category: Category;
}
export interface TopicStat { topic: string; pre: number; post: number; gainPp: number }
export interface QuestionStat { id: string; topic: string; objective: string; pre: number; post: number; gainPp: number }
export interface Analysis {
  questionCount: number;
  participants: ParticipantResult[];
  kpis: { n: number; avgPre: number; avgPost: number; gainPp: number; relative: number | null; improvedShare: number };
  categories: { category: Category; count: number; share: number }[];
  scoreDist: { score: number; pre: number; post: number }[];
  changeDist: { change: number; count: number }[];
  topics: TopicStat[]; // always all topics, so the topic filter can highlight rather than hide them
  questions: QuestionStat[]; // respects the topic filter
}

export function parseDashboardData(json: unknown): DashboardData {
  const d = json as Partial<DashboardData> | null;
  const ok = d && Array.isArray(d.questions) && Array.isArray(d.topics) && d.scenarios
    && SCENARIO_KEYS.every((k) => Array.isArray(d.scenarios?.[k]?.participants) && Array.isArray(d.scenarios?.[k]?.pre) && Array.isArray(d.scenarios?.[k]?.post));
  if (!ok) throw new Error("The data file is not in the expected format.");
  return d as DashboardData;
}

export function scenarioData(data: DashboardData, choice: ScenarioChoice): ScenarioData {
  if (choice !== "All") return data.scenarios[choice];
  const parts = SCENARIO_KEYS.map((k) => data.scenarios[k]);
  return {
    label: "Both interventions",
    participants: parts.flatMap((p) => p.participants),
    pre: parts.flatMap((p) => p.pre),
    post: parts.flatMap((p) => p.post),
  };
}

function tally(recs: Rec[], correctOf: Map<string, string>, inFilter: Set<string>) {
  const perParticipant = new Map<string, number>();
  const perQuestion = new Map<string, number>();
  for (const [pid, qid, selected] of recs) {
    const right = selected === correctOf.get(qid) ? 1 : 0;
    perQuestion.set(qid, (perQuestion.get(qid) ?? 0) + right);
    if (inFilter.has(qid)) perParticipant.set(pid, (perParticipant.get(pid) ?? 0) + right);
  }
  return { perParticipant, perQuestion };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function categoryOf(changePp: number): Category {
  if (changePp >= SUBSTANTIAL_GAIN_PP - 1e-9) return "Substantial";
  if (changePp > 1e-9) return "Modest";
  return Math.abs(changePp) <= 1e-9 ? "Unchanged" : "Lower";
}

/** Returns null when there is nothing to analyse (no participants or no questions for the filter). */
export function analyze(data: DashboardData, choice: ScenarioChoice, topic: string | null): Analysis | null {
  const sd = scenarioData(data, choice);
  const filtered = data.questions.filter((q) => !topic || q.topic === topic);
  if (!sd.participants.length || !filtered.length) return null;

  const inFilter = new Set(filtered.map((q) => q.id));
  const pre = tally(sd.pre, new Map(data.questions.map((q) => [q.id, q.preCorrect])), inFilter);
  const post = tally(sd.post, new Map(data.questions.map((q) => [q.id, q.postCorrect])), inFilter);
  const n = sd.participants.length;
  const nq = filtered.length;

  const participants: ParticipantResult[] = sd.participants.map(({ id, name }) => {
    const a = pre.perParticipant.get(id) ?? 0;
    const b = post.perParticipant.get(id) ?? 0;
    const changePp = ((b - a) / nq) * 100;
    return { id, name, pre: a, post: b, change: b - a, prePct: a / nq, postPct: b / nq, changePp, category: categoryOf(changePp) };
  });

  const avgPre = mean(participants.map((p) => p.prePct));
  const avgPost = mean(participants.map((p) => p.postPct));
  const changes = participants.map((p) => p.change);
  const [lo, hi] = [Math.min(...changes), Math.max(...changes)];

  const accuracy = (counts: Map<string, number>, ids: string[]) =>
    ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0) / (n * ids.length);

  return {
    questionCount: nq,
    participants,
    kpis: {
      n, avgPre, avgPost,
      gainPp: (avgPost - avgPre) * 100,
      relative: avgPre > 0 ? (avgPost - avgPre) / avgPre : null,
      improvedShare: participants.filter((p) => p.change > 0).length / n,
    },
    categories: CATEGORIES.map((category) => {
      const count = participants.filter((p) => p.category === category).length;
      return { category, count, share: count / n };
    }),
    scoreDist: Array.from({ length: nq + 1 }, (_, score) => ({
      score,
      pre: participants.filter((p) => p.pre === score).length,
      post: participants.filter((p) => p.post === score).length,
    })),
    changeDist: Array.from({ length: hi - lo + 1 }, (_, i) => ({ change: lo + i, count: changes.filter((c) => c === lo + i).length })),
    topics: data.topics.map((t) => {
      const ids = data.questions.filter((q) => q.topic === t).map((q) => q.id);
      const a = accuracy(pre.perQuestion, ids);
      const b = accuracy(post.perQuestion, ids);
      return { topic: t, pre: a, post: b, gainPp: (b - a) * 100 };
    }),
    questions: filtered.map((q) => {
      const a = (pre.perQuestion.get(q.id) ?? 0) / n;
      const b = (post.perQuestion.get(q.id) ?? 0) / n;
      return { id: q.id, topic: q.topic, objective: q.objective, pre: a, post: b, gainPp: (b - a) * 100 };
    }),
  };
}

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const pp = (x: number, digits = 1) => `${x >= 0 ? "+" : ""}${x.toFixed(digits)} pp`;
