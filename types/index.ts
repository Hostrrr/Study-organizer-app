export interface Task {
  id: string;
  title: string;
  description?: string;
  isDone: boolean;
  fileUrl?: string; // на будущее
}

export interface Assessment {
  id: string;
  type: "контрольная" | "проверочная";
  topic: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  notes?: string;
  tasks?: Task[];
  assessments?: Assessment[];
}

export interface Day {
  date: string; // "2025-11-21"
  weekday: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  title: string;
  color: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface CalendarData {
  days: Day[];
  subjects: Subject[];
  teachers: Teacher[];
}