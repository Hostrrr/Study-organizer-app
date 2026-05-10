import {
  addNote2,
  addNoteFolder,
  deleteNote2,
  deleteNoteFolder,
  getNoteById2,
  getNoteFolders,
  getNotes2,
  searchNotes2,
  updateNote2,
  updateNoteFolder,
} from '@/database/queries';
import { NoteFolder, NoteV2 } from '@/types/db';
import { useCallback, useEffect, useRef, useState } from 'react';

export type NotesV2ReloadOptions = {
  subjectId?: number;
  folderId?: number;
};

export function useNotesV2() {
  const [notes, setNotes] = useState<NoteV2[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadOptionsRef = useRef<NotesV2ReloadOptions | undefined>(undefined);

  const reload = useCallback((options?: NotesV2ReloadOptions) => {
    if (options !== undefined) {
      reloadOptionsRef.current = options;
    }
    const o = reloadOptionsRef.current;
    setLoading(true);
    setNotes(getNotes2(o?.subjectId, o?.folderId));
    setFolders(getNoteFolders(o?.subjectId));
    setLoading(false);
  }, []);

  const search = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) {
        reload();
        return;
      }
      setLoading(true);
      setNotes(searchNotes2(q));
      setLoading(false);
    },
    [reload]
  );

  const getNoteById = useCallback((id: number) => getNoteById2(id), []);

  const createNote = useCallback(
    (
      title: string,
      body: string,
      subject_id?: number,
      folder_id?: number,
      tags?: string[]
    ) => {
      addNote2(title, body, subject_id, folder_id, tags);
      reload();
    },
    [reload]
  );

  const updateNote = useCallback(
    (
      id: number,
      title: string,
      body: string,
      subject_id?: number,
      folder_id?: number,
      tags?: string[]
    ) => {
      updateNote2(id, title, body, subject_id, folder_id, tags);
      reload();
    },
    [reload]
  );

  const removeNote = useCallback(
    (id: number) => {
      deleteNote2(id);
      reload();
    },
    [reload]
  );

  const createFolder = useCallback(
    (name: string, subject_id?: number, parent_id?: number) => {
      addNoteFolder(name, subject_id, parent_id);
      reload();
    },
    [reload]
  );

  const updateFolder = useCallback(
    (id: number, name: string) => {
      updateNoteFolder(id, name);
      reload();
    },
    [reload]
  );

  const removeFolder = useCallback(
    (id: number) => {
      deleteNoteFolder(id);
      reload();
    },
    [reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    notes,
    folders,
    loading,
    reload,
    search,
    getNoteById,
    createNote,
    updateNote,
    removeNote,
    createFolder,
    updateFolder,
    removeFolder,
  };
}
