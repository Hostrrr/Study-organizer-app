import LessonCard from '@/components/LessonCard';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Exam, Homework, Lesson } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import React, { useEffect, useMemo, useRef } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, UIManager, View } from 'react-native';

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface LessonContainerProps {
  lessons: Lesson[];
  homework?: Homework[];
  exams?: Exam[];
}

interface LessonContainerProps {
  lessons: Lesson[];
  homework?: Homework[];
  exams?: Exam[];
  targetDate?: string; // Опциональная дата для фильтрации экзаменов
}

export default function LessonContainer({ lessons, homework = [], exams = [], targetDate }: LessonContainerProps) {
  const { colors } = useAppTheme();
  // Используем переданную дату или сегодняшнюю
  const filterDate = targetDate || new Date().toISOString().split('T')[0];
  const previousTargetDate = useRef(filterDate);
  const previousLessonsKey = useRef<string>('');

  // Создаём мапу домашних заданий по lesson_id для быстрого поиска
  const homeworkByLessonId = useMemo(() => {
    const map = new Map<number, boolean>();
    homework.forEach(hw => {
      map.set(hw.lesson_id, true);
    });
    return map;
  }, [homework]);

  // Создаём мапу экзаменов по subject_id для указанной даты
  const examsBySubjectId = useMemo(() => {
    const controlWorkMap = new Map<number, boolean>(); // Контрольные работы (midterm, final)
    const testWorkMap = new Map<number, boolean>(); // Проверочные работы (credit, lab, oral)
    
    exams.forEach(exam => {
      // Проверяем, что экзамен на указанную дату
      if (exam.date === filterDate) {
        if (isControlWork(exam.type)) {
          controlWorkMap.set(exam.subject_id, true);
        } else if (isTestWork(exam.type)) {
          testWorkMap.set(exam.subject_id, true);
        }
      }
    });
    
    return { controlWork: controlWorkMap, testWork: testWorkMap };
  }, [exams, filterDate]);

  // Создаём ключ для отслеживания изменений уроков
  const lessonsKey = useMemo(() => {
    return lessons.map(l => l.id).join(',');
  }, [lessons]);

  // Плавная анимация при изменении даты или уроков
  useEffect(() => {
    const shouldAnimate = 
      previousTargetDate.current !== filterDate || 
      previousLessonsKey.current !== lessonsKey;

    if (shouldAnimate) {
      // Настраиваем LayoutAnimation для плавного изменения высоты
      LayoutAnimation.configureNext({
        duration: 200,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
        },
      });
      
      previousTargetDate.current = filterDate;
      previousLessonsKey.current = lessonsKey;
    }
  }, [filterDate, lessonsKey]);

  return (
    <View style={[styles.lessonsContainer, { backgroundColor: colors.surface, shadowColor: colors.overlay }]}>
      {lessons.length > 0 ? (
        lessons.map((lesson, index) => (
          <LessonCard 
            key={lesson.id} 
            lesson={lesson}
            hasHW={homeworkByLessonId.has(lesson.id)}
            hasControlWork={examsBySubjectId.controlWork.has(lesson.subject_id)}
            hasTestWork={examsBySubjectId.testWork.has(lesson.subject_id)}
            isLast={index === lessons.length - 1}
            targetDate={filterDate}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Нет уроков на этот день</Text>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  lessonsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});