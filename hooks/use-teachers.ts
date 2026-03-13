import { addTeacher, getTeachers, deleteTeacher } from '@/database/queries';
import { Teacher } from '@/types/db';
import { useEffect, useState } from 'react';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const load = () => {
    setTeachers(getTeachers());
  };

  const create = (name: string) => {
    addTeacher(name);
    load();
  };

  const remove = (id: number) => {
    deleteTeacher(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { teachers, create, remove, reload: load };
}
