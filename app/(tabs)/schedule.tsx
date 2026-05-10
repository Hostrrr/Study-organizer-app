import LessonContainer from '@/components/LessonContainer';
import PrimaryFab from '@/components/ui/primary-fab';
import SummaryCard from '@/components/SummaryCard';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WEEK_DAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

// Компонент для дня с анимацией сводки
interface DayItemProps {
  item: {
    id: string;
    date: Date;
    dateString: string;
    dayOfWeek: number;
    dayName: string;
    dayNum: number;
    monthName: string;
    isToday: boolean;
  };
  index: number;
  isActive: boolean;
  lessons: any[];
  homework: any[];
  allHomework: any[];
  exams: any[];
  settings: any;
  currentWeekNumber: number | null;
}

const DayItem = React.memo(({ 
  item, 
  index, 
  isActive, 
  lessons, 
  homework, 
  allHomework, 
  exams, 
  settings, 
  currentWeekNumber 
}: DayItemProps) => {
  const { colors, isDark } = useAppTheme();
  // Фильтруем уроки для этого дня с учетом недели
  const itemLessons = lessons.filter(lesson => {
    if (lesson.day_of_week !== item.dayOfWeek) return false;
    
    if (settings.scheduleFormat === 1) {
      return lesson.week_number === null || lesson.week_number === undefined;
    }
    
    if (settings.scheduleFormat === 2) {
      return lesson.week_number === null || lesson.week_number === undefined || lesson.week_number === currentWeekNumber;
    }
    
    return true;
  });
  
  // Фильтруем домашние задания по урокам этого дня (по lesson_id)
  const lessonIds = new Set(itemLessons.map(lesson => lesson.id));
  const itemHomework = homework.filter(hw => lessonIds.has(hw.lesson_id));
  
  const scaleAnim = useRef(new Animated.Value(isActive ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.05 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isActive, scaleAnim]);

  return (
    <View style={[styles.dayContainer, { width: SCREEN_WIDTH }]}>
      <View style={styles.dayContentWrapper}>
        <ScrollView 
          style={[styles.scrollViewContainer, { backgroundColor: colors.bgPrimary }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Сводка в белом прямоугольнике с анимацией */}
          <Animated.View 
            style={[
              styles.summaryWrapper,
              { backgroundColor: colors.surface },
              {
                transform: [{ scale: scaleAnim }],
              },
              isActive && [
              styles.summaryWrapperActive,
              isDark && styles.summaryWrapperActiveDark,
              { shadowColor: colors.textPrimary },
            ],
            ]}
          >
            <SummaryCard 
              date={item.date}
              lessons={itemLessons}
              homework={itemHomework}
              allHomework={allHomework}
              exams={exams}
            />
          </Animated.View>

          {/* Расписание */}
          <LessonContainer 
            lessons={itemLessons} 
            homework={itemHomework} 
            exams={exams} 
            targetDate={item.dateString} 
          />
        </ScrollView>
      </View>
    </View>
  );
});

DayItem.displayName = 'DayItem';

export default function ScheduleScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  // Используем хуки для получения данных
  const { lessons, reload: reloadLessons } = useLessons();
  const { homework, reload: reloadHomework } = useHomework();
  const { exams } = useExams();
  const { settings } = useScheduleSettings();

  // Вычисляем номер текущей недели (0 или 1) для формата "две недели"
  // Используем начало учебного года (1 сентября) как точку отсчета
  const getCurrentWeekNumber = useCallback((): number | null => {
    if (settings.scheduleFormat === 1) {
      return null; // Формат "одна неделя"
    }
    
    // Для формата "две недели" вычисляем четность недели от начала учебного года
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 8, 1); // 1 сентября
    
    // Если текущая дата раньше 1 сентября, используем прошлый год
    if (now < startOfYear) {
      startOfYear.setFullYear(currentYear - 1);
    }
    
    const diffTime = now.getTime() - startOfYear.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) % 2;
    
    return weekNumber;
  }, [settings.scheduleFormat]);

  const currentWeekNumber = useMemo(() => getCurrentWeekNumber(), [getCurrentWeekNumber]);
  
  // Создаем массив дней (7 дней: 3 назад, сегодня, 3 вперед)
  const daysList = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const dayOfWeekForLessons = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      days.push({
        id: dateString,
        date: date,
        dateString,
        dayOfWeek: dayOfWeekForLessons,
        dayName: WEEK_DAYS[dayOfWeek],
        dayNum: date.getDate(),
        monthName: MONTHS[date.getMonth()],
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Индекс сегодняшнего дня (середина списка)
  const todayIndex = 3;
  const [currentIndex, setCurrentIndex] = useState(todayIndex);
  const flatListRef = useRef<FlatList>(null);

  // Текущий выбранный день
  const currentDay = daysList[currentIndex];

  // Загружаем все данные при монтировании и при возврате на экран
  useEffect(() => {
    reloadLessons();
    reloadHomework();
  }, [reloadLessons, reloadHomework]);

  useFocusEffect(
    useCallback(() => {
      reloadLessons();
      reloadHomework();
    }, [reloadLessons, reloadHomework])
  );

  // Фильтруем уроки для выбранного дня
  const dayLessons = useMemo(() => {
    if (!currentDay) return [];
    return lessons.filter(lesson => {
      if (lesson.day_of_week !== currentDay.dayOfWeek) return false;
      
      // Если формат "одна неделя", показываем все уроки
      if (settings.scheduleFormat === 1) {
        return lesson.week_number === null || lesson.week_number === undefined;
      }
      
      // Если формат "две недели", показываем уроки для текущей недели или без привязки
      if (settings.scheduleFormat === 2) {
        return lesson.week_number === null || lesson.week_number === undefined || lesson.week_number === currentWeekNumber;
      }
      
      return true;
    });
  }, [lessons, currentDay, settings.scheduleFormat, currentWeekNumber]);

  // Получаем домашние задания для выбранного дня
  const dayHomework = useMemo(() => {
    if (!currentDay) return [];
    return homework.filter(hw => hw.due_date === currentDay.dateString);
  }, [homework, currentDay]);

  // Форматируем заголовок
  const headerTitle = useMemo(() => {
    if (!currentDay) return 'Сегодня';
    if (currentDay.isToday) return 'Сегодня';
    const diff = currentIndex - todayIndex;
    if (diff === -1) return 'Вчера';
    if (diff === 1) return 'Завтра';
    return `${currentDay.dayNum} ${currentDay.monthName}`;
  }, [currentDay, currentIndex, todayIndex]);

  const renderDay = ({ item, index }: { item: typeof daysList[0]; index: number }) => {
    const isActive = index === currentIndex;
    
    return (
      <DayItem
        item={item}
        index={index}
        isActive={isActive}
        lessons={lessons}
        homework={homework}
        allHomework={homework}
        exams={exams}
        settings={settings}
        currentWeekNumber={currentWeekNumber}
      />
    );
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / event.nativeEvent.layoutMeasurement.width);
    if (index !== currentIndex && index >= 0 && index < daysList.length) {
      setCurrentIndex(index);
    }
  };

  // Прокручиваем к сегодняшнему дню при монтировании
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: todayIndex, animated: false });
    }, 100);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['bottom', 'left', 'right']}>
      {/* Заголовок: явный отступ от статус-бара (на табах верхний inset часто уже «съеден» навигатором) */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgPrimary, paddingTop: insets.top + 12 },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{headerTitle}</Text>
      </View>

      {/* Горизонтальная прокрутка дней */}
      <FlatList
        ref={flatListRef}
        data={daysList}
        renderItem={({ item, index }) => renderDay({ item, index })}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        initialScrollIndex={todayIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
      />

      <PrimaryFab
        onPress={() => {
          if (currentDay) {
            router.push({
              pathname: '/add-homework',
              params: { date: currentDay.dateString },
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: Typography.fonts.heading,
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dayContentWrapper: {
    flex: 1,
    width: '100%',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 100,
  },
  summaryWrapper: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryWrapperActive: {
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryWrapperActiveDark: {
    shadowOpacity: 0.45,
  },
});