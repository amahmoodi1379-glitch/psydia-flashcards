import { useCallback, useEffect, useState } from "react";
import { ReviewFilter } from "./useReviewQuestions";

export interface SavedSession {
  filter: ReviewFilter;
  sessionSize: number;
  title: string;
  currentIndex: number;
  correctCount: number;
  questionIds: string[];
  answeredQuestions: string[];
  savedAt: number;
}

const SESSION_KEY = "review_session";
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useSessionPersistence() {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed: SavedSession = JSON.parse(stored);
        // Check if session is expired
        if (Date.now() - parsed.savedAt < SESSION_EXPIRY_MS) {
          // Check if session has remaining questions
          if (parsed.currentIndex < parsed.questionIds.length) {
            setSavedSession(parsed);
          } else {
            // Session is complete, remove it
            localStorage.removeItem(SESSION_KEY);
          }
        } else {
          // Session expired, remove it
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const saveSession = useCallback((session: Omit<SavedSession, "savedAt">) => {
    const toSave: SavedSession = {
      ...session,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    setSavedSession(toSave);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSavedSession(null);
  }, []);

  const getRemainingCount = useCallback(() => {
    if (!savedSession) return 0;
    return savedSession.questionIds.length - savedSession.currentIndex;
  }, [savedSession]);

  return {
    savedSession,
    saveSession,
    clearSession,
    getRemainingCount,
    hasActiveSession: !!savedSession,
  };
}
