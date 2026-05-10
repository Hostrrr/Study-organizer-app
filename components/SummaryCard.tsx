import { Exam, Homework, Lesson } from '@/types/db';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
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

function pluralize(count: number, forms: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[(count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)]];
}

type SummaryRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
};

export default function SummaryCard({ date: propDate, lessons, homework = [], allHomework = [], exams = [] }: SummaryCardProps) {
  const { colors } = useAppTheme();
  
  const date = propDate || new Date();

  const dayName = WEEK_DAYS[date.getDay()];
  const dayNum  = date.getDate();
  const monthName = MONTHS[date.getMonth()];
  const dateString = date.toISOString().split('T')[0];

  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const homeworkCount = homework.length;
    const completedHomework = homework.filter(hw => hw.is_completed === 1).length;
    const controlWorks = exams.filter(exam => exam.date === dateString && isControlWork(exam.type)).length;
    const testWorks = exams.filter(exam => exam.date === dateString && isTestWork(exam.type)).length;
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const debts = allHomework.filter(hw => hw.is_completed === 0 && hw.due_date < todayDateString).length;

    return { totalLessons, controlWorks, testWorks, homework: homeworkCount, completedHomework, debts };
  }, [lessons, homework, allHomework, exams, dateString]);

  const summaryRows = useMemo((): SummaryRow[] => {
    const rows: SummaryRow[] = [];

    if (stats.totalLessons > 0) {
      const lessonWord = pluralize(stats.totalLessons, ['пара', 'пары', 'пар']);
      rows.push({ icon: 'book-outline', text: `Запланировано ${stats.totalLessons} ${lessonWord}` });
    } else {
      rows.push({ icon: 'book-outline', text: 'Сегодня нет пар' });
    }

    if (stats.controlWorks > 0) {
      const w = pluralize(stats.controlWorks, ['контрольная', 'контрольные', 'контрольных']);
      rows.push({ icon: 'warning-outline', text: `Запланировано ${stats.controlWorks} ${w}` });
    }

    if (stats.testWorks > 0) {
      const w = pluralize(stats.testWorks, ['проверочная', 'проверочные', 'проверочных']);
      rows.push({ icon: 'checkmark-circle-outline', text: `Запланировано ${stats.testWorks} ${w}` });
    }

    if (stats.homework > 0) {
      const hwWord = pluralize(stats.homework, ['домашнее задание', 'домашних задания', 'домашних заданий']);
      rows.push({ icon: 'document-text-outline', text: `Задано ${stats.homework} ${hwWord}` });

      const completedHwWord = pluralize(stats.completedHomework, ['задание', 'задания', 'заданий']);
      if (stats.completedHomework === stats.homework) {
        rows.push({
          icon: 'checkmark-circle-outline',
          text:
            stats.completedHomework === 1
              ? `Все ${stats.completedHomework} ${completedHwWord} выполнено`
              : `Все ${stats.completedHomework} ${completedHwWord} выполнены`,
        });
      } else if (stats.completedHomework > 0) {
        rows.push({
          icon: 'checkmark-circle-outline',
          text: `Выполнено ${stats.completedHomework} из ${stats.homework} ${completedHwWord}`,
        });
      }
    }

    if (stats.debts > 0) {
      const debtWord = pluralize(stats.debts, ['долг', 'долга', 'долгов']);
      rows.push({ icon: 'warning-outline', text: `Просрочено ${stats.debts} ${debtWord}` });
    } else if (
      stats.totalLessons > 0 &&
      stats.debts === 0 &&
      (stats.homework === 0 || stats.completedHomework === stats.homework)
    ) {
      rows.push({ icon: 'list-outline', text: 'Всё сделано!' });
    }

    return rows;
  }, [stats]);

  return (
    <View style={[styles.summaryContainer, { backgroundColor: colors.accentSoft }]}>
      <View style={styles.container}>
        <Text style={[styles.subtitle, { color: colors.textPrimary, fontFamily: Typography.fonts.body }]}>
          {dayNum} {monthName}, {dayName}
        </Text>

        <View style={styles.rows}>
          {summaryRows.map((row, i) => (
            <View key={`${row.text}-${i}`} style={styles.summaryRow}>
              <Ionicons name={row.icon} size={22} color={colors.textSecondary} style={styles.rowIcon} />
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>{row.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  container: {
    padding: 20,
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 12,
    fontFamily: 'serif',
  },
  rows: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  rowText: {
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
  },
});
