import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { useTasks } from '@/hooks/use-tasks';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import dayjs from 'dayjs';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// Локализация
LocaleConfig.locales['ru'] = {
  monthNames: [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ],
  monthNamesShort: [
    'Янв','Фев','Мар','Апр','Май','Июн',
    'Июл','Авг','Сен','Окт','Ноя','Дек'
  ],
  dayNames: [
    'Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'
  ],
  dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  firstDayOfWeek: 1, // Начинаем неделю с понедельника
};
LocaleConfig.defaultLocale = 'ru';

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
  selectedDateEvents: {
    tasks: any[];
    homework: any[];
    exams: any[];
    total: number;
  };
  markedDates: any;
  onDayPress: (day: any) => void;
}

const MonthItem = React.memo(({ 
  item, 
  isActive, 
  selected, 
  selectedDateEvents, 
  markedDates, 
  onDayPress 
}: MonthItemProps) => {
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
      <Text style={styles.monthTitle}>
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
            calendarBackground: '#fff',
            textSectionTitleColor: '#000',
            monthTextColor: 'transparent',
            textMonthFontSize: 1,
            textMonthFontFamily: 'serif',
            textDayFontFamily: 'serif',
            textDayHeaderFontFamily: 'serif',
            todayTextColor: '#C89153',
            arrowColor: '#C89153',
            textDayFontSize: 14,
            textDayHeaderFontSize: 12,
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
  if (!stats) return null;

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Статистика месяца</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Контрольные/проверочные</Text>
          <Text style={styles.statValue}>
            {stats.controlAndTestWorks}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Домашние задания</Text>
          <Text style={styles.statValue}>
            {stats.homework}
          </Text>
        </View>
      </View>
    </View>
  );
});

MonthStats.displayName = 'MonthStats';

export default function CalendarScreen() {
  const [selected, setSelected] = useState(dayjs().format("YYYY-MM-DD"));
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // Используем хуки для получения данных
  const { tasks, reload: reloadTasks } = useTasks();
  const { homework, reload: reloadHomework } = useHomework();
  const { exams, reload: reloadExams } = useExams();
  const { settings } = useScheduleSettings();

  // Перезагружаем данные для обновления статистики при смене месяца
  useEffect(() => {
    reloadTasks();
    reloadHomework();
    reloadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonthId]);

  // Перезагружаем данные при возврате на экран
  useFocusEffect(
    useCallback(() => {
      reloadTasks();
      reloadHomework();
      reloadExams();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Получаем события на выбранную дату
  const selectedDateEvents = useMemo(() => {
    const selectedTasks = tasks.filter(task => task.date === selected);
    const selectedHomework = homework.filter(hw => hw.due_date === selected);
    const selectedExams = exams.filter(exam => exam.date === selected);
    
    return {
      tasks: selectedTasks,
      homework: selectedHomework,
      exams: selectedExams,
      total: selectedTasks.length + selectedHomework.length + selectedExams.length
    };
  }, [tasks, homework, exams, selected]);

  // Подготовка markedDates с событиями в виде точек
  const markedDates = useMemo(() => {
    const marked: any = {};
    const dateEvents: Record<string, { hasHomework: boolean; hasControlWork: boolean; hasTestWork: boolean }> = {};

    // Собираем все события по датам
    homework.forEach(hw => {
      if (hw.due_date) {
        if (!dateEvents[hw.due_date]) {
          dateEvents[hw.due_date] = { hasHomework: false, hasControlWork: false, hasTestWork: false };
        }
        dateEvents[hw.due_date].hasHomework = true;
      }
    });

    exams.forEach(exam => {
      if (exam.date) {
        if (!dateEvents[exam.date]) {
          dateEvents[exam.date] = { hasHomework: false, hasControlWork: false, hasTestWork: false };
        }
        if (isControlWork(exam.type)) {
          dateEvents[exam.date].hasControlWork = true;
        } else if (isTestWork(exam.type)) {
          dateEvents[exam.date].hasTestWork = true;
        }
      }
    });

    // Создаем разметку для каждой даты с событиями
    Object.keys(dateEvents).forEach(date => {
      const events = dateEvents[date];
      const dots: { key: string; color: string }[] = [];

      if (events.hasHomework) {
        dots.push({ key: 'homework', color: '#4CAF50' });
      }
      if (events.hasControlWork) {
        dots.push({ key: 'control', color: '#E25A2C' });
      }
      if (events.hasTestWork) {
        dots.push({ key: 'test', color: '#FFC107' });
      }

      marked[date] = {
        dots: dots,
        selected: date === selected,
        selectedColor: date === selected ? '#C89153' : undefined,
        selectedTextColor: date === selected ? '#fff' : undefined,
        selectedDotColor: date === selected ? '#fff' : undefined,
      };
    });

    // Отмечаем выбранную дату, даже если на ней нет событий
    if (selected && !marked[selected]) {
      marked[selected] = {
        selected: true,
        selectedColor: '#C89153',
        selectedTextColor: '#fff',
      };
    }

    return marked;
  }, [homework, exams, selected]);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Заголовок страницы */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Календарь</Text>
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
              selectedDateEvents={selectedDateEvents}
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Glanz',
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
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    overflow: 'hidden',
    minHeight: 360,
  },
  monthBlockActive: {
    shadowColor: '#000',
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
    color: '#000',
    fontFamily: 'serif',
  },
  calendarWrapper: {
    width: '100%',
  },
  statsWrapper: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 80,
    paddingTop: 0,
    marginTop: -20,
  },
  statsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    fontFamily: 'serif',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statItem: {
    minWidth: '45%',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
    fontFamily: 'serif',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C89153',
    fontFamily: 'serif',
  },
});
