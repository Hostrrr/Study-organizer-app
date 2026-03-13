import { Exam, Homework, Lesson } from '@/types/db';
import { isControlWork } from '@/utils/exam-utils';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SummaryCardProps {
  date?: Date;
  lessons: Lesson[];
  homework?: Homework[];
  allHomework?: Homework[];
  exams?: Exam[];
}

const WEEK_DAYS = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
];

const MONTHS = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря"
];

// Функция для правильного склонения слов
function pluralize(count: number, forms: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)]];
}

export default function SummaryCard({ date: propDate, lessons, homework = [], allHomework = [], exams = [] }: SummaryCardProps) {
  
  // === 1. Дата ===
  const date = propDate || new Date();

  const dayName = WEEK_DAYS[date.getDay()];
  const dayNum  = date.getDate();
  const monthName = MONTHS[date.getMonth()];
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // === 2. Статистика по урокам ===
  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const homeworkCount = homework.length;
    
    // Подсчитываем выполненные домашние задания для этого дня
    const completedHomework = homework.filter(hw => hw.is_completed === 1).length;
    
    // Подсчитываем контрольные работы на эту дату
    const controlWorks = exams.filter(exam => {
      return exam.date === dateString && isControlWork(exam.type);
    }).length;
    
    // Подсчитываем долги: невыполненные домашние задания с просроченным дедлайном
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const debts = allHomework.filter(hw => {
      // Долг = невыполненное задание (is_completed === 0) с дедлайном раньше сегодня
      return hw.is_completed === 0 && hw.due_date < todayDateString;
    }).length;

    return { totalLessons, tests: controlWorks, homework: homeworkCount, completedHomework, debts };
  }, [lessons, homework, allHomework, exams, dateString]);

  // Формируем читабельный текст
  const formatSummary = () => {
    const parts: string[] = [];
    
    // Уроки
    if (stats.totalLessons > 0) {
      const lessonWord = pluralize(stats.totalLessons, ['пара', 'пары', 'пар']);
      parts.push(`Запланировано ${stats.totalLessons} ${lessonWord}`);
    } else {
      parts.push('Сегодня нет пар');
    }
    
    // Контрольные работы
    if (stats.tests > 0) {
      const testWord = pluralize(stats.tests, ['контрольная', 'контрольные', 'контрольных']);
      parts.push(`📝 Запланировано ${stats.tests} ${testWord}`);
    }
    
    // Домашние задания
    if (stats.homework > 0) {
      const hwWord = pluralize(stats.homework, ['домашнее задание', 'домашних задания', 'домашних заданий']);
      parts.push(`Задано ${stats.homework} ${hwWord}`);
      
      // Показываем информацию о выполненных заданиях
      const completedHwWord = pluralize(stats.completedHomework, ['задание', 'задания', 'заданий']);
      if (stats.completedHomework === stats.homework) {
        if (stats.completedHomework === 1) {
          parts.push(`✅ Все ${stats.completedHomework} ${completedHwWord} выполнено`);
        } else {
          parts.push(`✅ Все ${stats.completedHomework} ${completedHwWord} выполнены`);
        }
      } else if (stats.completedHomework > 0) {
        parts.push(`✅ Выполнено ${stats.completedHomework} из ${stats.homework} ${completedHwWord}`);
      }
    }
    
    // Долги
    if (stats.debts > 0) {
      const debtWord = pluralize(stats.debts, ['долг', 'долга', 'долгов']);
      parts.push(`⚠️ Просрочено ${stats.debts} ${debtWord}`);
    } else if (
      stats.totalLessons > 0 && 
      stats.debts === 0 && 
      (stats.homework === 0 || stats.completedHomework === stats.homework)
    ) {
      // Показываем "Всё сделано!" только если есть уроки, нет долгов и все задания выполнены (или их нет)
      parts.push('Всё сделано! 🎉');
    }
    
    return parts.join('\n');
  };

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {dayNum} {monthName}, {dayName}
        </Text>

        <Text style={styles.details}>
          {formatSummary()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: '#C89153',
    borderRadius: 0,
    overflow: 'hidden',
  },
  container: {
    padding: 20,
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'serif',
  },
  details: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 28,
  },
});