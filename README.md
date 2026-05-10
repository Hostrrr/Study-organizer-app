<div align="center">

# StudyOrganizer

### Кросс-платформенный мобильный органайзер для учёбы

<div align="center">
  <img src="./assets/screenshots/1.png" width="30%" />
  <img src="./assets/screenshots/2.png" width="30%" />
  <img src="./assets/screenshots/3.png" width="30%" />
</div>

[![React Native](https://img.shields.io/badge/React%20Native-0.83-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-55-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-local%20DB-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey?style=flat-square)](https://reactnative.dev/)

*Курсовой проект — Кубанский государственный университет, факультет компьютерных технологий и прикладной математики*

</div>

---

## О проекте

**StudyOrganizer** — это мобильное приложение для студентов, помогающее структурировать учебный процесс: расписание, дедлайны, заметки, флэшкарды и оценки в одном месте. Построено на **React Native** + **Expo** с маршрутизацией через **Expo Router**, работает на iOS и Android из одной TypeScript-кодобазы.

Все данные хранятся локально в SQLite — приложение полностью функционально без интернета и не требует регистрации.

---

## Возможности

| Раздел | Описание |
|---|---|
| **Расписание** | Понедельная сетка пар с поддержкой формата «одна неделя» / «две недели» (A/B), редактированием и мастером первого запуска |
| **Календарь** | Просмотр событий по дате: пары, домашка, контрольные, тесты, экзамены |
| **База знаний** | Заметки в Markdown, организованные по предметам и папкам, со ссылками между заметками |
| **Флэшкарды** | Извлечение карточек из Markdown-заметок, режим повторения с алгоритмом интервалов (SM-2) |
| **Оценки** | Учёт оценок за экзамены, контрольные и тесты по каждому предмету |
| **Vault Sync** | Импорт/экспорт базы знаний в формате, совместимом с Obsidian-подобными хранилищами |
| **Streak** | Счётчик дней подряд с активным повторением карточек |
| **Темы** | Светлая / тёмная / системная тема |
| **Локальное хранение** | Все данные в SQLite на устройстве, без аккаунта и сети |

---

## Технологический стек

- **Фреймворк:** [React Native](https://reactnative.dev/) 0.83 + [Expo](https://expo.dev/) SDK 55
- **Язык:** TypeScript 5.9
- **UI:** React 19, Reanimated 4, expo-blur, expo-glass-effect, expo-linear-gradient
- **Маршрутизация:** [Expo Router](https://docs.expo.dev/router/introduction/) (typed routes)
- **БД:** SQLite через `expo-sqlite`
- **Графики:** `react-native-gifted-charts`, `react-native-chart-kit`
- **Календарь:** `react-native-calendars`
- **Markdown:** `react-native-markdown-display`
- **Сборка:** Expo CLI, EAS Build, Metro

---

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) 18 или выше
- npm 9+
- [Expo Go](https://expo.dev/client) на телефоне *или* Xcode / Android Studio для симуляторов

### Установка и запуск

```bash
git clone https://github.com/hostrrr/study-organizer-app.git
cd study-organizer-app

npm install

npx expo start
```

Дальше:

- отсканируйте QR-код в **Expo Go**, или
- нажмите `i` для запуска в iOS-симуляторе, `a` — в Android-эмуляторе.

Для нативной сборки (с кастомными нативными модулями) используйте:

```bash
npx expo run:ios
npx expo run:android
```

---

## Структура проекта

```
StudyOrganizer/
├── app/                         # Expo Router — экраны и навигация
│   ├── _layout.tsx              # Корневой Stack + инициализация БД, шрифтов, темы
│   ├── (tabs)/                  # Нижняя панель навигации
│   │   ├── _layout.tsx
│   │   ├── schedule.tsx         # Расписание на неделю
│   │   ├── calendar.tsx         # Календарь по датам
│   │   └── notes.tsx            # База знаний / предметы
│   ├── startup.tsx              # Мастер первого запуска
│   ├── add-lesson.tsx           # Добавление пары
│   ├── edit-schedule.tsx        # Редактирование расписания
│   ├── add-homework.tsx         # Добавление домашки/контрольной
│   ├── lesson-details.tsx       # Детали пары
│   ├── date-details.tsx         # Детали дня
│   ├── subject-details.tsx      # Детали предмета (заметки, оценки, экзамены)
│   ├── note-editor.tsx          # Markdown-редактор заметок
│   ├── flashcard-review.tsx     # Повторение флэшкард
│   ├── vault-sync.tsx           # Импорт/экспорт базы знаний
│   └── settings.tsx             # Настройки
├── components/                  # Переиспользуемые UI-компоненты
│   └── ui/                      # Базовые UI-примитивы (FAB, контейнеры, иконки)
├── hooks/                       # Хуки доступа к данным и состоянию
├── database/                    # SQLite: схема (db.ts), запросы, отладочные сиды
├── constants/                   # Темы и цветовая схема
├── utils/                       # Утилиты (флэшкарды из Markdown, экзамены и т.д.)
├── types/                       # Типы доменной модели
├── assets/                      # Иконки, шрифты, изображения, скриншоты
├── scripts/                     # Сервисные скрипты (например, reset-project)
├── app.json                     # Конфигурация Expo
├── eas.json                     # Конфигурация EAS Build
├── package.json
└── tsconfig.json
```

---

## Схема БД

Локальная SQLite-база (`study-organizer.db`) с основными таблицами:

| Таблица | Назначение |
|---|---|
| `subjects`, `teachers` | Справочники предметов и преподавателей |
| `lessons` | Пары в расписании (день, время, аудитория, формат недели A/B) |
| `homework` | Домашние задания, привязанные к парам |
| `tasks` | Произвольные задачи и напоминания |
| `exams` | Контрольные, тесты, зачёты, экзамены |
| `grades` | Оценки по предметам/экзаменам |
| `notes` / `notes_v2` | Заметки (старая и новая v2-схема с Markdown и тегами) |
| `note_folders`, `note_links` | Папки и ссылки между заметками |
| `flashcards` | Флэшкарды с интервалами повторения (SM-2) |
| `review_log` | Лог повторений для streak и аналитики |
| `attachments` | Файлы, изображения, ссылки |
| `app_settings` | Служебные настройки (флаги, версии) |

Миграции выполняются inline в `database/db.ts` через `PRAGMA table_info` + `ALTER TABLE`.

---

## Архитектура

Приложение построено по принципу разделения слоёв:

- **UI-слой** — экраны и компоненты на React Native, локальное состояние через хуки
- **Слой данных** — кастомные хуки (`hooks/use-*`) поверх запросов SQLite в `database/queries.ts`
- **Слой БД** — `database/db.ts` (схема + миграции), `expo-sqlite` для синхронных операций
- **Навигация** — Expo Router с typed routes; модальные экраны через `presentation: 'modal'`

---

## Тестирование

Приложение протестировано на:

- физическом устройстве Android
- iOS-симуляторе (Xcode)
- Expo Go (iOS и Android)
- разных размерах экрана (телефон, планшет)

---

## Лицензия

Проект разработан как **курсовая работа** в Кубанском государственном университете (2025–2026).
Можно свободно использовать как справочный материал или основу для своих проектов.

---

<div align="center">

Сделано **Г. С. Назаренко**
Кубанский государственный университет · 2025–2026

</div>
