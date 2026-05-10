import { ensureRuCalendarLocale, getCalendarTheme } from '@/constants/calendar-theme';
import { Typography } from '@/constants/theme';
import { useExams } from '@/hooks/use-exams';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { Lesson } from '@/types/db';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

type ItemType = 'homework' | 'exam';

export default function AddHomeworkScreen() {
  const { isDark } = useAppTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const calendarTheme = useMemo(() => getCalendarTheme(isDark), [isDark]);

  useEffect(() => {
    ensureRuCalendarLocale();
  }, []);

  const { lessons, loadByDay } = useLessons();
  const { create: createHomework } = useHomework();
  const { create: createExam } = useExams();
  const { settings } = useScheduleSettings();

  const [itemType, setItemType] = useState<ItemType>('homework');
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  
  // Поля для домашнего задания
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Поля для контрольной/проверочной
  const [examType, setExamType] = useState<'контрольная' | 'проверочная'>('контрольная');
  const [examDate, setExamDate] = useState(date || new Date().toISOString().split('T')[0]);
  const [examRoom, setExamRoom] = useState('');

  // Вычисляем номер текущей недели
  const getCurrentWeekNumber = useCallback((): number | null => {
    if (settings.scheduleFormat === 1) {
      return null;
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 8, 1); // 1 сентября
    
    if (now < startOfYear) {
      startOfYear.setFullYear(currentYear - 1);
    }
    
    const diffTime = now.getTime() - startOfYear.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) % 2;
    
    return weekNumber;
  }, [settings.scheduleFormat]);

  const currentWeekNumber = useMemo(() => getCurrentWeekNumber(), [getCurrentWeekNumber]);

  // Парсим выбранную дату для отображения уроков
  const dateObj = selectedDate ? new Date(selectedDate) : new Date();
  const dayOfWeek = dateObj.getDay();
  const dayOfWeekForLessons = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Загружаем уроки для выбранного дня
  useEffect(() => {
    loadByDay(dayOfWeekForLessons, currentWeekNumber);
  }, [dayOfWeekForLessons, currentWeekNumber, loadByDay, selectedDate]);

  // Фильтруем уроки для этого дня
  const dayLessons = useMemo(() => {
    return lessons.filter(lesson => {
      if (lesson.day_of_week !== dayOfWeekForLessons) return false;
      
      if (settings.scheduleFormat === 1) {
        return lesson.week_number === null || lesson.week_number === undefined;
      }
      
      if (settings.scheduleFormat === 2) {
        return lesson.week_number === null || lesson.week_number === undefined || lesson.week_number === currentWeekNumber;
      }
      
      return true;
    }).sort((a, b) => {
      // Сортируем по времени начала
      const timeA = a.start_time.split(':').map(Number);
      const timeB = b.start_time.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
  }, [lessons, dayOfWeekForLessons, settings.scheduleFormat, currentWeekNumber]);


  const handleSave = () => {
    if (!selectedLesson) {
      Alert.alert('Ошибка', 'Выберите урок');
      return;
    }
    
    if (itemType === 'homework') {
      if (!title.trim()) {
        Alert.alert('Ошибка', 'Заполните название домашнего задания');
        return;
      }
      
      if (!selectedDate.trim()) {
        Alert.alert('Ошибка', 'Укажите дату');
        return;
      }

      // Используем selectedDate как срок выполнения для ДЗ
      createHomework(selectedLesson.id, title.trim(), description.trim(), selectedDate);
    } else {
      // Экзамен
      if (!examDate.trim()) {
        Alert.alert('Ошибка', 'Укажите дату контрольной/проверочной');
        return;
      }

      createExam(selectedLesson.subject_id, examDate, examType, examRoom.trim() || undefined);
    }
    
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {itemType === 'homework' ? 'Добавить ДЗ' : 'Добавить работу'}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Сохранить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Выбор типа */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тип</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, itemType === 'homework' && styles.typeButtonActive]}
              onPress={() => setItemType('homework')}
            >
              <Text style={[styles.typeButtonText, itemType === 'homework' && styles.typeButtonTextActive]}>
                Домашнее задание
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, itemType === 'exam' && styles.typeButtonActive]}
              onPress={() => setItemType('exam')}
            >
              <Text style={[styles.typeButtonText, itemType === 'exam' && styles.typeButtonTextActive]}>
                Контрольная/Проверочная
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Выбор даты для отображения уроков */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Дата урока</Text>
          <Text style={styles.label}>Выберите дату для отображения уроков</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate 
                ? (() => {
                    const dateObj = new Date(selectedDate);
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('ru-RU', { month: 'long' });
                    const year = dateObj.getFullYear();
                    return `${day} ${month} ${year}`;
                  })()
                : 'Выберите дату'}
            </Text>
            <Text style={styles.dateButtonIcon}>📅</Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <View style={styles.calendarContainer}>
              <Calendar
                current={selectedDate || new Date().toISOString().split('T')[0]}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setSelectedLesson(null); // Сбрасываем выбор урока при смене даты
                  setShowDatePicker(false);
                }}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    selectedColor: '#C89153',
                  },
                }}
                firstDay={1}
                theme={calendarTheme}
              />
            </View>
          )}
        </View>

        {/* Выбор урока */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите урок</Text>
          {dayLessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                На этот день нет уроков
              </Text>
            </View>
          ) : (
            dayLessons.map((lesson) => (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  selectedLesson?.id === lesson.id && styles.lessonCardSelected,
                ]}
                onPress={() => setSelectedLesson(lesson)}
              >
                <View style={styles.lessonCardContent}>
                  <Text style={styles.lessonSubject}>
                    {lesson.subject_name || `Предмет #${lesson.subject_id}`}
                  </Text>
                  <Text style={styles.lessonType}>{lesson.type}</Text>
                  <Text style={styles.lessonTime}>
                    {lesson.start_time} - {lesson.end_time}
                  </Text>
                  {lesson.room && (
                    <Text style={styles.lessonRoom}>Аудитория: {lesson.room}</Text>
                  )}
                </View>
                {selectedLesson?.id === lesson.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Форма домашнего задания */}
        {selectedLesson && itemType === 'homework' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Домашнее задание</Text>
            
            <Text style={styles.label}>Название *</Text>
            <TextInput
              style={styles.input}
              placeholder="Название домашнего задания"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Описание (необязательно)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Описание"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {/* Форма контрольной/проверочной */}
        {selectedLesson && itemType === 'exam' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контрольная/Проверочная</Text>
            
            <Text style={styles.label}>Тип *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.examTypeButton, examType === 'контрольная' && styles.examTypeButtonActive]}
                onPress={() => setExamType('контрольная')}
              >
                <Text style={[styles.examTypeButtonText, examType === 'контрольная' && styles.examTypeButtonTextActive]}>
                  Контрольная
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.examTypeButton, examType === 'проверочная' && styles.examTypeButtonActive]}
                onPress={() => setExamType('проверочная')}
              >
                <Text style={[styles.examTypeButtonText, examType === 'проверочная' && styles.examTypeButtonTextActive]}>
                  Проверочная
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Дата *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowExamDatePicker(!showExamDatePicker)}
            >
              <Text style={styles.dateButtonText}>
                {examDate 
                  ? (() => {
                      const dateObj = new Date(examDate);
                      const day = dateObj.getDate();
                      const month = dateObj.toLocaleDateString('ru-RU', { month: 'long' });
                      const year = dateObj.getFullYear();
                      return `${day} ${month} ${year}`;
                    })()
                  : 'Выберите дату'}
              </Text>
              <Text style={styles.dateButtonIcon}>📅</Text>
            </TouchableOpacity>
            
            {showExamDatePicker && (
              <View style={styles.calendarContainer}>
                <Calendar
                  current={examDate || new Date().toISOString().split('T')[0]}
                  onDayPress={(day) => {
                    setExamDate(day.dateString);
                    setShowExamDatePicker(false);
                  }}
                  markedDates={{
                    [examDate]: {
                      selected: true,
                      selectedColor: '#C89153',
                    },
                  }}
                  firstDay={1}
                  minDate={new Date().toISOString().split('T')[0]}
                  theme={{
                    calendarBackground: '#1a1a1a',
                    textSectionTitleColor: '#fff',
                    selectedDayBackgroundColor: '#C89153',
                    selectedDayTextColor: '#000',
                    todayTextColor: '#C89153',
                    dayTextColor: '#fff',
                    textDisabledColor: '#666',
                    dotColor: '#C89153',
                    selectedDotColor: '#000',
                    arrowColor: '#C89153',
                    monthTextColor: '#fff',
                    textDayFontFamily: 'serif',
                    textMonthFontFamily: 'serif',
                    textDayHeaderFontFamily: 'serif',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </View>
            )}

            <Text style={styles.label}>Аудитория (необязательно)</Text>
            <TextInput
              style={styles.input}
              placeholder="Номер аудитории"
              placeholderTextColor="#999"
              value={examRoom}
              onChangeText={setExamRoom}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  cancelText: {
    fontSize: 16,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Typography.fonts.heading,
  },
  saveText: {
    fontSize: 16,
    color: '#C89153',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateSection: {
    marginBottom: 30,
    paddingVertical: 15,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'serif',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
  lessonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lessonCardSelected: {
    borderColor: '#C89153',
    backgroundColor: '#2a2a2a',
  },
  lessonCardContent: {
    flex: 1,
  },
  lessonSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  lessonType: {
    fontSize: 14,
    color: '#C89153',
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  lessonRoom: {
    fontSize: 14,
    color: '#999',
  },
  checkmark: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C89153',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#C89153',
    backgroundColor: '#2a2a2a',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#C89153',
    fontWeight: '600',
  },
  examTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  examTypeButtonActive: {
    borderColor: '#C89153',
    backgroundColor: '#2a2a2a',
  },
  examTypeButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  examTypeButtonTextActive: {
    color: '#C89153',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  dateButtonIcon: {
    fontSize: 20,
  },
  calendarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
});

