import { addGrade, getGrades, deleteGrade } from '@/database/queries';
import { Grade } from '@/types/db';
import { useEffect, useState } from 'react';

export function useGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);

  const load = () => {
    setGrades(getGrades());
  };

  const create = (
    subject_id: number,
    grade: number,
    description?: string,
    date?: string
  ) => {
    addGrade(subject_id, grade, description, date);
    load();
  };

  const remove = (id: number) => {
    deleteGrade(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { grades, create, remove, reload: load };
}


