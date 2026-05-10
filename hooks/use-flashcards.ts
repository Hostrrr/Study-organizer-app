import {
  addFlashcard,
  deleteFlashcard,
  getFlashcards,
  getFlashcardsDueToday,
  updateFlashcardAfterReview,
} from '@/database/queries';
import { Flashcard } from '@/types/db';
import { useCallback, useEffect, useState } from 'react';

export function useFlashcards(subjectId?: number) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dueToday, setDueToday] = useState<Flashcard[]>([]);

  const reload = useCallback(() => {
    setFlashcards(getFlashcards(subjectId));
    setDueToday(getFlashcardsDueToday());
  }, [subjectId]);

  const createCard = useCallback(
    (front: string, back: string, subject_id?: number, note_id?: number) => {
      addFlashcard(front, back, subject_id, note_id);
      reload();
    },
    [reload]
  );

  const reviewCard = useCallback(
    (id: number, rating: 0 | 1 | 3 | 5, currentInterval: number, currentEaseFactor: number) => {
      const { interval, easeFactor, nextReview } = sm2(rating, currentInterval, currentEaseFactor);
      updateFlashcardAfterReview(id, interval, easeFactor, nextReview);
      reload();
    },
    [reload]
  );

  const removeCard = useCallback(
    (id: number) => {
      deleteFlashcard(id);
      reload();
    },
    [reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { flashcards, dueToday, reload, createCard, reviewCard, removeCard };
}

/**
 * SM-2 spaced repetition algorithm.
 * rating: 0 = complete blackout, 1 = wrong, 3 = correct with effort, 5 = perfect
 */
function sm2(
  rating: 0 | 1 | 3 | 5,
  interval: number,
  easeFactor: number
): { interval: number; easeFactor: number; nextReview: string } {
  let newInterval: number;
  let newEaseFactor = easeFactor;

  if (rating < 3) {
    // Failed — reset interval
    newInterval = 1;
  } else {
    if (interval <= 1) {
      newInterval = 1;
    } else if (interval === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    // Update ease factor: EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
    newEaseFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: parseFloat(newEaseFactor.toFixed(4)),
    nextReview: nextDate.toISOString().split('T')[0],
  };
}
