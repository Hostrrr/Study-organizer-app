import { Lesson } from '@/types/db';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LessonCardProps {
  lesson: Lesson;
  hasHW?: boolean;
  hasControlWork?: boolean; // Контрольная работа
  hasTestWork?: boolean; // Проверочная работа
  isLast?: boolean; // Последняя карточка в списке
  targetDate?: string; // Дата урока для фильтрации контрольных
}

export default function LessonCard({ lesson, hasHW, hasControlWork, hasTestWork, isLast, targetDate }: LessonCardProps) {
  const subjectName = lesson.subject_name || `Предмет #${lesson.subject_id}`;
  const roomText = lesson.room ? ` · ${lesson.room}` : '';

  // Форматируем время урока
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // Если время в формате "HH:MM:SS", берем только "HH:MM"
    return timeString.substring(0, 5);
  };

  const startTime = formatTime(lesson.start_time || '');
  const endTime = formatTime(lesson.end_time || '');
  const timeText = startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime || '';

  const handlePress = () => {
    if (targetDate) {
      router.push({
        pathname: '/lesson-details',
        params: { lessonId: lesson.id.toString(), date: targetDate },
      } as any);
    } else {
      router.push({
        pathname: '/lesson-details',
        params: { lessonId: lesson.id.toString() },
      } as any);
    }
  };

  return (
    <TouchableOpacity style={[styles.card, isLast && styles.cardLast]} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.info}>
        <Text style={styles.subject}>{subjectName}</Text>
          <Text style={styles.subtext}>
          {timeText ? `${timeText} · ` : ''}{lesson.type}{roomText}
          </Text>
        </View>

      {/* Кружки-индикаторы */}
      <View style={styles.indicators}>
        {hasHW && (
          <View style={[styles.indicator, styles.homeworkIndicator]} />
        )}
        {hasControlWork && (
          <View style={[styles.indicator, styles.controlWorkIndicator]} />
        )}
        {hasTestWork && (
          <View style={[styles.indicator, styles.testWorkIndicator]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 0,
    padding: 16,
    marginVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  cardLast: {
    borderBottomWidth: 0,
  },
  info: {
    flex: 1,
  },
  subject: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'serif',
  },
  subtext: {
    color: '#999',
    marginTop: 2,
    fontSize: 14,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  homeworkIndicator: {
    backgroundColor: '#4CAF50', // Зеленый для домашней работы
  },
  controlWorkIndicator: {
    backgroundColor: '#E25A2C', // Красный для контрольной работы
  },
  testWorkIndicator: {
    backgroundColor: '#FFF76A', // Желтый для проверочной работы
  },
});