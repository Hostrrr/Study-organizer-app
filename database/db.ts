import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('study-organizer.db');

// Вызывается из _layout.tsx (initDb)
export function initDb() {
  console.log('[DB] Initializing database...');

  db.execSync(`
    PRAGMA foreign_keys = ON;
  `);

  // SUBJECTS
  db.execSync(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `);

  // TEACHERS
  db.execSync(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `);

  // LESSONS (конкретные пары)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- lecture | practice | lab
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL, -- HH:mm
      end_time TEXT NOT NULL,
      room TEXT,
      week_number INTEGER, -- NULL для формата "одна неделя", 0 или 1 для формата "две недели" (0 = неделя A, 1 = неделя B)
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    );
  `);

  // Миграция: добавляем поле week_number если его нет (только для существующих таблиц без этой колонки)
  try {
    const tableInfo = db.getAllSync(`PRAGMA table_info(lessons);`);
    const hasWeekNumber = tableInfo.some((row: any) => row.name === 'week_number');
    if (!hasWeekNumber) {
      db.execSync(`ALTER TABLE lessons ADD COLUMN week_number INTEGER;`);
    }
  } catch (e) {
    // Игнорируем ошибку
  }

  // HOMEWORK
  db.execSync(`
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );
  `);

  // TASKS (общие задачи/напоминания)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      title TEXT NOT NULL,
      date TEXT,
      is_done INTEGER DEFAULT 0,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );
  `);

  // GRADES / EXAMS / TESTS
  db.execSync(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      grade INTEGER NOT NULL,
      description TEXT,
      date TEXT,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);

  // NOTES
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      lesson_id INTEGER,
      text TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
    );
  `);

  // ATTACHMENTS (файлы, фото, ссылки)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NULL,
      homework_id INTEGER NULL,
      uri TEXT NOT NULL,
      type TEXT NOT NULL, -- image | file | link
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(homework_id) REFERENCES homework(id) ON DELETE CASCADE
    );
  `);

  // EXAMS
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL, -- midterm | final | credit | lab | oral
      room TEXT,
      is_completed INTEGER DEFAULT 0,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);
  
  // Добавляем колонку is_completed если её нет (только для существующих таблиц без этой колонки)
  try {
    const tableInfo = db.getAllSync(`PRAGMA table_info(exams);`);
    const hasIsCompleted = tableInfo.some((row: any) => row.name === 'is_completed');
    if (!hasIsCompleted) {
      db.execSync(`ALTER TABLE exams ADD COLUMN is_completed INTEGER DEFAULT 0;`);
    }
  } catch (e) {
    // Игнорируем ошибку
  }

  console.log('[DB] All tables ensured.');
}