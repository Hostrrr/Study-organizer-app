import LessonContainer from '@/components/LessonContainer';
import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { useTasks } from '@/hooks/use-tasks';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  const { date } = useLocalSearchParams<{ date: string }>();
  const [selectedDate] = useState(date || dayjs().format('YYYY-MM-DD'));

  const { lessons, loadByDay } = useLessons();
  const { homework, reload: reloadHomework } = useHomework();
  const { tasks } = useTasks();
  const { exams } = useExams();
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

  // Фильтруем данные на выбранную дату
  const dateTasks = useMemo(() => {
    return tasks.filter(task => task.date === selectedDate);
  }, [tasks, selectedDate]);

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
      tasks: dateTasks.length,
      homework: dateHomework.length,
      controlWorks: controlWorks.length,
      testWorks: testWorks.length,
    };
  }, [dayLessons, dateTasks, dateHomework, dateExams]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* День недели и дата */}
        <View style={styles.dateSection}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* Краткая сводка */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Сводка дня</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.lessons}</Text>
              <Text style={styles.summaryLabel}>Пар</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.homework}</Text>
              <Text style={styles.summaryLabel}>ДЗ</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.controlWorks}</Text>
              <Text style={styles.summaryLabel}>Контрольные</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.testWorks}</Text>
              <Text style={styles.summaryLabel}>Проверочные</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.tasks}</Text>
              <Text style={styles.summaryLabel}>Задач</Text>
            </View>
          </View>
        </View>

        {/* Расписание */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>Расписание</Text>
          {dayLessons.length > 0 ? (
            <LessonContainer 
              lessons={dayLessons} 
              homework={dateHomework}
              exams={dateExams}
              targetDate={selectedDate}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Нет уроков на этот день</Text>
            </View>
          )}
        </View>

        {/* Задачи на этот день */}
        {dateTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Задачи</Text>
            {dateTasks.map(task => (
              <View key={task.id} style={styles.taskItem}>
                <View style={[styles.taskIndicator, task.is_done ? styles.taskDone : styles.taskPending]} />
                <Text style={[styles.taskText, task.is_done ? styles.taskTextDone : null]}>
                  {task.title}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Домашние задания на этот день */}
        {dateHomework.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Домашние задания</Text>
            {dateHomework.map(hw => (
              <View key={hw.id} style={styles.homeworkItem}>
                <View style={[styles.homeworkIndicator, hw.is_completed ? styles.homeworkDone : styles.homeworkPending]} />
                <View style={styles.homeworkContent}>
                  <Text style={styles.homeworkTitle}>{hw.title}</Text>
                  {hw.description && (
                    <Text style={styles.homeworkDescription}>{hw.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Экзамены на этот день */}
        {dateExams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Экзамены и работы</Text>
            {dateExams.map(exam => {
              const isControl = isControlWork(exam.type);
              const isTest = isTestWork(exam.type);
              
              return (
                <View key={exam.id} style={styles.examItem}>
                  <View style={[
                    styles.examIndicator,
                    isControl && styles.controlWorkIndicator,
                    isTest && styles.testWorkIndicator,
                  ]} />
                  <View style={styles.examContent}>
                    <Text style={styles.examTitle}>{exam.type}</Text>
                    {exam.room && (
                      <Text style={styles.examSubtitle}>Аудитория: {exam.room}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dateSection: {
    marginBottom: 30,
  },
  dayName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'serif',
  },
  date: {
    fontSize: 24,
    color: '#C89153',
    fontFamily: 'serif',
  },
  summarySection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#C89153',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#999',
  },
  scheduleSection: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
  },
  taskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskDone: {
    backgroundColor: '#4CAF50',
  },
  taskPending: {
    backgroundColor: '#E25A2C',
  },
  taskText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  taskTextDone: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  homeworkItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  homeworkIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  homeworkDone: {
    backgroundColor: '#4CAF50',
  },
  homeworkPending: {
    backgroundColor: '#FFF76A',
  },
  homeworkContent: {
    flex: 1,
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  homeworkDescription: {
    fontSize: 14,
    color: '#999',
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
  controlWorkIndicator: {
    backgroundColor: '#E25A2C',
  },
  testWorkIndicator: {
    backgroundColor: '#FFF76A',
  },
  examContent: {
    flex: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  examSubtitle: {
    fontSize: 14,
    color: '#999',
  },
});

