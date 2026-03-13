import { addExam, getExams, deleteExam, toggleExam } from '@/database/queries';
import { Exam } from '@/types/db';
import { useEffect, useState } from 'react';

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);

  const load = () => {
    setExams(getExams());
  };

  const create = (
    subject_id: number,
    date: string,
    type: string,
    room?: string
  ) => {
    addExam(subject_id, date, type, room);
    load();
  };

  const toggle = (id: number, is_completed: boolean) => {
    toggleExam(id, is_completed);
    load();
  };

  const remove = (id: number) => {
    deleteExam(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { exams, create, toggle, remove, reload: load };
}


