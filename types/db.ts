export interface Subject {
  id: number;
  name: string;
}

export interface Teacher {
  id: number;
  name: string;
}

export interface Lesson {
  id: number;
  subject_id: number;
  teacher_id: number;
  type: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  week_number?: number | null; // NULL для формата "одна неделя", 0 или 1 для формата "две недели"
  subject_name?: string;
  teacher_name?: string;
}

export interface Homework {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  due_date: string;
  is_completed: number;
}

export interface Task {
  id: number;
  title: string;
  date: string;
  subject_id?: number;
  is_done: number;
}

export interface Grade {
  id: number;
  subject_id: number;
  exam_id?: number | null;
  grade: number;
  description?: string;
  date?: string;
}

export interface Note {
  id: number;
  text: string;
  date: string;
  subject_id?: number;
  lesson_id?: number;
}

export interface Attachment {
  id: number;
  note_id: number;
  uri: string;
  type: string;
}

export interface Exam {
  id: number;
  subject_id: number;
  date: string;
  type: string;
  room?: string;
  is_completed?: number;
}
export interface NoteFolder {
  id: number;
  name: string;
  subject_id?: number;
  parent_id?: number | null;
}

export interface NoteV2 {
  id: number;
  title: string;
  body: string;
  subject_id?: number;
  folder_id?: number | null;
  tags?: string | null; // JSON строка: '["лекция","экзамен"]'
  created_at: string;
  updated_at: string;
}

export interface NoteLink {
  id: number;
  title: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  subject_id?: number;
  note_id?: number | null;
  next_review?: string | null;
  interval: number;
  ease_factor: number;
}