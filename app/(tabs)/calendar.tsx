import { ensureRuCalendarLocale, getCalendarTheme } from '@/constants/calendar-theme';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import dayjs from 'dayjs';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// Получаем размеры экрана
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE_FACTOR = 1.05; // Коэффициент масштабирования активной карточки
const SIDE_PADDING = 10; // Отступ от краев экрана (одинаковый везде)

// Массив русских названий месяцев для заголовков
const RUSSIAN_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Компонент для элемента месяца с анимацией
interface MonthItemProps {
  item: {
    id: string;
    year: number;
    month: number;
    title: string;
  };
  isActive: boolean;
  selected: string;
  markedDates: any;
  onDayPress: (day: any) => void;
}

const MonthItem = React.memo(({ 
  item, 
  isActive, 
  selected, 
  markedDates, 
  onDayPress 
}: MonthItemProps) => {
  const { colors, isDark } = useAppTheme();
  const calendarTheme = useMemo(() => getCalendarTheme(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scaleAnim = useRef(new Animated.Value(isActive ? SCALE_FACTOR : 1)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? SCALE_FACTOR : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isActive, scaleAnim]);
  
  return (
    <View style={styles.cardWrapper}>
      <Animated.View 
        style={[
          styles.monthBlock,
          {
            transform: [{ scale: scaleAnim }],
          },
          isActive && styles.monthBlockActive,
        ]}
      >
      {/* Заголовок месяца */}
      <Text style={[styles.monthTitle, { color: colors.textPrimary, fontFamily: Typography.fonts.body }]}>
        {RUSSIAN_MONTHS[item.month - 1]}
      </Text>

      {/* Календарь месяца */}
      <View style={styles.calendarWrapper}>
        <Calendar
          current={`${item.year}-${String(item.month).padStart(2,'0')}-01`}
          hideArrows={true}
          disableMonthChange={true}
          hideExtraDays={false}
          showWeekNumbers={false}
          enableSwipeMonths={false}
          onDayPress={onDayPress}
          markingType={'multi-dot'}
          markedDates={markedDates}
          renderHeader={() => null}
          firstDay={1}
          theme={{
            ...calendarTheme,
            monthTextColor: 'transparent',
            textMonthFontSize: 1,
            textMonthFontFamily: Typography.fonts.body,
          }}
          style={{
            paddingBottom: 5,
          }}
        />
      </View>
      </Animated.View>
    </View>
  );
});

MonthItem.displayName = 'MonthItem';

// Компонент статистики для месяца
interface MonthStatsProps {
  stats: {
    controlAndTestWorks: number;
    homework: number;
  } | null;
}

const MonthStats = React.memo(({ stats }: MonthStatsProps) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!stats) return null;

  return (
    <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsHeaderLine, { backgroundColor: colors.accent }]} />
        <Text style={[styles.statsTitle, { color: colors.textPrimary, fontFamily: Typography.fonts.body }]}>
          Статистика месяца
        </Text>
      </View>

      <View style={[styles.legendInline, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.legendInlineItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Несданное</Text>
        </View>
        <View style={styles.legendInlineItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Выполнено</Text>
        </View>
      </View>

      <View style={[styles.statsDualPanel, { backgroundColor: colors.bgPrimary, borderColor: colors.borderSubtle }]}>
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: colors.accent, fontFamily: Typography.fonts.body }]}>
            {stats.controlAndTestWorks}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: Typography.fonts.body }]}>
            Работы
          </Text>
        </View>
        <View style={[styles.statsDualDivider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: colors.accent, fontFamily: Typography.fonts.body }]}>
            {stats.homework}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: Typography.fonts.body }]}>
            Домашка
          </Text>
        </View>
      </View>
    </View>
  );
});

MonthStats.displayName = 'MonthStats';

