import {
  Attachment, Exam,
  Flashcard,
  Grade,
  Homework,
  Lesson,
  Note,
  NoteFolder,
  NoteLink,
  NoteV2,
  Subject,
  Task,
  Teacher
} from '@/types/db';
import { db } from './db';

/* ---------------------- SUBJECTS ---------------------- */

export function getSubjects(): Subject[] {
  return db.getAllSync(`SELECT * FROM subjects ORDER BY name;`) as Subject[];
}

export function addSubject(name: string) {
  db.runSync(`INSERT INTO subjects (name) VALUES (?);`, [name]);
}

export function deleteSubject(id: number) {
  db.runSync(`DELETE FROM subjects WHERE id = ?;`, [id]);
}

/* ---------------------- TEACHERS ---------------------- */

export function getTeachers(): Teacher[] {
  return db.getAllSync(`SELECT * FROM teachers ORDER BY name;`) as Teacher[];
}

export function addTeacher(name: string) {
  db.runSync(`INSERT INTO teachers (name) VALUES (?);`, [name]);
}

export function deleteTeacher(id: number) {
  db.runSync(`DELETE FROM teachers WHERE id = ?;`, [id]);
}

/* ---------------------- LESSONS ---------------------- */

export function getLessons(): Lesson[] {
  return db.getAllSync(`
    SELECT lessons.*, 
      subjects.name AS subject_name,
      teachers.name AS teacher_name
    FROM lessons
    JOIN subjects ON lessons.subject_id = subjects.id
    JOIN teachers ON lessons.teacher_id = teachers.id
    ORDER BY day_of_week, start_time;
  `) as Lesson[];
}

export function getLessonsByDay(day: number, weekNumber?: number | null): Lesson[] {
  let query = `
    SELECT lessons.*, 
      subjects.name AS subject_name,
      teachers.name AS teacher_name
    FROM lessons
    JOIN subjects ON lessons.subject_id = subjects.id
    JOIN teachers ON lessons.teacher_id = teachers.id
    WHERE day_of_week = ?
  `;
  
  const params: any[] = [day];
  
  // Если указан номер недели, фильтруем по нему
  // Если weekNumber === null, показываем уроки без привязки к неделе (для формата "одна неделя")
  if (weekNumber !== undefined) {
    if (weekNumber === null) {
      // Показываем только уроки без привязки к неделе (week_number IS NULL)
      query += ` AND week_number IS NULL`;
    } else {
      // Показываем уроки для конкретной недели (week_number = weekNumber) или без привязки (week_number IS NULL)
      query += ` AND (week_number IS NULL OR week_number = ?)`;
      params.push(weekNumber);
    }
  }
  
  query += ` ORDER BY start_time;`;
  
  return db.getAllSync(query, params) as Lesson[];
}

export function getLessonById(id: number): Lesson | null {
  const result = db.getAllSync(`
    SELECT lessons.*, 
      subjects.name AS subject_name,
      teachers.name AS teacher_name
    FROM lessons
    JOIN subjects ON lessons.subject_id = subjects.id
    JOIN teachers ON lessons.teacher_id = teachers.id
    WHERE lessons.id = ?;
  `, [id]) as Lesson[];
  return result.length > 0 ? result[0] : null;
}

