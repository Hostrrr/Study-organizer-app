import {
  Attachment, Exam,
  Grade,
  Homework,
  Lesson,
  Note,
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
  date?: string
) {
  db.runSync(
    `INSERT INTO grades (subject_id, grade, description, date)
     VALUES (?, ?, ?, ?);`,
    [subject_id, grade, description ?? null, date ?? null]
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