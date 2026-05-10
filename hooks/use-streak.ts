import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = '@flashcard_review_counts_v1';

type Stored = Record<string, number>;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function loadStored(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist completed review session (fire-and-forget). */
export function logReviewSession(reviewCount: number, _subjectId?: number): void {
  if (reviewCount <= 0) return;
  const today = formatLocalYmd(new Date());
  void (async () => {
    const data = await loadStored();
    data[today] = (data[today] ?? 0) + reviewCount;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  })();
}

export function useStreak() {
  const [stored, setStored] = useState<Stored>({});

  const reload = useCallback(() => {
    void loadStored().then(setStored);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const last7Days = useMemo(() => {
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(startOfDay(d));
    }
    return days;
  }, []);

  const last7DaysData = useMemo(() => {
    return last7Days.map(day => {
      const key = formatLocalYmd(day);
      return { date: day.toISOString(), count: stored[key] ?? 0 };
    });
  }, [last7Days, stored]);

  const streak = useMemo(() => {
    const today = startOfDay(new Date());
    let s = 0;
    for (let i = 0; i < 4000; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatLocalYmd(d);
      if ((stored[key] ?? 0) > 0) s++;
      else break;
    }
    return s;
  }, [stored]);

  return { streak, last7Days: last7DaysData };
}