export function addLesson(
  subject_id: number,
  teacher_id: number,
  type: string,
  day_of_week: number,
  start_time: string,
  end_time: string,
  room?: string,
  week_number?: number | null
) {
  db.runSync(
    `INSERT INTO lessons (subject_id, teacher_id, type, day_of_week, start_time, end_time, room, week_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [subject_id, teacher_id, type, day_of_week, start_time, end_time, room ?? null, week_number ?? null]
  );
}

export function deleteLesson(id: number) {
  db.runSync(`DELETE FROM lessons WHERE id = ?;`, [id]);
}

export function deleteAllLessons() {
  db.runSync(`DELETE FROM lessons;`);
}

/* ---------------------- HOMEWORK ---------------------- */

export function getHomework(): Homework[] {
  return db.getAllSync(`SELECT * FROM homework;`) as Homework[];
}

export function getHomeworkByDate(date: string): Homework[] {
  return db.getAllSync(`SELECT * FROM homework WHERE due_date = ?;`, [date]) as Homework[];
}

export function getHomeworkByLessonId(lesson_id: number): Homework[] {
  return db.getAllSync(`SELECT * FROM homework WHERE lesson_id = ? ORDER BY due_date;`, [lesson_id]) as Homework[];
}

export function addHomework(
  lesson_id: number,
  title: string,
  description: string,
  due_date: string
) {
  db.runSync(
    `INSERT INTO homework (lesson_id, title, description, due_date) 
     VALUES (?, ?, ?, ?);`,
    [lesson_id, title, description, due_date]
  );
}

export function toggleHomework(id: number, is_completed: boolean) {
  db.runSync(`UPDATE homework SET is_completed = ? WHERE id = ?;`, [
    is_completed ? 1 : 0,
    id,
  ]);
}

export function deleteHomework(id: number) {
  db.runSync(`DELETE FROM homework WHERE id = ?;`, [id]);
}

/* ---------------------- TASKS ---------------------- */

export function getTasks(): Task[] {
  return db.getAllSync(`SELECT * FROM tasks ORDER BY date;`) as Task[];
}

export function getTasksByDate(date: string): Task[] {
  return db.getAllSync(`SELECT * FROM tasks WHERE date = ? ORDER BY date;`, [date]) as Task[];
}

export function addTask(title: string, date: string, subject_id?: number) {
  db.runSync(
    `INSERT INTO tasks (title, date, subject_id) VALUES (?, ?, ?);`,
    [title, date, subject_id ?? null]
  );
}

export function toggleTask(id: number, is_done: boolean) {
  db.runSync(`UPDATE tasks SET is_done = ? WHERE id = ?;`, [is_done ? 1 : 0, id]);
}

export function deleteTask(id: number) {
  db.runSync(`DELETE FROM tasks WHERE id = ?;`, [id]);
}

/* ---------------------- GRADES ---------------------- */

export function getGrades(): Grade[] {
  return db.getAllSync(`SELECT * FROM grades;`) as Grade[];
}

export function addGrade(
  subject_id: number,
  grade: number,
  description?: string,
  date?: string,
  exam_id?: number
) {
  db.runSync(
    `INSERT INTO grades (subject_id, exam_id, grade, description, date)
     VALUES (?, ?, ?, ?, ?);`,
    [subject_id, exam_id ?? null, grade, description ?? null, date ?? null]
  );
}

export function deleteGrade(id: number) {
  db.runSync(`DELETE FROM grades WHERE id = ?;`, [id]);
}

/* ---------------------- NOTES ---------------------- */

export function getNotes(): Note[] {
  return db.getAllSync(`SELECT * FROM notes ORDER BY date DESC;`) as Note[];
}

export function getNotesByLessonId(lesson_id: number): Note[] {
  return db.getAllSync(`SELECT * FROM notes WHERE lesson_id = ? ORDER BY date DESC;`, [lesson_id]) as Note[];
}

export function addNote(text: string, date: string, subject_id?: number, lesson_id?: number) {
  db.runSync(
    `INSERT INTO notes (text, date, subject_id, lesson_id)
     VALUES (?, ?, ?, ?);`,
    [text, date, subject_id ?? null, lesson_id ?? null]
  );
}

export function updateNote(id: number, text: string, subject_id?: number) {
  db.runSync(
    `UPDATE notes SET text = ?, subject_id = ? WHERE id = ?;`,
    [text, subject_id ?? null, id]
  );
}

export function deleteNote(id: number) {
  db.runSync(`DELETE FROM notes WHERE id = ?;`, [id]);
}

/* ---------------------- ATTACHMENTS ---------------------- */

export function getAttachmentsForNote(note_id: number): Attachment[] {
  return db.getAllSync(
    `SELECT * FROM attachments WHERE note_id = ?;`, 
    [note_id]
  ) as Attachment[];
}

export function addAttachmentToNote(note_id: number, uri: string, type: string) {
  db.runSync(
    `INSERT INTO attachments (note_id, uri, type)
     VALUES (?, ?, ?);`,
    [note_id, uri, type]
  );
}

/* ---------------------- EXAMS ---------------------- */

export function getExams(): Exam[] {
  return db.getAllSync(`SELECT * FROM exams ORDER BY date;`) as Exam[];
}

export function getExamsBySubjectIdAndDate(subject_id: number, date: string): Exam[] {
  return db.getAllSync(`SELECT * FROM exams WHERE subject_id = ? AND date = ? ORDER BY date;`, [subject_id, date]) as Exam[];
}

export function getExamsBySubjectId(subject_id: number): Exam[] {
  return db.getAllSync(`SELECT * FROM exams WHERE subject_id = ? ORDER BY date;`, [subject_id]) as Exam[];
}

export function addExam(
  subject_id: number,
  date: string,
  type: string,
  room?: string
) {
  db.runSync(
    `INSERT INTO exams (subject_id, date, type, room)
     VALUES (?, ?, ?, ?);`,
    [subject_id, date, type, room ?? null]
  );
}

export function toggleExam(id: number, is_completed: boolean) {
  db.runSync(`UPDATE exams SET is_completed = ? WHERE id = ?;`, [
    is_completed ? 1 : 0,
    id,
  ]);
}

export function deleteExam(id: number) {
  db.runSync(`DELETE FROM exams WHERE id = ?;`, [id]);
}

/* ---------------------- NOTE FOLDERS ---------------------- */

export function getNoteFolders(subject_id?: number): NoteFolder[] {
  if (subject_id !== undefined) {
    return db.getAllSync(
      `SELECT * FROM note_folders WHERE subject_id = ? ORDER BY name;`,
      [subject_id]
    ) as NoteFolder[];
  }
  return db.getAllSync(`SELECT * FROM note_folders ORDER BY name;`) as NoteFolder[];
}

export function getNoteFoldersByParent(parent_id: number | null): NoteFolder[] {
  if (parent_id === null) {
    return db.getAllSync(
      `SELECT * FROM note_folders WHERE parent_id IS NULL ORDER BY name;`
    ) as NoteFolder[];
  }
  return db.getAllSync(
    `SELECT * FROM note_folders WHERE parent_id = ? ORDER BY name;`,
    [parent_id]
  ) as NoteFolder[];
}

export function addNoteFolder(name: string, subject_id?: number, parent_id?: number) {
  db.runSync(
    `INSERT INTO note_folders (name, subject_id, parent_id) VALUES (?, ?, ?);`,
    [name, subject_id ?? null, parent_id ?? null]
  );
}

export function updateNoteFolder(id: number, name: string) {
  db.runSync(`UPDATE note_folders SET name = ? WHERE id = ?;`, [name, id]);
}

export function deleteNoteFolder(id: number) {
  db.runSync(`DELETE FROM note_folders WHERE id = ?;`, [id]);
}

/* ---------------------- NOTES V2 ---------------------- */

export function getNotes2(subject_id?: number, folder_id?: number): NoteV2[] {
  if (subject_id !== undefined && folder_id !== undefined) {
    return db.getAllSync(
      `SELECT * FROM notes_v2 WHERE subject_id = ? AND folder_id = ? ORDER BY updated_at DESC;`,
      [subject_id, folder_id]
    ) as NoteV2[];
  }
  if (subject_id !== undefined) {
    return db.getAllSync(
      `SELECT * FROM notes_v2 WHERE subject_id = ? ORDER BY updated_at DESC;`,
      [subject_id]
    ) as NoteV2[];
  }
  return db.getAllSync(
    `SELECT * FROM notes_v2 ORDER BY updated_at DESC;`
  ) as NoteV2[];
}

export function getNoteById2(id: number): NoteV2 | null {
  const result = db.getAllSync(
    `SELECT * FROM notes_v2 WHERE id = ?;`,
    [id]
  ) as NoteV2[];
  return result.length > 0 ? result[0] : null;
}

export function searchNotes2(query: string): NoteV2[] {
  const q = `%${query}%`;
  return db.getAllSync(
    `SELECT * FROM notes_v2 WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC;`,
    [q, q]
  ) as NoteV2[];
}

export function addNote2(
  title: string,
  body: string,
  subject_id?: number,
  folder_id?: number,
  tags?: string[]
) {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO notes_v2 (title, body, subject_id, folder_id, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [title, body, subject_id ?? null, folder_id ?? null, tags ? JSON.stringify(tags) : null, now, now]
  );
}

export function updateNote2(
  id: number,
  title: string,
  body: string,
  subject_id?: number,
  folder_id?: number,
  tags?: string[]
) {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE notes_v2 SET title = ?, body = ?, subject_id = ?, folder_id = ?, tags = ?, updated_at = ? WHERE id = ?;`,
    [title, body, subject_id ?? null, folder_id ?? null, tags ? JSON.stringify(tags) : null, now, id]
  );
}

