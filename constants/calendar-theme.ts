import { Colors, Typography } from '@/constants/theme';
import { LocaleConfig } from 'react-native-calendars';

let localeInitialized = false;

export function ensureRuCalendarLocale() {
  if (localeInitialized) {
    return;
  }

  LocaleConfig.locales.ru = {
    monthNames: [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    ],
    monthNamesShort: [
      'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
      'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
    ],
    dayNames: [
      'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье',
    ],
    // Порядок с понедельника — совпадает с firstDay={1} в Calendar
    dayNamesShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    firstDayOfWeek: 1,
  };
  LocaleConfig.defaultLocale = 'ru';
  localeInitialized = true;
}

// Локаль до первого рендера Calendar (без «мигания» Mon/Tue…)
ensureRuCalendarLocale();

export function getCalendarTheme(isDark: boolean) {
  const colors = isDark ? Colors.dark : Colors.light;
  return {
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.accent,
    selectedDayTextColor: colors.inverseText,
    todayTextColor: colors.accent,
    dayTextColor: colors.textPrimary,
    textDisabledColor: colors.textMuted,
    dotColor: colors.accent,
    selectedDotColor: colors.inverseText,
    arrowColor: colors.accent,
    monthTextColor: colors.textPrimary,
    textDayFontFamily: Typography.fonts.body,
    textMonthFontFamily: Typography.fonts.body,
    textDayHeaderFontFamily: Typography.fonts.body,
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  } as const;
}

export const DARK_CALENDAR_THEME = getCalendarTheme(true);

