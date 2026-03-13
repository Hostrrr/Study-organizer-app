import { DARK_CALENDAR_THEME } from '@/constants/calendar-theme';
import { deleteAllLessons } from '@/database/queries';
import { useFirstLaunch } from '@/hooks/use-first-launch';
import { useLessons } from '@/hooks/use-lessons';
import { HolidayPeriod, useScheduleSettings } from '@/hooks/use-schedule-settings';
import { useSubjects } from '@/hooks/use-subjects';
import { useTeachers } from '@/hooks/use-teachers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const LESSON_TYPES = [
  { value: 'Лекция', label: 'Лекция' },
  { value: 'Практика', label: 'Практика' },
];

interface LessonForm {
  subjectId: number | null;
  teacherId: number | null;
  type: string;
  timeSlot: number;
  room: string;
  weekNumber: number | null; // null для формата "одна неделя" или для уроков, которые есть на обеих неделях
}

type StartupStep = 'settings' | 'schedule';

export default function StartupScreen() {
  const { subjects, create: createSubject } = useSubjects();
  const { teachers, create: createTeacher } = useTeachers();
  const { create: createLesson, reload: reloadLessons } = useLessons();
  const { isFirstLaunch, completeFirstLaunch } = useFirstLaunch();
  const { generateTimeSlots, settings, updateSettings, addHoliday, removeHoliday } = useScheduleSettings();
  const insets = useSafeAreaInsets();
  
  // Если это не первый запуск, значит мы в режиме редактирования (модальный экран)
  const isModal = !isFirstLaunch;

  const [currentStep, setCurrentStep] = useState<StartupStep>('settings');
  
  // Анимация для header при прокрутке
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [20, 8],
    extrapolate: 'clamp',
  });
  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [30, 16],
    extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const titleHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [32, 0],
    extrapolate: 'clamp',
  });
  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [24, 2],
    extrapolate: 'clamp',
  });
  const subtitleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [16, 14],
    extrapolate: 'clamp',
  });
  
  // Анимация для второго шага (меньше padding, так как нет подзаголовка)
  const headerPaddingTopStep2 = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [20, 12],
    extrapolate: 'clamp',
  });
  const headerPaddingBottomStep2 = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [20, 12],
    extrapolate: 'clamp',
  });
  const titleFontSizeStep2 = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [24, 20],
    extrapolate: 'clamp',
  });
  
  // Настройки времени (локальное состояние для первого шага)
  const [firstLessonStartTime, setFirstLessonStartTime] = useState(settings.firstLessonStartTime);
  const [lessonDuration, setLessonDuration] = useState(settings.lessonDuration.toString());
  const [breakDuration, setBreakDuration] = useState(settings.breakDuration.toString());
  const [longBreakAfterLesson, setLongBreakAfterLesson] = useState<number | null>(settings.longBreakAfterLesson);
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreakDuration.toString());
  const [scheduleFormat, setScheduleFormat] = useState<1 | 2>(settings.scheduleFormat);
  const [academicYearStart, setAcademicYearStart] = useState(settings.academicYearStart);
  const [academicYearEnd, setAcademicYearEnd] = useState(settings.academicYearEnd);

  // Состояния для управления каникулами
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayStartDate, setHolidayStartDate] = useState<string>('');
  const [holidayEndDate, setHolidayEndDate] = useState<string>('');
  const [holidayName, setHolidayName] = useState<string>('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showAcademicStartPicker, setShowAcademicStartPicker] = useState(false);
  const [showAcademicEndPicker, setShowAcademicEndPicker] = useState(false);

  // Генерируем временные слоты на основе настроек (до 21:00)
  const TIME_SLOTS = useMemo(() => generateTimeSlots(), [
    settings.firstLessonStartTime,
    settings.lessonDuration,
    settings.breakDuration,
    settings.longBreakAfterLesson,
    settings.longBreakDuration,
  ]);

  const [currentDay, setCurrentDay] = useState<number>(0);
  const [lessonsByDay, setLessonsByDay] = useState<Record<number, LessonForm[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });

  // Для создания новых предметов и преподавателей
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
  const [showNewTeacherInput, setShowNewTeacherInput] = useState(false);

  // Для выпадающих списков в карточках уроков
  const [showSubjectPicker, setShowSubjectPicker] = useState<number | null>(null); // индекс урока
  const [showTeacherPicker, setShowTeacherPicker] = useState<number | null>(null); // индекс урока

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      createSubject(newSubjectName.trim());
      setNewSubjectName('');
      setShowNewSubjectInput(false);
    }
  };

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      createTeacher(newTeacherName.trim());
      setNewTeacherName('');
      setShowNewTeacherInput(false);
    }
  };

  // Форматирование даты для отображения
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Обработка добавления каникул
  const handleAddHoliday = async () => {
    if (!holidayStartDate || !holidayEndDate) {
      Alert.alert('Ошибка', 'Выберите дату начала и окончания каникул');
      return;
    }

    const startDate = new Date(holidayStartDate);
    const endDate = new Date(holidayEndDate);

    if (startDate > endDate) {
      Alert.alert('Ошибка', 'Дата начала не может быть позже даты окончания');
      return;
    }

    const newHoliday: HolidayPeriod = {
      id: Date.now().toString(),
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      name: holidayName.trim() || undefined,
    };

    const success = await addHoliday(newHoliday);
    if (success) {
      setHolidayStartDate('');
      setHolidayEndDate('');
      setHolidayName('');
      setShowAddHoliday(false);
    } else {
      Alert.alert('Ошибка', 'Не удалось добавить каникулы');
    }
  };

  // Обработка удаления каникул
  const handleRemoveHoliday = (holidayId: string) => {
    Alert.alert(
      'Удалить каникулы',
      'Вы уверены, что хотите удалить этот период каникул?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const success = await removeHoliday(holidayId);
            if (!success) {
              Alert.alert('Ошибка', 'Не удалось удалить каникулы');
            }
          },
        },
      ]
    );
  };

  const addLessonToDay = () => {
    const newLesson: LessonForm = {
      subjectId: null,
      teacherId: null,
      type: 'Лекция',
      timeSlot: 0,
      room: '',
      weekNumber: settings.scheduleFormat === 1 ? null : 0, // По умолчанию неделя A для формата "две недели"
    };
    setLessonsByDay(prev => ({
      ...prev,
      [currentDay]: [...prev[currentDay], newLesson],
    }));
  };

  const updateLesson = (index: number, field: keyof LessonForm, value: any) => {
    setLessonsByDay(prev => {
      const dayLessons = [...prev[currentDay]];
      dayLessons[index] = { ...dayLessons[index], [field]: value };
      return { ...prev, [currentDay]: dayLessons };
    });
  };

  const removeLesson = (index: number) => {
    setLessonsByDay(prev => {
      const dayLessons = [...prev[currentDay]];
      dayLessons.splice(index, 1);
      return { ...prev, [currentDay]: dayLessons };
    });
  };

  const handleSettingsComplete = async () => {
    // Валидация времени
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(firstLessonStartTime)) {
      Alert.alert('Ошибка', 'Введите время в формате HH:mm (например, 09:00)');
      return;
    }

    // Валидация длительности урока
    const lessonDur = parseInt(lessonDuration, 10);
    if (isNaN(lessonDur) || lessonDur <= 0 || lessonDur > 180) {
      Alert.alert('Ошибка', 'Длительность урока должна быть от 1 до 180 минут');
      return;
    }

    // Валидация длительности перемены
    const breakDur = parseInt(breakDuration, 10);
    if (isNaN(breakDur) || breakDur < 0 || breakDur > 60) {
      Alert.alert('Ошибка', 'Длительность перемены должна быть от 0 до 60 минут');
      return;
    }

    // Валидация удлинённой перемены
    let longBreakDur = 0;
    if (longBreakAfterLesson !== null) {
      longBreakDur = parseInt(longBreakDuration, 10);
      if (isNaN(longBreakDur) || longBreakDur < 0 || longBreakDur > 60) {
        Alert.alert('Ошибка', 'Длительность удлинённой перемены должна быть от 0 до 60 минут');
        return;
      }
    }

    // Валидация периода обучения
    if (!academicYearStart || !academicYearEnd) {
      Alert.alert('Ошибка', 'Выберите даты начала и окончания учебного периода');
      return;
    }

    const startDate = new Date(academicYearStart);
    const endDate = new Date(academicYearEnd);

    if (startDate >= endDate) {
      Alert.alert('Ошибка', 'Дата начала должна быть раньше даты окончания');
      return;
    }

    // Сохраняем настройки
    await updateSettings({
      firstLessonStartTime,
      lessonDuration: lessonDur,
      breakDuration: breakDur,
      longBreakAfterLesson,
      longBreakDuration: longBreakDur,
      scheduleFormat,
      academicYearStart,
      academicYearEnd,
    });

    // Переходим к следующему шагу
    setCurrentStep('schedule');
  };

  const handleScheduleComplete = () => {
    // Проверяем, что есть хотя бы один предмет и один преподаватель
    if (subjects.length === 0) {
      Alert.alert('Внимание', 'Добавьте хотя бы один предмет');
      return;
    }

    if (teachers.length === 0) {
      Alert.alert('Внимание', 'Добавьте хотя бы одного преподавателя');
      return;
    }

    // Если это модальный экран (режим редактирования), удаляем все существующие уроки
    if (isModal) {
      deleteAllLessons();
      reloadLessons();
    }

    // Сохраняем все уроки
    let hasLessons = false;
    for (let day = 0; day < 7; day++) {
      const dayLessons = lessonsByDay[day];
      for (const lesson of dayLessons) {
        if (lesson.subjectId && lesson.teacherId) {
          const timeSlot = TIME_SLOTS[lesson.timeSlot];
          createLesson(
            lesson.subjectId,
            lesson.teacherId,
            lesson.type,
            day,
            timeSlot.start,
            timeSlot.end,
            lesson.room || undefined,
            lesson.weekNumber
          );
          hasLessons = true;
        }
      }
    }

    if (!hasLessons) {
      Alert.alert(
        'Внимание',
        'Вы не добавили ни одного урока. Вы можете добавить их позже в разделе "Расписание".',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Продолжить',
            onPress: async () => {
              if (!isModal) {
                await completeFirstLaunch();
                router.replace('/(tabs)/schedule');
              } else {
                router.back();
              }
            },
          },
        ]
      );
      return;
    }

    if (isModal) {
      // Если это модальный экран, просто закрываем его
      Alert.alert('Успешно', 'Расписание обновлено', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      // Если это первый запуск, завершаем его
      completeFirstLaunch();
      router.replace('/(tabs)/schedule');
    }
  };

  const currentDayLessons = lessonsByDay[currentDay];

  // Функция для генерации временных слотов на основе локальных значений
  const generateLocalTimeSlots = useMemo(() => {
    const slots = [];
    const maxTime = 21 * 60; // 21:00 в минутах
    
    // Парсим время начала первого урока
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(firstLessonStartTime)) {
      return [];
    }
    
    const [hours, minutes] = firstLessonStartTime.split(':').map(Number);
    const lessonDur = parseInt(lessonDuration, 10) || 90;
    const breakDur = parseInt(breakDuration, 10) || 10;
    const longBreakDur = parseInt(longBreakDuration, 10) || 20;
    
    let i = 1;
    let totalMinutes = hours * 60 + minutes;
    
    while (true) {
      const startTime = totalMinutes;
      const endTime = startTime + lessonDur;
      
      // Если время окончания урока превышает 21:00, прекращаем генерацию
      if (endTime > maxTime) {
        break;
      }
      
      const startHours = Math.floor(startTime / 60);
      const startMins = startTime % 60;
      const endHours = Math.floor(endTime / 60);
      const endMins = endTime % 60;
      
      slots.push({
        start: `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`,
        end: `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`,
        number: i,
      });
      
      // Добавляем перемену
      if (longBreakAfterLesson === i) {
        totalMinutes = endTime + longBreakDur;
      } else {
        totalMinutes = endTime + breakDur;
      }
      
      i++;
      
      // Защита от бесконечного цикла (максимум 20 уроков)
      if (i > 20) {
        break;
      }
    }
    
    return slots;
  }, [firstLessonStartTime, lessonDuration, breakDuration, longBreakAfterLesson, longBreakDuration]);

  // Шаг 1: Настройки времени
  if (currentStep === 'settings') {
    const timeSlots = generateLocalTimeSlots;
    
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.safeAreaHeader} edges={['top']}>
          {isModal && (
            <View style={styles.closeButtonContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <Animated.View style={[styles.header, { paddingTop: isModal ? 12 : headerPaddingTop, paddingBottom: headerPaddingBottom }]}>
            <View style={styles.closeButtonPlaceholder} />
            <View style={styles.headerTitleContainer}>
              <Animated.View style={{ height: titleHeight, overflow: 'hidden' }}>
                <Animated.Text style={[styles.title, { fontSize: titleFontSize, opacity: titleOpacity }]}>
                  {isModal ? 'Настройки времени расписания' : 'Добро пожаловать!'}
                </Animated.Text>
              </Animated.View>
              <Animated.Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>
                Настройте время уроков и перемен
              </Animated.Text>
            </View>
            <View style={styles.closeButtonPlaceholder} />
          </Animated.View>
        </SafeAreaView>

        <Animated.ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Время начала первого урока */}
          <View style={styles.section}>
            <Text style={styles.label}>Время начала первого урока</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00"
              placeholderTextColor="#666"
              value={firstLessonStartTime}
              onChangeText={setFirstLessonStartTime}
              keyboardType="default"
            />
            <Text style={styles.hint}>Формат: HH:mm (например, 09:00)</Text>
          </View>

          {/* Длительность урока */}
          <View style={styles.section}>
            <Text style={styles.label}>Длительность урока (минуты)</Text>
            <TextInput
              style={styles.input}
              placeholder="90"
              placeholderTextColor="#666"
              value={lessonDuration}
              onChangeText={setLessonDuration}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Рекомендуется: 90 минут (1.5 часа)</Text>
          </View>

          {/* Длительность перемены */}
          <View style={styles.section}>
            <Text style={styles.label}>Длительность перемены (минуты)</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#666"
              value={breakDuration}
              onChangeText={setBreakDuration}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Рекомендуется: 10 минут</Text>
          </View>

          {/* Удлинённая перемена */}
          <View style={styles.section}>
            <Text style={styles.label}>Удлинённая перемена</Text>
            <View style={styles.longBreakContainer}>
              <TouchableOpacity
                onPress={() => setLongBreakAfterLesson(null)}
                style={[
                  styles.longBreakOption,
                  longBreakAfterLesson === null && styles.longBreakOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.longBreakOptionText,
                    longBreakAfterLesson === null && styles.longBreakOptionTextSelected,
                  ]}>
                  Нет
                </Text>
              </TouchableOpacity>
              {[2, 3, 4, 5].map((lessonNum) => (
                <TouchableOpacity
                  key={lessonNum}
                  onPress={() => setLongBreakAfterLesson(lessonNum)}
                  style={[
                    styles.longBreakOption,
                    longBreakAfterLesson === lessonNum && styles.longBreakOptionSelected,
                  ]}>
                  <Text
                    style={[
                      styles.longBreakOptionText,
                      longBreakAfterLesson === lessonNum && styles.longBreakOptionTextSelected,
                    ]}>
                    После {lessonNum} урока
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {longBreakAfterLesson !== null && (
              <View style={styles.longBreakDurationContainer}>
                <Text style={styles.label}>Длительность удлинённой перемены (минуты)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  placeholderTextColor="#666"
                  value={longBreakDuration}
                  onChangeText={setLongBreakDuration}
                  keyboardType="numeric"
                />
                <Text style={styles.hint}>Рекомендуется: 20 минут</Text>
              </View>
            )}
          </View>

          {/* Формат расписания */}
          <View style={styles.section}>
            <Text style={styles.label}>Формат расписания</Text>
            <View style={styles.formatContainer}>
              <TouchableOpacity
                onPress={() => setScheduleFormat(1)}
                style={[
                  styles.formatOption,
                  scheduleFormat === 1 && styles.formatOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.formatOptionText,
                    scheduleFormat === 1 && styles.formatOptionTextSelected,
                  ]}>
                  Одна неделя
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScheduleFormat(2)}
                style={[
                  styles.formatOption,
                  scheduleFormat === 2 && styles.formatOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.formatOptionText,
                    scheduleFormat === 2 && styles.formatOptionTextSelected,
                  ]}>
                  Две недели
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {scheduleFormat === 1
                ? 'Расписание повторяется каждую неделю'
                : 'Расписание чередуется: неделя A и неделя B'}
            </Text>
          </View>

          {/* Каникулы */}
          <View style={styles.section}>
            <View style={styles.holidaysHeader}>
              <Text style={styles.label}>Каникулы</Text>
              {!showAddHoliday && (
                <TouchableOpacity
                  onPress={() => setShowAddHoliday(true)}
                  style={styles.addHolidayButton}
                >
                  <Text style={styles.addHolidayButtonText}>+ Добавить</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Список каникул */}
            {settings.holidays.length > 0 && (
              <View style={styles.holidaysList}>
                {settings.holidays.map((holiday) => {
                  const startDate = new Date(holiday.startDate);
                  const endDate = new Date(holiday.endDate);
                  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <View key={holiday.id} style={styles.holidayItem}>
                      <View style={styles.holidayItemContent}>
                        {holiday.name && (
                          <Text style={styles.holidayName}>{holiday.name}</Text>
                        )}
                        <Text style={styles.holidayDates}>
                          {formatDate(holiday.startDate)} — {formatDate(holiday.endDate)}
                        </Text>
                        <Text style={styles.holidayDuration}>
                          {daysDiff} {daysDiff === 1 ? 'день' : daysDiff < 5 ? 'дня' : 'дней'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveHoliday(holiday.id)}
                        style={styles.removeHolidayButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Форма добавления каникул */}
            {showAddHoliday && (
              <View style={styles.addHolidayForm}>
                <Text style={styles.label}>Название (необязательно)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Например: Зимние каникулы"
                  placeholderTextColor="#666"
                  value={holidayName}
                  onChangeText={setHolidayName}
                />

                <Text style={styles.label}>Дата начала</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(!showStartDatePicker)}
                >
                  <Text style={styles.dateButtonText}>
                    {holidayStartDate ? formatDate(holidayStartDate) : 'Выберите дату'}
                  </Text>
                  <Text style={styles.dateButtonIcon}>📅</Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                  <View style={styles.calendarContainer}>
                    <Calendar
                      current={holidayStartDate || new Date().toISOString().split('T')[0]}
                      onDayPress={(day) => {
                        setHolidayStartDate(day.dateString);
                        setShowStartDatePicker(false);
                      }}
                      markedDates={{
                        [holidayStartDate]: {
                          selected: true,
                          selectedColor: '#C89153',
                        },
                      }}
                      firstDay={1}
                      theme={DARK_CALENDAR_THEME}
                    />
                  </View>
                )}

                <Text style={styles.label}>Дата окончания</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(!showEndDatePicker)}
                >
                  <Text style={styles.dateButtonText}>
                    {holidayEndDate ? formatDate(holidayEndDate) : 'Выберите дату'}
                  </Text>
                  <Text style={styles.dateButtonIcon}>📅</Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <View style={styles.calendarContainer}>
                    <Calendar
                      current={holidayEndDate || holidayStartDate || new Date().toISOString().split('T')[0]}
                      minDate={holidayStartDate || undefined}
                      onDayPress={(day) => {
                        setHolidayEndDate(day.dateString);
                        setShowEndDatePicker(false);
                      }}
                      markedDates={{
                        [holidayEndDate]: {
                          selected: true,
                          selectedColor: '#C89153',
                        },
                      }}
                      firstDay={1}
                      theme={DARK_CALENDAR_THEME}
                    />
                  </View>
                )}

                <View style={styles.holidayFormButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddHoliday(false);
                      setHolidayStartDate('');
                      setHolidayEndDate('');
                      setHolidayName('');
                    }}
                    style={styles.cancelHolidayButton}
                  >
                    <Text style={styles.cancelHolidayButtonText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddHoliday}
                    style={styles.confirmHolidayButton}
                  >
                    <Text style={styles.confirmHolidayButtonText}>Добавить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {settings.holidays.length === 0 && !showAddHoliday && (
              <Text style={styles.hint}>Пока нет добавленных каникул</Text>
            )}
          </View>

          {/* Период обучения */}
          <View style={styles.section}>
            <Text style={styles.label}>Период обучения</Text>
            <Text style={styles.hint}>Укажите даты начала и окончания учебного года/семестра</Text>
            
            <Text style={[styles.label, { fontSize: 14, marginTop: 16, marginBottom: 8 }]}>Дата начала</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowAcademicStartPicker(!showAcademicStartPicker)}
            >
              <Text style={styles.dateButtonText}>
                {academicYearStart ? formatDate(academicYearStart) : 'Выберите дату'}
              </Text>
              <Text style={styles.dateButtonIcon}>📅</Text>
            </TouchableOpacity>
            {showAcademicStartPicker && (
              <View style={styles.calendarContainer}>
                <Calendar
                  current={academicYearStart || new Date().toISOString().split('T')[0]}
                  onDayPress={(day) => {
                    setAcademicYearStart(day.dateString);
                    setShowAcademicStartPicker(false);
                  }}
                  markedDates={{
                    [academicYearStart]: {
                      selected: true,
                      selectedColor: '#C89153',
                    },
                  }}
                  firstDay={1}
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

            <Text style={[styles.label, { fontSize: 14, marginTop: 16, marginBottom: 8 }]}>Дата окончания</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowAcademicEndPicker(!showAcademicEndPicker)}
            >
              <Text style={styles.dateButtonText}>
                {academicYearEnd ? formatDate(academicYearEnd) : 'Выберите дату'}
              </Text>
              <Text style={styles.dateButtonIcon}>📅</Text>
            </TouchableOpacity>
            {showAcademicEndPicker && (
              <View style={styles.calendarContainer}>
                <Calendar
                  current={academicYearEnd || academicYearStart || new Date().toISOString().split('T')[0]}
                  minDate={academicYearStart || undefined}
                  onDayPress={(day) => {
                    setAcademicYearEnd(day.dateString);
                    setShowAcademicEndPicker(false);
                  }}
                  markedDates={{
                    [academicYearEnd]: {
                      selected: true,
                      selectedColor: '#C89153',
                    },
                  }}
                  firstDay={1}
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
          </View>

          {/* Предпросмотр временных слотов */}
          <View style={styles.section}>
            <Text style={styles.label}>Предпросмотр временных слотов</Text>
            <View style={styles.previewContainer}>
              {timeSlots.map((slot, index) => (
                <View key={index} style={styles.previewSlot}>
                  <Text style={styles.previewSlotNumber}>{slot.number}</Text>
                  <View style={styles.previewSlotTime}>
                    <Text style={styles.previewSlotTimeText}>{slot.start}</Text>
                    <Text style={styles.previewSlotSeparator}>—</Text>
                    <Text style={styles.previewSlotTimeText}>{slot.end}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Кнопка продолжения */}
          <TouchableOpacity onPress={handleSettingsComplete} style={styles.completeButton}>
            <Text style={styles.completeButtonText}>Продолжить</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Шаг 2: Предметы и расписание
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.safeAreaHeader} edges={['top']}>
        {isModal && (
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <Animated.View style={[styles.header, { paddingTop: isModal ? 12 : headerPaddingTopStep2, paddingBottom: headerPaddingBottomStep2 }]}>
          {isModal ? (
            <View style={styles.closeButtonPlaceholder} />
          ) : (
            <TouchableOpacity onPress={() => setCurrentStep('settings')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#C89153" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Animated.Text style={[styles.title, { fontSize: titleFontSizeStep2 }]}>
              {isModal ? 'Настроить расписание' : 'Предметы и расписание'}
            </Animated.Text>
          </View>
          <View style={styles.closeButtonPlaceholder} />
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Добавление предметов */}
        <View style={styles.section}>
          <Text style={styles.label}>Предметы</Text>
          {!showNewSubjectInput ? (
            <>
              <View style={styles.optionsContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.option}>
                    <Text style={styles.optionText}>{subject.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setShowNewSubjectInput(true)}
                style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Добавить предмет</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Название предмета"
                placeholderTextColor="#666"
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                autoFocus
              />
              <View style={styles.newInputButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewSubjectInput(false);
                    setNewSubjectName('');
                  }}
                  style={styles.cancelNewButton}>
                  <Text style={styles.cancelNewText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddSubject} style={styles.confirmNewButton}>
                  <Text style={styles.confirmNewText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Добавление преподавателей */}
        <View style={styles.section}>
          <Text style={styles.label}>Преподаватели</Text>
          {!showNewTeacherInput ? (
            <>
              <View style={styles.optionsContainer}>
                {teachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.id}
                    style={styles.option}>
                    <Text style={styles.optionText}>{teacher.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setShowNewTeacherInput(true)}
                style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Добавить преподавателя</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Имя преподавателя"
                placeholderTextColor="#666"
                value={newTeacherName}
                onChangeText={setNewTeacherName}
                autoFocus
              />
              <View style={styles.newInputButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewTeacherInput(false);
                    setNewTeacherName('');
                  }}
                  style={styles.cancelNewButton}>
                  <Text style={styles.cancelNewText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddTeacher} style={styles.confirmNewButton}>
                  <Text style={styles.confirmNewText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Выбор дня недели */}
        <View style={styles.section}>
          <Text style={styles.label}>День недели</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
            {DAYS_OF_WEEK.map((day, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentDay(index)}
                style={[
                  styles.option,
                  currentDay === index && styles.selectedOption,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    currentDay === index && styles.selectedOptionText,
                  ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Уроки для выбранного дня */}
        <View style={styles.section}>
          <View style={styles.lessonsHeader}>
            <Text style={styles.label}>Уроки на {DAYS_OF_WEEK[currentDay]}</Text>
            <TouchableOpacity onPress={addLessonToDay} style={styles.addLessonButton}>
              <Text style={styles.addLessonButtonText}>+ Добавить урок</Text>
            </TouchableOpacity>
          </View>

          {currentDayLessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Пока нет уроков</Text>
              <Text style={styles.emptyStateSubtext}>Нажмите &quot;Добавить урок&quot; чтобы начать</Text>
            </View>
          ) : (
            currentDayLessons.map((lesson, index) => (
              <View key={index} style={styles.lessonCard}>
                <View style={styles.lessonCardHeader}>
                  <Text style={styles.lessonNumber}>Урок {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeLesson(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Предмет */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Предмет</Text>
                  <TouchableOpacity
                    onPress={() => setShowSubjectPicker(index)}
                    style={styles.dropdownButton}>
                    <Text style={[
                      styles.dropdownButtonText,
                      !lesson.subjectId && styles.dropdownButtonTextPlaceholder
                    ]}>
                      {lesson.subjectId 
                        ? subjects.find(s => s.id === lesson.subjectId)?.name || 'Выберите предмет'
                        : 'Выберите предмет'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Преподаватель */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Преподаватель</Text>
                  <TouchableOpacity
                    onPress={() => setShowTeacherPicker(index)}
                    style={styles.dropdownButton}>
                    <Text style={[
                      styles.dropdownButtonText,
                      !lesson.teacherId && styles.dropdownButtonTextPlaceholder
                    ]}>
                      {lesson.teacherId 
                        ? teachers.find(t => t.id === lesson.teacherId)?.name || 'Выберите преподавателя'
                        : 'Выберите преподавателя'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Тип */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Тип</Text>
                  <View style={styles.typeContainer}>
                    {LESSON_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => updateLesson(index, 'type', type.value)}
                        style={[
                          styles.typeOption,
                          lesson.type === type.value && styles.selectedTypeOption,
                        ]}>
                        <Text
                          style={[
                            styles.typeOptionText,
                            lesson.type === type.value && styles.selectedTypeOptionText,
                          ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Время */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Время</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TIME_SLOTS.map((slot, slotIndex) => (
                      <TouchableOpacity
                        key={slotIndex}
                        onPress={() => updateLesson(index, 'timeSlot', slotIndex)}
                        style={[
                          styles.timeSlotOption,
                          lesson.timeSlot === slotIndex && styles.timeSlotOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.timeSlotText,
                            lesson.timeSlot === slotIndex && styles.timeSlotTextSelected,
                          ]}>
                          {slot.start}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Неделя (только для формата "две недели") */}
                {settings.scheduleFormat === 2 && (
                  <View style={styles.lessonField}>
                    <Text style={styles.lessonFieldLabel}>Неделя</Text>
                    <View style={styles.weekContainer}>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', null)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === null && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === null && styles.weekOptionTextSelected,
                          ]}>
                          Обе недели
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', 0)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === 0 && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === 0 && styles.weekOptionTextSelected,
                          ]}>
                          Неделя A
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', 1)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === 1 && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === 1 && styles.weekOptionTextSelected,
                          ]}>
                          Неделя B
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Аудитория */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Аудитория (необязательно)</Text>
                  <TextInput
                    style={styles.lessonInput}
                    placeholder="Например: Аудитория 129"
                    placeholderTextColor="#666"
                    value={lesson.room}
                    onChangeText={(value) => updateLesson(index, 'room', value)}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Кнопка завершения */}
        <TouchableOpacity onPress={handleScheduleComplete} style={styles.completeButton}>
          <Text style={styles.completeButtonText}>Завершить настройку</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Модальное окно выбора предмета */}
      <Modal
        visible={showSubjectPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите предмет</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => {
                    if (showSubjectPicker !== null) {
                      updateLesson(showSubjectPicker, 'subjectId', subject.id);
                      setShowSubjectPicker(null);
                    }
                  }}
                  style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>{subject.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно выбора преподавателя */}
      <Modal
        visible={showTeacherPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeacherPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTeacherPicker(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите преподавателя</Text>
              <TouchableOpacity onPress={() => setShowTeacherPicker(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {teachers.map((teacher) => (
                <TouchableOpacity
                  key={teacher.id}
                  onPress={() => {
                    if (showTeacherPicker !== null) {
                      updateLesson(showTeacherPicker, 'teacherId', teacher.id);
                      setShowTeacherPicker(null);
                    }
                  }}
                  style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>{teacher.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeAreaHeader: {
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  backButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Glanz',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  optionText: {
    color: '#999',
    fontSize: 12,
  },
  selectedOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#C89153',
    fontSize: 14,
    textAlign: 'center',
  },
  newInputContainer: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  longBreakContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  longBreakOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  longBreakOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  longBreakOptionText: {
    color: '#999',
    fontSize: 14,
  },
  longBreakOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  longBreakDurationContainer: {
    marginTop: 16,
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  formatOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  formatOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  formatOptionText: {
    color: '#999',
    fontSize: 14,
  },
  formatOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  previewSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  previewSlotNumber: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
    width: 30,
  },
  previewSlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  previewSlotTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  previewSlotSeparator: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 8,
  },
  holidaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addHolidayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C89153',
    borderRadius: 12,
  },
  addHolidayButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  holidaysList: {
    marginBottom: 16,
    gap: 12,
  },
  holidayItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  holidayItemContent: {
    flex: 1,
  },
  holidayName: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  holidayDates: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  holidayDuration: {
    color: '#666',
    fontSize: 12,
  },
  removeHolidayButton: {
    padding: 8,
    marginLeft: 12,
  },
  addHolidayForm: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
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
    padding: 8,
    marginBottom: 12,
  },
  holidayFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelHolidayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelHolidayButtonText: {
    color: '#999',
    fontSize: 14,
  },
  confirmHolidayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#C89153',
    borderRadius: 8,
  },
  confirmHolidayButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  newInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelNewText: {
    color: '#999',
    fontSize: 14,
  },
  confirmNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#C89153',
    borderRadius: 8,
  },
  confirmNewText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  lessonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addLessonButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C89153',
    borderRadius: 12,
  },
  addLessonButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#444',
    fontSize: 12,
  },
  lessonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lessonNumber: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '600',
  },
  lessonField: {
    marginBottom: 16,
  },
  lessonFieldLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  lessonOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  lessonOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  lessonOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  lessonOptionText: {
    color: '#999',
    fontSize: 11,
  },
  lessonOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  selectedTypeOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  typeOptionText: {
    color: '#999',
    fontSize: 12,
  },
  selectedTypeOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  timeSlotOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#000',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeSlotOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  timeSlotText: {
    color: '#999',
    fontSize: 12,
  },
  timeSlotTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  weekContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  weekOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  weekOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  weekOptionText: {
    color: '#999',
    fontSize: 12,
  },
  weekOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  lessonInput: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  completeButton: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  completeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  dropdownButtonTextPlaceholder: {
    color: '#666',
  },
  dropdownArrow: {
    color: '#999',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalClose: {
    color: '#999',
    fontSize: 24,
    fontWeight: '300',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
  },
});

