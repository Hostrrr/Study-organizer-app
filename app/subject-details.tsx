import AssessmentActions from '@/components/assessment-actions';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAssessmentActions } from '@/hooks/use-assessment-actions';
import { useExams } from '@/hooks/use-exams';
import { useFlashcards } from '@/hooks/use-flashcards';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useNotesV2 } from '@/hooks/use-notes-v2';
import { useSubjects } from '@/hooks/use-subjects';
import { Exam } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AssessmentKind = 'homework' | 'control' | 'test' | 'exam';

type SubjectTaskItem = {
  id: string;
  kind: AssessmentKind;
  date: string;
  title: string;
  subtitle?: string;
  done: boolean;
  homeworkId?: number;
  exam?: Exam;
};

function parseSubjectId(v: string | string[] | undefined): number | null {
  if (!v) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function SubjectDetailsScreen() {
  const { colors } = useAppTheme();
  const { subjectId: subjectIdParam } = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = useMemo(() => parseSubjectId(subjectIdParam), [subjectIdParam]);

  const { subjects } = useSubjects();
  const { lessons } = useLessons();
  const { notes, reload: reloadNotes } = useNotesV2();
  const { exams, reload: reloadExams } = useExams();
  const { homework, toggle: toggleHomeworkDone, reload: reloadHomework } = useHomework();
  const { flashcards, dueToday, reload: reloadFlashcards } = useFlashcards();
  const { setExamDone } = useAssessmentActions();
  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [gradingExamId, setGradingExamId] = useState<number | null>(null);

  const subject = useMemo(
    () => subjects.find((item) => item.id === subjectId) ?? null,
    [subjects, subjectId]
  );

  const lessonIds = useMemo(() => {
    const ids = new Set<number>();
    lessons.forEach((lesson) => {
      if (subjectId !== null && lesson.subject_id === subjectId) {
        ids.add(lesson.id);
      }
    });
    return ids;
  }, [lessons, subjectId]);

  const subjectNotes = useMemo(() => {
    if (subjectId === null) return [];
    return notes
      .filter((note) => note.subject_id === subjectId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [notes, subjectId]);

  const subjectHomework = useMemo(() => {
    if (subjectId === null) return [];
    return homework
      .filter((item) => lessonIds.has(item.lesson_id))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [homework, lessonIds, subjectId]);

  const subjectAssessments = useMemo(() => {
    if (subjectId === null) return [];
    return exams
      .filter((item) => item.subject_id === subjectId)
      .filter((item) => isControlWork(item.type) || isTestWork(item.type))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, subjectId]);

  const subjectFlashcards = useMemo(() => {
    if (subjectId === null) return [];
    return flashcards.filter((item) => item.subject_id === subjectId);
  }, [flashcards, subjectId]);

  const dueTodayBySubject = useMemo(() => {
    if (subjectId === null) return 0;
    return dueToday.filter((item) => item.subject_id === subjectId).length;
  }, [dueToday, subjectId]);

  const subjectTaskItems = useMemo<SubjectTaskItem[]>(() => {
    const homeworkItems: SubjectTaskItem[] = subjectHomework.map((item) => ({
      id: `hw-${item.id}`,
      kind: 'homework',
      date: item.due_date,
      title: item.title,
      subtitle: 'Домашнее задание',
      done: item.is_completed === 1,
      homeworkId: item.id,
    }));

    const assessmentItems: SubjectTaskItem[] = subjectAssessments.map((item) => ({
      id: `ex-${item.id}`,
      kind: isControlWork(item.type) ? 'control' : 'test',
      date: item.date,
      title: item.type,
      subtitle: item.room ? `Аудитория: ${item.room}` : 'Контрольная/проверочная',
      done: item.is_completed === 1,
      exam: item,
    }));

    return [...homeworkItems, ...assessmentItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [subjectHomework, subjectAssessments]);

  const pendingItems = useMemo(
    () => subjectTaskItems.filter((item) => !item.done),
    [subjectTaskItems]
  );

  const completedItems = useMemo(
    () => subjectTaskItems.filter((item) => item.done),
    [subjectTaskItems]
  );

  const homeworkDoneCount = useMemo(
    () => subjectHomework.filter((item) => item.is_completed === 1).length,
    [subjectHomework]
  );

  useFocusEffect(
    useCallback(() => {
      reloadNotes({ subjectId: subjectId ?? undefined });
      reloadHomework();
      reloadExams();
      reloadFlashcards();
    }, [reloadExams, reloadFlashcards, reloadHomework, reloadNotes, subjectId])
  );

  const toggleTaskDone = useCallback(
    (item: SubjectTaskItem) => {
      if (item.kind === 'homework' && item.homeworkId) {
        toggleHomeworkDone(item.homeworkId, !item.done);
        return;
      }
      if (item.exam) {
        setExamDone(item.exam.id, !item.done);
        reloadExams();
      }
    },
    [reloadExams, setExamDone, toggleHomeworkDone]
  );

  if (subjectId === null || !subject) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Предмет не найден</Text>
          <View style={styles.iconBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {subject.name}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/flashcard-review', params: { subjectId: String(subject.id) } })
          }
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="flash-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Краткая статистика</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{subjectNotes.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Заметок</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {subjectHomework.length ? Math.round((homeworkDoneCount / subjectHomework.length) * 100) : 0}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Прогресс ДЗ</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{dueTodayBySubject}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Карточки сегодня</Text>
            </View>
          </View>
          <Text style={[styles.statsFootnote, { color: colors.textMuted }]}>
            Всего карточек: {subjectFlashcards.length} • Работ: {subjectAssessments.length}
          </Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Невыполненные ДЗ/КР/ПР ({pendingItems.length})
          </Text>
          {pendingItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет невыполненных задач</Text>
          ) : (
            pendingItems.map((item) => (
              <View
                key={item.id}
                style={[styles.taskRow, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
              >
                <TouchableOpacity
                  style={styles.taskCheck}
                  onPress={() => toggleTaskDone(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, { borderColor: colors.accent }]} />
                </TouchableOpacity>
                <View style={styles.taskBody}>
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
                    {new Date(item.date).toLocaleDateString('ru-RU')} • {item.subtitle}
                  </Text>
                </View>
                {item.exam ? (
                  <AssessmentActions
                    exam={item.exam}
                    compact
                    expanded={gradingExamId === item.exam.id}
                    onToggleExpanded={() =>
                      setGradingExamId(gradingExamId === item.exam!.id ? null : item.exam!.id)
                    }
                    onToggleDone={(currentExam, done) => setExamDone(currentExam.id, done)}
                  />
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity
            style={styles.completedHeader}
            onPress={() => setExpandedCompleted((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Выполненные ({completedItems.length})
            </Text>
            <Ionicons
              name={expandedCompleted ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {expandedCompleted &&
            (completedItems.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Пока нет выполненных задач</Text>
            ) : (
              completedItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.taskRow, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
                >
                  <TouchableOpacity
                    style={styles.taskCheck}
                    onPress={() => toggleTaskDone(item)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, styles.checkboxChecked, { borderColor: colors.accent, backgroundColor: colors.accent }]}>
                      <Ionicons name="checkmark" size={13} color={colors.inverseText} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.taskBody}>
                    <Text style={[styles.taskTitle, styles.taskDone, { color: colors.textMuted }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
                      {new Date(item.date).toLocaleDateString('ru-RU')} • {item.subtitle}
                    </Text>
                  </View>
                </View>
              ))
            ))}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.notesHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Заметки ({subjectNotes.length})</Text>
            <TouchableOpacity
              style={[styles.addNoteBtn, { borderColor: colors.borderSubtle }]}
              onPress={() =>
                router.push({ pathname: '/note-editor', params: { subjectId: String(subject.id) } })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {subjectNotes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Пока нет заметок по предмету</Text>
          ) : (
            subjectNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                onPress={() => router.push({ pathname: '/note-editor', params: { noteId: String(note.id) } })}
                style={[styles.noteCard, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.noteTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {note.title || 'Без названия'}
                </Text>
                <Text style={[styles.noteDate, { color: colors.textMuted }]}>
                  Обновлено {new Date(note.updated_at).toLocaleDateString('ru-RU')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Typography.fonts.heading,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.fonts.heading,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    textAlign: 'center',
  },
  statsFootnote: {
    marginTop: 8,
    fontSize: 12,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
  },
  taskRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskCheck: {
    padding: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 1,
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskDone: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    marginTop: 3,
    fontSize: 12,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addNoteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteDate: {
    marginTop: 4,
    fontSize: 12,
  },
});
