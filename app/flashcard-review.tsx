import { logReviewSession } from '@/hooks/use-streak';
import { useFlashcards } from '@/hooks/use-flashcards';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Flashcard } from '@/types/db';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function parseOptionalInt(v: string | string[] | undefined): number | undefined {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default function FlashcardReviewScreen() {
  const { colors } = useAppTheme();
  const { subjectId, mode: modeParam } = useLocalSearchParams<{ subjectId?: string; mode?: string }>();
  const subjectIdNum = useMemo(() => parseOptionalInt(subjectId), [subjectId]);
  const mode = useMemo(() => {
    const m = Array.isArray(modeParam) ? modeParam[0] : modeParam;
    return m ?? undefined;
  }, [modeParam]);

  const { dueToday, flashcards, reviewCard } = useFlashcards(subjectIdNum);

  const sessionCards = useMemo<Flashcard[]>(() => {
    if (mode === 'all') {
      return subjectIdNum !== undefined
        ? flashcards.filter(c => c.subject_id === subjectIdNum)
        : flashcards;
    }
    const dueIds = new Set(dueToday.map(c => c.id));
    const pool =
      subjectIdNum !== undefined
        ? flashcards.filter(c => c.subject_id === subjectIdNum)
        : dueToday;
    const extended =
      subjectIdNum !== undefined
        ? pool.filter(c => dueIds.has(c.id) || !c.next_review)
        : dueToday;
    return extended.length > 0 ? extended : pool.slice(0, 20);
  }, [dueToday, flashcards, subjectIdNum, mode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [stats, setStats] = useState({ forgot: 0, hard: 0, good: 0, easy: 0 });

  const flipAnim = useRef(new Animated.Value(0)).current;
  const sessionLoggedRef = useRef(false);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const flipCard = useCallback(() => {
    if (isFlipped) {
      Animated.spring(flipAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.spring(flipAnim, { toValue: 180, useNativeDriver: true }).start();
    }
    setIsFlipped(prev => !prev);
  }, [isFlipped, flipAnim]);

  const handleRate = useCallback(
    (rating: 0 | 1 | 3 | 5) => {
      const card = sessionCards[currentIndex];
      if (!card) return;

      if (mode !== 'all') {
        reviewCard(card.id, rating, card.interval, card.ease_factor);
      }

      setStats(prev => ({
        ...prev,
        forgot: rating === 0 ? prev.forgot + 1 : prev.forgot,
        hard: rating === 1 ? prev.hard + 1 : prev.hard,
        good: rating === 3 ? prev.good + 1 : prev.good,
        easy: rating === 5 ? prev.easy + 1 : prev.easy,
      }));

      const next = currentIndex + 1;
      if (next >= sessionCards.length) {
        setSessionDone(true);
        if (mode !== 'all' && !sessionLoggedRef.current) {
          sessionLoggedRef.current = true;
          const total = stats.forgot + stats.hard + stats.good + stats.easy + 1;
          logReviewSession(total, subjectIdNum);
        }
      } else {
        setCurrentIndex(next);
        setIsFlipped(false);
        flipAnim.setValue(0);
      }
    },
    [currentIndex, sessionCards, reviewCard, flipAnim, stats, subjectIdNum, mode]
  );

  if (sessionCards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Повторение</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={72} color={colors.accent} />
          <Text style={styles.emptyTitle}>Всё повторено!</Text>
          <Text style={styles.emptySubtext}>Нет карточек для повторения сегодня</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionDone) {
    const total = stats.forgot + stats.hard + stats.good + stats.easy;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Результаты</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.resultsContainer}>
          <Ionicons name="trophy-outline" size={72} color={colors.accent} />
          <Text style={styles.resultsTitle}>Сессия завершена</Text>
          <Text style={styles.resultsSubtitle}>Повторено карточек: {total}</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCell, styles.statForgot]}>
              <Text style={styles.statNumber}>{stats.forgot}</Text>
              <Text style={styles.statLabel}>Забыл</Text>
            </View>
            <View style={[styles.statCell, styles.statHard]}>
              <Text style={styles.statNumber}>{stats.hard}</Text>
              <Text style={styles.statLabel}>Сложно</Text>
            </View>
            <View style={[styles.statCell, styles.statGood]}>
              <Text style={styles.statNumber}>{stats.good}</Text>
              <Text style={styles.statLabel}>Хорошо</Text>
            </View>
            <View style={[styles.statCell, styles.statEasy]}>
              <Text style={styles.statNumber}>{stats.easy}</Text>
              <Text style={styles.statLabel}>Легко</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Готово</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const card = sessionCards[currentIndex];
  const progress = (currentIndex / sessionCards.length) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentIndex + 1} / {sessionCards.length}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>

      {/* Card */}
      <View style={styles.cardArea}>
        <TouchableOpacity onPress={flipCard} activeOpacity={0.9} style={styles.cardTouchable}>
          {/* Front side */}
          <Animated.View
            style={[
              styles.card,
              styles.cardFront,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Text style={styles.cardSideLabel}>Вопрос</Text>
            <Text style={styles.cardText}>{card.front}</Text>
            <Text style={styles.tapHint}>Нажмите чтобы перевернуть</Text>
          </Animated.View>

          {/* Back side */}
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <Text style={styles.cardSideLabel}>Ответ</Text>
            <Text style={styles.cardText}>{card.back}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Rating buttons — only shown after flip */}
      {isFlipped ? (
        <View style={styles.ratingRow}>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingForgot]} onPress={() => handleRate(0)} activeOpacity={0.8}>
            <Text style={styles.ratingBtnText}>Забыл</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingHard]} onPress={() => handleRate(1)} activeOpacity={0.8}>
            <Text style={styles.ratingBtnText}>Сложно</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingGood]} onPress={() => handleRate(3)} activeOpacity={0.8}>
            <Text style={styles.ratingBtnText}>Хорошо</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ratingBtn, styles.ratingEasy]} onPress={() => handleRate(5)} activeOpacity={0.8}>
            <Text style={styles.ratingBtnText}>Легко</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ratingPlaceholder}>
          <Text style={styles.ratingPlaceholderText}>Оцените после просмотра ответа</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: { width: 44, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },

  progressTrack: { height: 4, backgroundColor: '#1a1a1a', marginHorizontal: 16, borderRadius: 2, marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: '#C89153', borderRadius: 2 },

  cardArea: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  cardTouchable: { width: '100%', maxWidth: 380, aspectRatio: 1.5 },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardFront: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a' },
  cardBack: { backgroundColor: '#1a2a1a', borderWidth: 1, borderColor: '#2a3a2a' },
  cardSideLabel: { fontSize: 12, color: '#666', fontWeight: '600', letterSpacing: 1, marginBottom: 16 },
  cardText: { fontSize: 20, color: '#fff', fontWeight: '600', textAlign: 'center', lineHeight: 28 },
  tapHint: { position: 'absolute', bottom: 20, fontSize: 12, color: '#444' },

  ratingRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ratingForgot: { backgroundColor: '#3a1a1a' },
  ratingHard: { backgroundColor: '#2a2a1a' },
  ratingGood: { backgroundColor: '#1a2a2a' },
  ratingEasy: { backgroundColor: '#1a3a1a' },
  ratingBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  ratingPlaceholder: { paddingBottom: 32, alignItems: 'center' },
  ratingPlaceholderText: { fontSize: 13, color: '#444' },

  // Empty / done states
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 16, fontFamily: Typography.fonts.body },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },

  resultsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  resultsTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 16, fontFamily: Typography.fonts.body },
  resultsSubtitle: { fontSize: 14, color: '#999', marginTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 32, justifyContent: 'center' },
  statCell: { width: 120, borderRadius: 16, padding: 16, alignItems: 'center' },
  statForgot: { backgroundColor: '#3a1a1a' },
  statHard: { backgroundColor: '#2a2a1a' },
  statGood: { backgroundColor: '#1a2a2a' },
  statEasy: { backgroundColor: '#1a3a1a' },
  statNumber: { fontSize: 36, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 13, color: '#aaa', marginTop: 4 },

  doneBtn: {
    marginTop: 32,
    backgroundColor: '#C89153',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
