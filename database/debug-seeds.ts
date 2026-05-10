import { db } from './db';

const DEBUG_SEEDS_VERSION = 'v2';
const DEBUG_SEEDS_KEY = 'debug_seeds_version';

type SeedResult = {
  ok: boolean;
  seeded: boolean;
  message: string;
};

function getTodayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getNowIso(): string {
  return new Date().toISOString();
}

function hasAnyUserData(): boolean {
  const subjectCount = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM subjects;`
  );
  return (subjectCount?.count ?? 0) > 0;
}

function clearAllAppData() {
  db.execSync('BEGIN TRANSACTION;');
  try {
    try {
      db.execSync('DELETE FROM review_log;');
    } catch {
      // таблица могла отсутствовать на старых установках
    }
    db.execSync(`
      DELETE FROM note_links;
      DELETE FROM flashcards;
      DELETE FROM notes_v2;
      DELETE FROM note_folders;
      DELETE FROM attachments;
      DELETE FROM notes;
      DELETE FROM exams;
      DELETE FROM grades;
      DELETE FROM tasks;
      DELETE FROM homework;
      DELETE FROM lessons;
      DELETE FROM teachers;
      DELETE FROM subjects;
      DELETE FROM sqlite_sequence;
    `);
    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

function seedCoreData() {
  const now = getNowIso();
  const tomorrow = getTodayPlus(1);
  const inThreeDays = getTodayPlus(3);
  const inSevenDays = getTodayPlus(7);
  const inTenDays = getTodayPlus(10);

  db.execSync('BEGIN TRANSACTION;');
  try {
    db.execSync(`
      INSERT INTO subjects (id, name) VALUES
        (1, 'Математический анализ'),
        (2, 'Программирование'),
        (3, 'Физика'),
        (4, 'Английский язык'),
        (5, 'История'),
        (6, 'Философия');

      INSERT INTO teachers (id, name) VALUES
        (1, 'Иванов И.И.'),
        (2, 'Петрова А.С.'),
        (3, 'Кузнецов Д.М.'),
        (4, 'Смирнова Е.В.');

      INSERT INTO lessons (id, subject_id, teacher_id, type, day_of_week, start_time, end_time, room, week_number) VALUES
        (1, 1, 1, 'Лекция', 1, '09:00', '10:30', 'А-101', NULL),
        (2, 2, 2, 'Практика', 1, '10:40', '12:10', 'Б-204', NULL),
        (3, 3, 3, 'Лекция', 3, '12:30', '14:00', 'В-302', NULL),
        (4, 4, 4, 'Практика', 4, '09:00', '10:30', 'Г-115', NULL);

      INSERT INTO homework (id, lesson_id, title, description, due_date, is_completed) VALUES
        (1, 1, 'Решить задачи 1-10', 'Подготовка к семинару', '${inThreeDays}', 0),
        (2, 2, 'Реализовать стек на TS', 'Сдать в репозиторий', '${inSevenDays}', 0),
        (3, 3, 'Конспект по теме колебания', '1-2 страницы', '${tomorrow}', 1),
        (4, 4, 'Выучить слова Unit 5', '50 слов', '${getTodayPlus(2)}', 0),
        (5, 1, 'Подготовить доклад', 'На тему рядов', '${getTodayPlus(5)}', 1),
        (6, 2, 'Написать unit-тесты', 'Покрытие 80%', '${getTodayPlus(4)}', 0),
        (7, 3, 'Решить задачи по механике', 'Задачи 5-12', '${getTodayPlus(1)}', 0),
        (8, 3, 'Реферат по квантовой физике', '5 страниц', '${getTodayPlus(6)}', 1);

      INSERT INTO grades (id, subject_id, grade, description, date) VALUES
        (1, 1, 5, 'Контрольная №1', '${getTodayPlus(-5)}'),
        (2, 2, 4, 'Лабораторная работа', '${getTodayPlus(-2)}'),
        (3, 1, 4, 'Семинар', '${getTodayPlus(-10)}'),
        (4, 1, 5, 'Контрольная №2', '${getTodayPlus(-3)}'),
        (5, 3, 3, 'Лабораторная', '${getTodayPlus(-7)}'),
        (6, 4, 5, 'Устный ответ', '${getTodayPlus(-1)}'),
        (7, 2, 4, 'Практическая', '${getTodayPlus(-4)}'),
        (8, 3, 5, 'Доклад', '${getTodayPlus(-2)}');

      INSERT INTO notes (id, subject_id, lesson_id, text, date) VALUES
        (1, 1, 1, 'Предел функции: определение и примеры.', '${now}'),
        (2, 2, 2, 'SOLID: Single Responsibility, Open/Closed...', '${now}');

      INSERT INTO note_folders (id, subject_id, name, parent_id) VALUES
        (1, 2, 'Алгоритмы', NULL),
        (2, 1, 'Экзамен', NULL);

      INSERT INTO notes_v2 (id, subject_id, folder_id, title, body, tags, created_at, updated_at) VALUES
        (1, 2, 1, 'Сложность алгоритмов', '# O-нотация\\n\\n- O(1)\\n- O(log n)\\n- O(n)', '["алгоритмы","экзамен"]', '${now}', '${now}'),
        (2, 1, 2, 'Шпаргалка по пределам', '## Базовые пределы\\n\\n1. sin(x)/x -> 1', '["матан","шпаргалка"]', '${now}', '${now}'),
        (3, 3, NULL, 'Законы Ньютона', '## Первый закон\\n\\nТело в покое...', '["физика","механика"]', '${now}', '${now}'),
        (4, 4, NULL, 'Неправильные глаголы', '**go** - went - gone\\n**be** - was/were - been', '["английский","грамматика"]', '${now}', '${now}'),
        (5, 1, 2, 'Ряды Тейлора', '## Формула\\n\\nf(x) = f(0) + f''(0)x + ...', '["матан","ряды"]', '${now}', '${now}'),
        (6, 2, 1, 'Паттерн Observer', '**Observer** - паттерн поведения\\n\\nПодписчик получает уведомления', '["паттерны","ООП"]', '${now}', '${now}');

      INSERT INTO note_links (from_id, to_id) VALUES
        (1, 2);

      INSERT INTO flashcards (id, subject_id, note_id, front, back, next_review, interval, ease_factor) VALUES
        (1, 2, 1, 'Что такое O(log n)?', 'Логарифмическая сложность', '${tomorrow}', 1, 2.5),
        (2, 1, 2, 'Предел sin(x)/x при x->0?', 'Равен 1', '${inThreeDays}', 2, 2.4),
        (3, 3, NULL, 'Второй закон Ньютона', 'F = ma', NULL, 1, 2.5),
        (4, 4, NULL, 'Перевод: to acquire', 'приобретать', NULL, 1, 2.5),
        (5, 1, NULL, 'Формула Тейлора — применение', 'Приближённые вычисления функций', '${getTodayPlus(2)}', 3, 2.3),
        (6, 2, NULL, 'Что такое dependency injection?', 'Передача зависимостей через конструктор', '${getTodayPlus(1)}', 2, 2.4),
        (7, 4, NULL, 'Перевод: to emphasize', 'подчёркивать, акцентировать', '${getTodayPlus(8)}', 10, 2.7),
        (8, 3, NULL, 'Единица силы в СИ', 'Ньютон (Н)', '${getTodayPlus(14)}', 21, 2.8),
        (9, 1, NULL, 'Интеграл от x^n', 'x^(n+1)/(n+1) + C', '${getTodayPlus(0)}', 1, 2.5),
        (10, 4, NULL, 'Перевод: to implement', 'реализовывать, внедрять', '${getTodayPlus(0)}', 1, 2.5);

      INSERT INTO exams (id, subject_id, date, type, room, is_completed) VALUES
        (1, 1, '${inTenDays}', 'midterm', 'А-201', 0),
        (2, 2, '${getTodayPlus(14)}', 'credit', 'Б-305', 0),
        (3, 3, '${getTodayPlus(5)}', 'lab', 'В-301', 0),
        (4, 4, '${getTodayPlus(21)}', 'oral', 'Г-110', 0),
        (5, 1, '${getTodayPlus(3)}', 'midterm', 'А-201', 0);

      INSERT INTO review_log (reviewed_at, cards_reviewed, subject_id) VALUES
        ('${getTodayPlus(-6)}', 5, 2),
        ('${getTodayPlus(-5)}', 3, 1),
        ('${getTodayPlus(-4)}', 8, 3),
        ('${getTodayPlus(-3)}', 4, 4),
        ('${getTodayPlus(-2)}', 6, 1),
        ('${getTodayPlus(-1)}', 7, 2),
        ('${getTodayPlus(0)}', 3, 3);
    `);
    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

function getSeedVersion(): string | null {
  try {
    const value = db.getFirstSync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?;`,
      [DEBUG_SEEDS_KEY]
    );
    return value?.value ?? null;
  } catch {
    return null;
  }
}

