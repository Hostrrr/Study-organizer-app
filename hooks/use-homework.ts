import { addHomework, getHomework, getHomeworkByDate, toggleHomework, deleteHomework } from '@/database/queries';
import { Homework } from '@/types/db';
import { useEffect, useState } from 'react';

export function useHomework() {
  const [homework, setHomework] = useState<Homework[]>([]);

  const load = () => {
    setHomework(getHomework());
  };

  const loadByDate = (date: string) => {
    setHomework(getHomeworkByDate(date));
  };

  const create = (
    lesson_id: number,
    title: string,
    description: string,
    due_date: string
  ) => {
    addHomework(lesson_id, title, description, due_date);
    load();
  };

  const toggle = (id: number, is_completed: boolean) => {
    toggleHomework(id, is_completed);
    load();
  };

  const remove = (id: number) => {
    deleteHomework(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { homework, create, toggle, remove, reload: load, loadByDate };
}


