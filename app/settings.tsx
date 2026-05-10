import { ensureRuCalendarLocale, getCalendarTheme } from '@/constants/calendar-theme';
import { clearDebugData, runDebugSeeds } from '@/database/debug-seeds';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDebugSeeds } from '@/hooks/use-debug-seeds';
import { ThemePreference, useThemePreference } from '@/hooks/use-theme-preference';
import { HolidayPeriod, useScheduleSettings } from '@/hooks/use-schedule-settings';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function SettingsScreen() {
  const { colors, isDark } = useAppTheme();
  const calendarTheme = getCalendarTheme(isDark);

  useEffect(() => {
    ensureRuCalendarLocale();
  }, []);

  const { themePreference, setThemePreference } = useThemePreference();
  const { settings, isLoading, updateSettings, generateTimeSlots, addHoliday, removeHoliday } = useScheduleSettings();
  const { debugSeedsEnabled, setDebugSeedsEnabled } = useDebugSeeds();
  const isSeedUiEnabled = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEBUG_SEEDS === 'true';

  const [firstLessonStartTime, setFirstLessonStartTime] = useState(settings.firstLessonStartTime);
  const [lessonDuration, setLessonDuration] = useState(settings.lessonDuration.toString());
  const [breakDuration, setBreakDuration] = useState(settings.breakDuration.toString());
  const [longBreakAfterLesson, setLongBreakAfterLesson] = useState<number | null>(settings.longBreakAfterLesson);
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreakDuration.toString());
  const [scheduleFormat, setScheduleFormat] = useState<1 | 2>(settings.scheduleFormat);
  const [lessonFormat, setLessonFormat] = useState<1 | 2>(settings.lessonFormat);
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

  // Обновляем локальные состояния при загрузке настроек
  useEffect(() => {
    if (!isLoading) {
      setFirstLessonStartTime(settings.firstLessonStartTime);
      setLessonDuration(settings.lessonDuration.toString());
      setBreakDuration(settings.breakDuration.toString());
      setLongBreakAfterLesson(settings.longBreakAfterLesson);
      setLongBreakDuration(settings.longBreakDuration.toString());
      setScheduleFormat(settings.scheduleFormat);
      setLessonFormat(settings.lessonFormat);
      setAcademicYearStart(settings.academicYearStart);
      setAcademicYearEnd(settings.academicYearEnd);
    }
  }, [settings, isLoading]);

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
      Alert.alert('Успешно', 'Каникулы добавлены');
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

  const handleSave = async () => {
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

    const success = await updateSettings({
      firstLessonStartTime,
      lessonDuration: lessonDur,
      breakDuration: breakDur,
      longBreakAfterLesson,
      longBreakDuration: longBreakDur,
      scheduleFormat,
      lessonFormat,
      academicYearStart,
      academicYearEnd,
    });

    if (success) {
      Alert.alert('Успешно', 'Настройки сохранены', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  const handleToggleDebugSeeds = async (value: boolean) => {
    const ok = await setDebugSeedsEnabled(value);
    if (!ok) {
      Alert.alert('Ошибка', 'Не удалось сохранить настройку сидов');
      return;
    }
  };

  const handleRunSeedsNow = () => {
    Alert.alert(
      'Применить отладочные сиды',
      'Текущие данные будут очищены и заменены тестовыми. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Применить',
          style: 'destructive',
          onPress: () => {
            const result = runDebugSeeds({ forceReset: true });
            if (result.ok) {
              Alert.alert('Готово', result.message);
            } else {
              Alert.alert('Ошибка', result.message);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Очистить все данные',
      'Будут удалены все данные приложения. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            const result = clearDebugData();
            if (result.ok) {
              Alert.alert('Готово', result.message);
            } else {
              Alert.alert('Ошибка', result.message);
            }
          },
        },
      ]
    );
  };

  const timeSlots = generateTimeSlots();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.header, { backgroundColor: colors.bgPrimary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Настройки времени расписания</Text>
        <View style={styles.closeButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Тема приложения</Text>
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((mode) => {
              const isActive = themePreference === mode;
              const label =
                mode === 'system' ? 'Системная' : mode === 'light' ? 'Светлая' : 'Тёмная';
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemePreference(mode)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isActive ? colors.accent : colors.surface,
                      borderColor: isActive ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: isActive ? colors.inverseText : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isSeedUiEnabled && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Отладочные сиды</Text>
            <View style={[styles.debugCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <View style={styles.debugRow}>
                <View style={styles.debugTextContainer}>
                  <Text style={[styles.debugTitle, { color: colors.textPrimary }]}>Автозапуск сидов</Text>
                  <Text style={[styles.debugHint, { color: colors.textMuted }]}>
                    При старте приложения будут подставляться тестовые данные
                  </Text>
                </View>
                <Switch value={debugSeedsEnabled} onValueChange={handleToggleDebugSeeds} />
              </View>

              <View style={styles.debugButtonsRow}>
                <TouchableOpacity onPress={handleRunSeedsNow} style={styles.debugActionButton}>
                  <Text style={styles.debugActionButtonText}>Заполнить сейчас</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearAllData}
                  style={[styles.debugActionButton, styles.debugDangerButton]}
                >
                  <Text style={styles.debugActionButtonText}>Очистить всё</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Время начала первого урока */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Время начала первого урока</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
            placeholder="09:00"
            placeholderTextColor={colors.textMuted}
            value={firstLessonStartTime}
            onChangeText={setFirstLessonStartTime}
            keyboardType="default"
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Формат: HH:mm (например, 09:00)</Text>
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
              <Ionicons
                name={scheduleFormat === 1 ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={scheduleFormat === 1 ? '#C89153' : '#666'}
              />
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
              <Ionicons
                name={scheduleFormat === 2 ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={scheduleFormat === 2 ? '#C89153' : '#666'}
              />
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

        {/* Формат занятий */}
        <View style={styles.section}>
          <Text style={styles.label}>Формат занятий</Text>
          <View style={styles.formatContainer}>
            <TouchableOpacity
              onPress={() => setLessonFormat(1)}
              style={[
                styles.formatOption,
                lessonFormat === 1 && styles.formatOptionSelected,
              ]}>
              <Ionicons
                name={lessonFormat === 1 ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={lessonFormat === 1 ? '#C89153' : '#666'}
              />
              <Text
                style={[
                  styles.formatOptionText,
                  lessonFormat === 1 && styles.formatOptionTextSelected,
                ]}>
                Уроки
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLessonFormat(2)}
              style={[
                styles.formatOption,
                lessonFormat === 2 && styles.formatOptionSelected,
              ]}>
              <Ionicons
                name={lessonFormat === 2 ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={lessonFormat === 2 ? '#C89153' : '#666'}
              />
              <Text
                style={[
                  styles.formatOptionText,
                  lessonFormat === 2 && styles.formatOptionTextSelected,
                ]}>
                Пары
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            {lessonFormat === 1
              ? 'Занятия отображаются как уроки'
              : 'Занятия отображаются как пары'}
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
                    theme={calendarTheme}
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
                    theme={calendarTheme}
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

        {/* Кнопка сохранения */}
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Сохранить настройки</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#121417',
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F7F8FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121417',
    fontFamily: Typography.fonts.heading,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  debugTextContainer: {
    flex: 1,
  },
  debugTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  debugHint: {
    fontSize: 12,
  },
  debugButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  debugActionButton: {
    flex: 1,
    backgroundColor: '#C89153',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  debugDangerButton: {
    backgroundColor: '#D65845',
  },
  debugActionButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    color: '#121417',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DEE3EA',
  },
  hint: {
    color: '#6D7680',
    fontSize: 12,
    marginTop: 8,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  longBreakOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  longBreakOptionText: {
    color: '#6D7680',
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
    gap: 12,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatOptionSelected: {
    borderColor: '#C89153',
    backgroundColor: '#F5E7D5',
  },
  formatOptionText: {
    color: '#6D7680',
    fontSize: 16,
    marginLeft: 12,
  },
  formatOptionTextSelected: {
    color: '#C89153',
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
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
    color: '#121417',
    fontSize: 14,
    fontWeight: '500',
  },
  previewSlotSeparator: {
    color: '#6D7680',
    fontSize: 14,
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE3EA',
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
    color: '#121417',
    fontSize: 14,
    marginBottom: 4,
  },
  holidayDuration: {
    color: '#6D7680',
    fontSize: 12,
  },
  removeHolidayButton: {
    padding: 8,
    marginLeft: 12,
  },
  addHolidayForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DEE3EA',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE3EA',
    marginBottom: 12,
  },
  dateButtonText: {
    color: '#121417',
    fontSize: 16,
  },
  dateButtonIcon: {
    fontSize: 20,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
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
    color: '#6D7680',
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
});

