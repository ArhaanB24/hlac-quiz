/**
 * Participant identity. The ID is generated and kept in this browser so the
 * same person's pre and post quizzes link up without asking them to type an ID.
 * Storage can throw (private mode, blocked cookies), so every access degrades
 * to "no saved participant" instead of breaking the quiz.
 */
const KEY = "scamshield.participant";
// No 0/O/1/I so an ID read aloud or copied by hand is unambiguous.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface Participant {
  id: string;
  name: string;
}

export function newParticipantId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "P" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function loadParticipant(): Participant | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return saved && typeof saved.id === "string" && typeof saved.name === "string" ? saved : null;
  } catch {
    return null;
  }
}

export function saveParticipant(p: Participant) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Quiz still works; only the pre/post link across visits is lost.
  }
}
