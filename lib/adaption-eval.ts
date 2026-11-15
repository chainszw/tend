import "server-only";
import evaluation from "@/data/adaption-eval.json";

export interface AdaptionEvaluation {
  datasetName: string;
  rows: number;
  status: string;
  gradeBefore: string | null;
  gradeAfter: string | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  improvementPercent: number | null;
  evaluatedAt: string | null;
}

/**
 * Quality evaluation of the care-guidance dataset after it was run through
 * Adaption Adaptive Data. Written by `npm run adaption:dataset`.
 */
export function adaptionEvaluation(): AdaptionEvaluation {
  return evaluation as AdaptionEvaluation;
}
