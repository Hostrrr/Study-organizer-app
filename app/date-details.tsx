import AssessmentActions from '@/components/assessment-actions';
import LessonContainer from '@/components/LessonContainer';
import ScreenContainer from '@/components/ui/screen-container';
import { useAssessmentActions } from '@/hooks/use-assessment-actions';
import { useExams } from '@/hooks/use-exams';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WEEK_DAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export default function DateDetailsScreen() {
  const { colors } = useAppTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [selectedDate] = useState(date || dayjs().format('YYYY-MM-DD'));

  const { lessons, loadByDay } = useLessons();
  const { homework, reload: reloadHomework } = useHomework();
  const { exams } = useExams();
  const { setExamDone, setExamGrade, deleteExamEntry } = useAssessmentActions();
  const [gradingExamId, setGradingExamId] = useState<number | null>(null);
  const { settings } = useScheduleSettings();

  // Парсим дату
  const dateObj = dayjs(selectedDate);
  const dayOfWeek = dateObj.day(); // 0 = воскресенье, 1 = понедельник, и т.д.
  // Преобразуем: воскресенье (0) -> 6, остальные дни уменьшаем на 1
  const dayOfWeekForLessons = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Функция для вычисления номера недели для конкретной даты
  const getWeekNumberForDate = useCallback((date: string): number | null => {
    if (settings.scheduleFormat === 1) {
      return null; // Формат "одна неделя"
    }
    
    // Для формата "две недели" вычисляем четность недели от начала учебного года
    const dateObj = new Date(date);
    const currentYear = dateObj.getFullYear();
    const startOfYear = new Date(currentYear, 8, 1); // 1 сентября
    
    // Если выбранная дата раньше 1 сентября, используем прошлый год
    if (dateObj < startOfYear) {
      startOfYear.setFullYear(currentYear - 1);
    }
    
    const diffTime = dateObj.getTime() - startOfYear.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) % 2;
    
    return weekNumber;
  }, [settings.scheduleFormat]);

  // Вычисляем номер недели для выбранной даты
  const weekNumberForDate = useMemo(() => {
    return getWeekNumberForDate(selectedDate);
  }, [selectedDate, getWeekNumberForDate]);

  // Загружаем уроки для этого дня недели с учетом номера недели
  useEffect(() => {
    loadByDay(dayOfWeekForLessons, weekNumberForDate);
    reloadHomework();
  }, [selectedDate, dayOfWeekForLessons, weekNumberForDate, loadByDay, reloadHomework]);

  // Уроки уже отфильтрованы в loadByDay с учетом дня недели и номера недели
  const dayLessons = useMemo(() => {
    return lessons;
  }, [lessons]);

  const dateHomework = useMemo(() => {
    return homework.filter(hw => hw.due_date === selectedDate);
  }, [homework, selectedDate]);

  const dateExams = useMemo(() => {
    return exams.filter(exam => exam.date === selectedDate);
  }, [exams, selectedDate]);

  // Форматируем дату
  const dayName = WEEK_DAYS[dayOfWeek];
  const dayNum = dateObj.date();
  const monthName = MONTHS[dateObj.month()];
  const formattedDate = `${dayNum} ${monthName} ${dateObj.year()}`;

  // Статистика
  const stats = useMemo(() => {
    const controlWorks = dateExams.filter(exam => isControlWork(exam.type));
    const testWorks = dateExams.filter(exam => isTestWork(exam.type));

    return {
      lessons: dayLessons.length,
      homework: dateHomework.length,
      controlWorks: controlWorks.length,
      testWorks: testWorks.length,
    };
  }, [dayLessons, dateHomework, dateExams]);

  const summaryItems = [
    { icon: 'book-outline', label: 'пар', value: stats.lessons, color: colors.accent },
    { icon: 'document-text-outline', label: 'ДЗ', value: stats.homework, color: '#4A90E2' },
    { icon: 'warning-outline', label: 'контр.', value: stats.controlWorks, color: colors.danger },
    { icon: 'clipboard-outline', label: 'провер.', value: stats.testWorks, color: colors.warning },
  ].filter(item => item.value > 0);

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <Text style={[styles.heroDay, { color: colors.accent }]}>{dayName}</Text>
          <Text style={[styles.heroDate, { color: colors.textPrimary }]}>{dayNum} {monthName}</Text>
          <Text style={[styles.heroYear, { color: colors.textMuted }]}>{dateObj.year()}</Text>
        </View>

        {summaryItems.length === 0 ? (
          <Text style={[styles.freeDay, { color: colors.textMuted }]}>Свободный день</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {summaryItems.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={item.color} />
                <Text style={[styles.pillValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Расписание */}
        <View style={styles.scheduleSection}>
          <View style={styles.swissSectionHeader}>
            <View style={[styles.swissSectionLine, { backgroundColor: colors.accent }]} />
            <Text style={[styles.swissSectionTitle, { color: colors.textMuted }]}>Расписание</Text>
          </View>
          {dayLessons.length > 0 ? (
            <View style={styles.lessonContainerWrap}>
              <LessonContainer
                lessons={dayLessons}
                homework={dateHomework}
                exams={dateExams}
                targetDate={selectedDate}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет уроков на этот день</Text>
            </View>
          )}
        </View>

        {/* Домашние задания на этот день */}
        {dateHomework.length > 0 && (
          <View style={styles.section}>
            <View style={styles.swissSectionHeader}>
              <View style={[styles.swissSectionLine, { backgroundColor: colors.accent }]} />
              <Text style={[styles.swissSectionTitle, { color: colors.textMuted }]}>Домашние задания</Text>
            </View>
            {dateHomework.map(hw => (
              <View
                key={hw.id}
                style={[
                  styles.hwCard,
                  {
                    backgroundColor: hw.is_completed ? colors.surface : colors.bgPrimary,
                    borderLeftColor: hw.is_completed ? colors.success : colors.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.hwTitle,
                    { color: colors.textPrimary },
                    hw.is_completed ? { textDecorationLine: 'line-through', color: colors.textMuted } : null,
                  ]}
                >
                  {hw.title}
                </Text>
                {hw.description && <Text style={[styles.hwDesc, { color: colors.textMuted }]}>{hw.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Экзамены на этот день */}
        {dateExams.length > 0 && (
          <View style={styles.section}>
            <View style={styles.swissSectionHeader}>
              <View style={[styles.swissSectionLine, { backgroundColor: colors.accent }]} />
              <Text style={[styles.swissSectionTitle, { color: colors.textMuted }]}>Экзамены и работы</Text>
            </View>
            {dateExams.map(exam => {
              const isControl = isControlWork(exam.type);
              const isTest = isTestWork(exam.type);

              return (
                <View key={exam.id} style={styles.examItem}>
                  <View style={[
                    styles.examIndicator,
                    isControl && { backgroundColor: colors.danger },
                    isTest && { backgroundColor: colors.warning },
                  ]} />
                  <View style={styles.examContent}>
                    <Text style={[styles.examTitle, { color: colors.textPrimary }]}>{exam.type}</Text>
                    {exam.room && (
                      <Text style={[styles.examSubtitle, { color: colors.textMuted }]}>Аудитория: {exam.room}</Text>
                    )}
                    <View style={styles.examActions}>
                      <AssessmentActions
                        exam={exam}
                        compact
                        expanded={gradingExamId === exam.id}
                        onToggleExpanded={() => setGradingExamId(gradingExamId === exam.id ? null : exam.id)}
                        onToggleDone={(currentExam, done) => setExamDone(currentExam.id, done)}
                        onDelete={(currentExam) => deleteExamEntry(currentExam.id)}
                        onSetGrade={(currentExam, grade) =>
                          setExamGrade({ exam: currentExam, subjectId: currentExam.subject_id, grade })
                        }
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 0,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroDay: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroDate: {
    fontSize: 52,
    fontWeight: '800',
    fontFamily: 'Glanz',
    lineHeight: 56,
    marginBottom: 4,
  },
  heroYear: {
    fontSize: 20,
    fontWeight: '300',
  },
  pillsRow: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  pillValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  pillLabel: {
    fontSize: 13,
  },
  freeDay: {
    fontSize: 15,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  scheduleSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  swissSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  swissSectionLine: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  swissSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  lessonContainerWrap: {
    paddingHorizontal: 0,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  hwCard: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  hwTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  hwDesc: {
    fontSize: 13,
  },
  examItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  examIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  examContent: {
    flex: 1,
  },
  examActions: {
    marginTop: 10,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  examSubtitle: {
    fontSize: 14,
  },
});

