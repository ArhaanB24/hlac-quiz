import type { Response } from "@/lib/quiz";

// Every task reports exactly one result, once, when the participant finishes it.
export interface TaskProps {
  onResolve: (response: Response) => void;
}
