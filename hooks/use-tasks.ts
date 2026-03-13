import { addTask, getTasks, getTasksByDate, toggleTask, deleteTask } from '@/database/queries';
import { Task } from '@/types/db';
import { useEffect, useState } from 'react';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = () => {
    setTasks(getTasks());
  };

  const loadByDate = (date: string) => {
    setTasks(getTasksByDate(date));
  };

  const create = (title: string, date: string, subject_id?: number) => {
    addTask(title, date, subject_id);
    load();
  };

  const toggle = (id: number, is_done: boolean) => {
    toggleTask(id, is_done);
    load();
  };

  const remove = (id: number) => {
    deleteTask(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { tasks, create, toggle, remove, reload: load, loadByDate };
}


