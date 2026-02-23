import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toPersianNumber = (num: number): string => {
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

/**
 * Shuffle choices for a question using a seeded random based on questionId.
 * Returns { shuffled, indexMap } where indexMap[newIndex] = originalIndex.
 * This lets us map the user's selection back to the original correct_index.
 */
export function shuffleChoices(
  choices: string[],
  questionId: string
): { shuffled: string[]; indexMap: number[] } {
  // Simple seeded hash from questionId
  let seed = 0;
  for (let i = 0; i < questionId.length; i++) {
    seed = ((seed << 5) - seed + questionId.charCodeAt(i)) | 0;
  }

  // Create index array and shuffle with seeded random
  const indices = choices.map((_, i) => i);
  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) / 0x100000000);
  };

  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return {
    shuffled: indices.map((i) => choices[i]),
    indexMap: indices, // indexMap[newPos] = originalPos
  };
}
