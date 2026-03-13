import { addLesson, deleteLesson, getLessons, getLessonsByDay } from '@/database/queries';
import { Lesson } from '@/types/db';
import { useEffect, useState } from 'react';

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const load = () => {
    setLessons(getLessons());
  };

  const loadByDay = (day: number, weekNumber?: number | null) => {
    setLessons(getLessonsByDay(day, weekNumber));
  };

  const create = (
    subject_id: number,
    teacher_id: number,
    type: string,
    day_of_week: number,
    start_time: string,
    end_time: string,
    room?: string,
    week_number?: number | null,
    reloadForDay?: number,
    reloadWeekNumber?: number | null
  ) => {
    addLesson(subject_id, teacher_id, type, day_of_week, start_time, end_time, room, week_number);
    if (reloadForDay !== undefined) {
      loadByDay(reloadForDay, reloadWeekNumber);
    } else {
      load();
    }
  };

  const remove = (id: number) => {
    deleteLesson(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { lessons, create, remove, reload: load, loadByDay };
}

