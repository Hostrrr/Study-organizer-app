import { addSubject, deleteSubject, getSubjects } from '@/database/queries';
import { Subject } from '@/types/db';
import { useEffect, useState } from 'react';

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const load = () => {
    setSubjects(getSubjects());
  };

  const create = (name: string) => {
    addSubject(name);
    load();
  };

  const remove = (id: number) => {
    deleteSubject(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { subjects, create, remove, reload: load };
}