export default function CalendarScreen() {
  useEffect(() => {
    ensureRuCalendarLocale();
  }, []);

  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState(dayjs().format("YYYY-MM-DD"));
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // Используем хуки для получения данных
  const { homework, reload: reloadHomework } = useHomework();
  const { exams, reload: reloadExams } = useExams();
  const { settings } = useScheduleSettings();

  // Перезагружаем данные для обновления статистики при смене месяца
  useEffect(() => {
    reloadHomework();
    reloadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonthId]);

  // Перезагружаем данные при возврате на экран
  useFocusEffect(
    useCallback(() => {
      reloadHomework();
      reloadExams();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Точки: оранжевый (warning) — есть невыполненные ДЗ/работы; зелёный (success) — всё сдано
  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};
    const byDate: Record<string, { hasItems: boolean; pending: boolean }> = {};

    const touch = (date: string) => {
      if (!byDate[date]) {
        byDate[date] = { hasItems: false, pending: false };
      }
    };

    homework.forEach((hw) => {
      if (!hw.due_date) return;
      touch(hw.due_date);
      byDate[hw.due_date].hasItems = true;
      if (hw.is_completed !== 1) {
        byDate[hw.due_date].pending = true;
      }
    });

    exams.forEach((exam) => {
      if (!exam.date) return;
      touch(exam.date);
      byDate[exam.date].hasItems = true;
      if (exam.is_completed !== 1) {
        byDate[exam.date].pending = true;
      }
    });

    Object.keys(byDate).forEach((date) => {
      const { hasItems, pending } = byDate[date];
      if (!hasItems) return;
      const dots = [
        {
          key: pending ? 'pending' : 'done',
          color: pending ? colors.warning : colors.success,
        },
      ];
      marked[date] = {
        dots,
        selected: date === selected,
        selectedColor: date === selected ? colors.accent : undefined,
        selectedTextColor: date === selected ? colors.inverseText : undefined,
        selectedDotColor: date === selected ? colors.inverseText : undefined,
      };
    });

    if (selected && !marked[selected]) {
      marked[selected] = {
        selected: true,
        selectedColor: colors.accent,
        selectedTextColor: colors.inverseText,
      };
    }

    return marked;
  }, [homework, exams, selected, colors]);

  // создаём список месяцев в хронологическом порядке на основе периода обучения
  const months = useMemo(() => {
    const arr = [];
    
    if (!settings.academicYearStart || !settings.academicYearEnd) {
      // Если период обучения не задан, используем старую логику
      const now = dayjs();
      const currentMonthId = now.format("YYYY-MM");

      for (let offset = -2; offset <= -1; offset++) {
        const m = now.add(offset, "month");
        arr.push({
          id: m.format("YYYY-MM"),
          year: m.year(),
          month: m.month() + 1,
          title: m.format("MMMM"),
        });
      }

      arr.push({
        id: currentMonthId,
        year: now.year(),
        month: now.month() + 1,
        title: now.format("MMMM"),
      });

      for (let offset = 1; offset <= 6; offset++) {
        const m = now.add(offset, "month");
        arr.push({
          id: m.format("YYYY-MM"),
          year: m.year(),
          month: m.month() + 1,
          title: m.format("MMMM"),
        });
      }
      return arr;
    }

    // Используем период обучения
    const startDate = dayjs(settings.academicYearStart);
    const endDate = dayjs(settings.academicYearEnd);

    // Начинаем с месяца начала учебного периода
    let currentMonth = startDate.startOf('month');
    
    // Добавляем все месяцы от начала периода до конца
    while (currentMonth.isBefore(endDate) || currentMonth.isSame(endDate, 'month')) {
      arr.push({
        id: currentMonth.format("YYYY-MM"),
        year: currentMonth.year(),
        month: currentMonth.month() + 1,
        title: currentMonth.format("MMMM"),
      });
      currentMonth = currentMonth.add(1, 'month');
    }

    return arr;
  }, [settings.academicYearStart, settings.academicYearEnd]);

  // Находим индекс текущего месяца в массиве
  const currentMonthIndex = useMemo(() => {
    const currentMonthId = dayjs().format("YYYY-MM");
    return months.findIndex(m => m.id === currentMonthId);
  }, [months]);

  // Устанавливаем начальный активный месяц
  useEffect(() => {
    if (months.length > 0 && !activeMonthId) {
      const currentMonthId = dayjs().format("YYYY-MM");
      setActiveMonthId(currentMonthId);
    }
  }, [months, activeMonthId]);

  // Прокручиваем к текущему месяцу при монтировании
  useEffect(() => {
    if (currentMonthIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ 
          index: currentMonthIndex, 
          animated: false 
        });
      }, 100);
    }
  }, [currentMonthIndex]);


  // Рассчитываем статистику для активного месяца
  const monthStats = useMemo(() => {
    if (!activeMonthId) return null;
    
    const [year, month] = activeMonthId.split('-').map(Number);
    
    // Фильтруем домашние задания за месяц
    const monthHomework = homework.filter(hw => {
      const hwDate = dayjs(hw.due_date);
      return hwDate.year() === year && hwDate.month() + 1 === month;
    });
    
    // Фильтруем контрольные/проверочные за месяц
    const controlAndTestWorks = exams.filter(exam => {
      const examDate = dayjs(exam.date);
      const isInMonth = examDate.year() === year && examDate.month() + 1 === month;
      if (!isInMonth) return false;
      
      return isControlWork(exam.type) || isTestWork(exam.type);
    });
    
    return {
      controlAndTestWorks: controlAndTestWorks.length,
      homework: monthHomework.length,
    };
  }, [activeMonthId, homework, exams]);


  // Обработчик изменения видимых элементов
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      // Берем первый видимый элемент (который больше всего виден)
      const firstVisible = viewableItems[0];
      if (firstVisible?.item) {
        setActiveMonthId(firstVisible.item.id);
      }
    }
  }).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Заголовок страницы */}
      <View style={[styles.header, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Календарь</Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={months}
        keyExtractor={(item) => item.id}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={currentMonthIndex >= 0 ? currentMonthIndex : 0}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ 
              index: info.index, 
              animated: false 
            });
          }, 100);
        }}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={styles.monthContainer}>
            <MonthItem
              item={item}
              isActive={activeMonthId === item.id}
              selected={selected}
              markedDates={markedDates}
              onDayPress={(day) => {
                setSelected(day.dateString);
                router.push(`/date-details?date=${day.dateString}`);
              }}
            />
          </View>
        )}
      />
      
      {/* Статистика для активного месяца */}
      {activeMonthId && monthStats && (
        <View style={styles.statsWrapper}>
          <MonthStats stats={monthStats} />
        </View>
      )}
    </SafeAreaView>
  );
}


const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.bgPrimary,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Typography.fonts.heading,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 0,
  },
  monthContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    width: SCREEN_WIDTH - (SIDE_PADDING * 2),
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SIDE_PADDING,
  },
  monthBlock: {
    backgroundColor: colors.surface,
    width: '100%',
    borderRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    overflow: 'hidden',
    minHeight: 360,
  },
  monthBlockActive: {
    shadowColor: colors.textPrimary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  monthTitle: {
    fontSize: 28,
    marginBottom: 8,
    marginLeft: 10,
    color: colors.textPrimary,
    fontFamily: Typography.fonts.body,
  },
  calendarWrapper: {
    width: '100%',
  },
  statsWrapper: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 96,
    paddingTop: 0,
    marginTop: -52,
  },
  statsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statsHeaderLine: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  legendInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legendInlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
  },
  statsDualPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 88,
  },
  statCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statsDualDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
});
