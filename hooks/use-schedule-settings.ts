import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const SETTINGS_KEY = '@study_organizer:schedule_settings';

export interface HolidayPeriod {
  id: string;
  startDate: string; // Формат YYYY-MM-DD
  endDate: string; // Формат YYYY-MM-DD
  name?: string; // Название каникул (необязательно)
}

export interface ScheduleSettings {
  // Время начала первого урока (формат HH:mm)
  firstLessonStartTime: string;
  // Длительность урока в минутах
  lessonDuration: number;
  // Длительность перемены в минутах
  breakDuration: number;
  // Номер урока, после которого удлинённая перемена (null если нет удлинённой перемены)
  longBreakAfterLesson: number | null;
  // Длительность удлинённой перемены в минутах
  longBreakDuration: number;
  // Формат расписания: 1 - одна неделя, 2 - две недели
  scheduleFormat: 1 | 2;
  // Формат занятий: 1 - уроки, 2 - пары
  lessonFormat: 1 | 2;
  // Периоды каникул
  holidays: HolidayPeriod[];
  // Дата начала учебного года/семестра (формат YYYY-MM-DD)
  academicYearStart: string;
  // Дата окончания учебного года/семестра (формат YYYY-MM-DD)
  academicYearEnd: string;
}

// Получаем текущий год и устанавливаем период обучения по умолчанию (1 сентября - 31 августа следующего года)
const getDefaultAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // Если сейчас сентябрь-декабрь, учебный год начинается в этом году
  // Если январь-август, учебный год начался в прошлом году
  let startYear = currentYear;
  if (month >= 1 && month <= 8) {
    startYear = currentYear - 1;
  }
  
  return {
    start: `${startYear}-09-01`,
    end: `${startYear + 1}-08-31`,
  };
};

const defaultAcademicYear = getDefaultAcademicYear();

const DEFAULT_SETTINGS: ScheduleSettings = {
  firstLessonStartTime: '09:00',
  lessonDuration: 90,
  breakDuration: 10,
  longBreakAfterLesson: null,
  longBreakDuration: 20,
  scheduleFormat: 1,
  lessonFormat: 1,
  holidays: [],
  academicYearStart: defaultAcademicYear.start,
  academicYearEnd: defaultAcademicYear.end,
};

export function useScheduleSettings() {
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<ScheduleSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      setSettings(updated);
      return true;
    } catch (error) {
      console.error('Error updating schedule settings:', error);
      return false;
    }
  };

  // Вычисляет время начала урока по номеру (начиная с 1)
  const getLessonStartTime = (lessonNumber: number): string => {
    const [hours, minutes] = settings.firstLessonStartTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    // Добавляем время для всех предыдущих уроков и перемен
    for (let i = 1; i < lessonNumber; i++) {
      totalMinutes += settings.lessonDuration;
      // Если после этого урока была удлинённая перемена, используем её длительность
      if (settings.longBreakAfterLesson === i) {
        totalMinutes += settings.longBreakDuration;
      } else {
        totalMinutes += settings.breakDuration;
      }
    }
    
    const startHours = Math.floor(totalMinutes / 60);
    const startMins = totalMinutes % 60;
    
    return `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;
  };

  // Вычисляет время окончания урока по номеру
  const getLessonEndTime = (lessonNumber: number): string => {
    const startTime = getLessonStartTime(lessonNumber);
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + settings.lessonDuration;
    
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  // Генерирует массив временных слотов на основе настроек
  // Генерирует слоты до 21:00
  const generateTimeSlots = (maxLessons?: number) => {
    const slots = [];
    const maxTime = 21 * 60; // 21:00 в минутах
    
    let i = 1;
    while (true) {
      const endTime = getLessonEndTime(i);
      const [endHours, endMins] = endTime.split(':').map(Number);
      const endTimeInMinutes = endHours * 60 + endMins;
      
      // Если время окончания урока превышает 21:00, прекращаем генерацию
      if (endTimeInMinutes > maxTime) {
        break;
      }
      
      // Если передан maxLessons и достигли его, прекращаем
      if (maxLessons !== undefined && i > maxLessons) {
        break;
      }
      
      slots.push({
        start: getLessonStartTime(i),
        end: endTime,
        number: i,
      });
      
      i++;
      
      // Защита от бесконечного цикла (максимум 20 уроков)
      if (i > 20) {
        break;
      }
    }
    return slots;
  };

  // Проверяет, является ли дата каникулами
  const isHoliday = (date: string): boolean => {
    const dateObj = new Date(date);
    return settings.holidays.some(holiday => {
      const startDate = new Date(holiday.startDate);
      const endDate = new Date(holiday.endDate);
      return dateObj >= startDate && dateObj <= endDate;
    });
  };

  // Получает информацию о каникулах для даты (если есть)
  const getHolidayInfo = (date: string): HolidayPeriod | null => {
    const dateObj = new Date(date);
    return settings.holidays.find(holiday => {
      const startDate = new Date(holiday.startDate);
      const endDate = new Date(holiday.endDate);
      return dateObj >= startDate && dateObj <= endDate;
    }) || null;
  };

  // Добавляет период каникул
  const addHoliday = async (holiday: HolidayPeriod) => {
    const updatedHolidays = [...settings.holidays, holiday];
    return await updateSettings({ holidays: updatedHolidays });
  };

  // Удаляет период каникул
  const removeHoliday = async (holidayId: string) => {
    const updatedHolidays = settings.holidays.filter(h => h.id !== holidayId);
    return await updateSettings({ holidays: updatedHolidays });
  };

  // Обновляет период каникул
  const updateHoliday = async (holidayId: string, updatedHoliday: HolidayPeriod) => {
    const updatedHolidays = settings.holidays.map(h => 
      h.id === holidayId ? updatedHoliday : h
    );
    return await updateSettings({ holidays: updatedHolidays });
  };

  return {
    settings,
    isLoading,
    updateSettings,
    getLessonStartTime,
    getLessonEndTime,
    generateTimeSlots,
    isHoliday,
    getHolidayInfo,
    addHoliday,
    removeHoliday,
    updateHoliday,
    reload: loadSettings,
  };
}