export function deleteNote2(id: number) {
  db.runSync(`DELETE FROM notes_v2 WHERE id = ?;`, [id]);
}

/* ---------------------- NOTE LINKS ---------------------- */

export function getNoteLinks(from_id: number): NoteLink[] {
  return db.getAllSync(
    `SELECT notes_v2.id, notes_v2.title FROM note_links
     JOIN notes_v2 ON note_links.to_id = notes_v2.id
     WHERE note_links.from_id = ?;`,
    [from_id]
  ) as NoteLink[];
}

export function addNoteLink(from_id: number, to_id: number) {
  db.runSync(
    `INSERT OR IGNORE INTO note_links (from_id, to_id) VALUES (?, ?);`,
    [from_id, to_id]
  );
}

export function deleteNoteLink(from_id: number, to_id: number) {
  db.runSync(
    `DELETE FROM note_links WHERE from_id = ? AND to_id = ?;`,
    [from_id, to_id]
  );
}

/* ---------------------- FLASHCARDS ---------------------- */

export function getFlashcards(subject_id?: number): Flashcard[] {
  if (subject_id !== undefined) {
    return db.getAllSync(
      `SELECT * FROM flashcards WHERE subject_id = ? ORDER BY next_review;`,
      [subject_id]
    ) as Flashcard[];
  }
  return db.getAllSync(`SELECT * FROM flashcards ORDER BY next_review;`) as Flashcard[];
}

export function getFlashcardsDueToday(): Flashcard[] {
  const today = new Date().toISOString().split('T')[0];
  return db.getAllSync(
    `SELECT * FROM flashcards WHERE next_review IS NULL OR next_review <= ?;`,
    [today]
  ) as Flashcard[];
}

export function addFlashcard(
  front: string,
  back: string,
  subject_id?: number,
  note_id?: number
) {
  db.runSync(
    `INSERT INTO flashcards (front, back, subject_id, note_id) VALUES (?, ?, ?, ?);`,
    [front, back, subject_id ?? null, note_id ?? null]
  );
}

export function updateFlashcardAfterReview(
  id: number,
  interval: number,
  ease_factor: number,
  next_review: string
) {
  db.runSync(
    `UPDATE flashcards SET interval = ?, ease_factor = ?, next_review = ? WHERE id = ?;`,
    [interval, ease_factor, next_review, id]
  );
}

export function deleteFlashcard(id: number) {
  db.runSync(`DELETE FROM flashcards WHERE id = ?;`, [id]);
}