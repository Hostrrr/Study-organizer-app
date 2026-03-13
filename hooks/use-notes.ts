import { addNote, getNotes, deleteNote, updateNote } from '@/database/queries';
import { Note } from '@/types/db';
import { useEffect, useState } from 'react';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  const load = () => {
    setNotes(getNotes());
  };

  const create = (text: string, date: string, subject_id?: number, lesson_id?: number) => {
    addNote(text, date, subject_id, lesson_id);
    load();
  };

  const update = (id: number, text: string, subject_id?: number) => {
    updateNote(id, text, subject_id);
    load();
  };

  const remove = (id: number) => {
    deleteNote(id);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return { notes, create, update, remove, reload: load };
}


