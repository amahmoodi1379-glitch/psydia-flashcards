const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
export const MAX_LEITNER_BOX = 7;

export interface SM2Result {
  boxNumber: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

export function calculateSM2(
  correct: boolean,
  currentBox: number,
  currentEase: number,
  currentInterval: number
): SM2Result {
  let newBox = currentBox;
  let newEase = currentEase;
  let newInterval = currentInterval;

  if (correct) {
    newBox = Math.min(currentBox + 1, MAX_LEITNER_BOX);
    newEase = currentEase + 0.1;

    if (newBox === 1) {
      newInterval = 1;
    } else if (newBox === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * newEase);
    }
  } else {
    newBox = 1;
    newInterval = 1;
    newEase = Math.max(MIN_EASE, currentEase - 0.2);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    boxNumber: newBox,
    easeFactor: newEase,
    intervalDays: newInterval,
    nextReviewAt,
  };
}

export { DEFAULT_EASE };