function setSeedVersion(version: string) {
  db.runSync(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [DEBUG_SEEDS_KEY, version]
  );
}

export function runDebugSeeds(options?: { forceReset?: boolean }): SeedResult {
  const forceReset = options?.forceReset ?? false;

  try {
    const hasData = hasAnyUserData();
    const currentVersion = getSeedVersion();
    const alreadySeededCurrentVersion = currentVersion === DEBUG_SEEDS_VERSION;

    if (hasData && !forceReset && alreadySeededCurrentVersion) {
      return {
        ok: true,
        seeded: false,
        message: 'Сиды уже применены, пропускаем.',
      };
    }

    if (hasData && !forceReset && !alreadySeededCurrentVersion) {
      return {
        ok: false,
        seeded: false,
        message: 'В базе уже есть данные. Для пересида используй режим forceReset.',
      };
    }

    clearAllAppData();
    seedCoreData();
    setSeedVersion(DEBUG_SEEDS_VERSION);

    return {
      ok: true,
      seeded: true,
      message: 'Отладочные сиды применены.',
    };
  } catch (error) {
    console.error('[DEBUG_SEEDS] Error while seeding:', error);
    return {
      ok: false,
      seeded: false,
      message: 'Не удалось применить сиды.',
    };
  }
}

export function clearDebugData(): SeedResult {
  try {
    clearAllAppData();
    setSeedVersion('none');
    return {
      ok: true,
      seeded: false,
      message: 'Все данные очищены.',
    };
  } catch (error) {
    console.error('[DEBUG_SEEDS] Error while clearing:', error);
    return {
      ok: false,
      seeded: false,
      message: 'Не удалось очистить данные.',
    };
  }
}
