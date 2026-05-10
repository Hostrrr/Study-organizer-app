import AssessmentActions from '@/components/assessment-actions';
import PrimaryFab from '@/components/ui/primary-fab';
import { Typography } from '@/constants/theme';
import { clearDebugData, runDebugSeeds } from '@/database/debug-seeds';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAssessmentActions } from '@/hooks/use-assessment-actions';
import { useExams } from '@/hooks/use-exams';
import { useFlashcards } from '@/hooks/use-flashcards';
import { useGrades } from '@/hooks/use-grades';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useNotesV2 } from '@/hooks/use-notes-v2';
import { useStreak } from '@/hooks/use-streak';
import { useSubjects } from '@/hooks/use-subjects';
import { useVaultSettings } from '@/hooks/use-vault-settings';
import { Exam, Flashcard, Homework, Lesson, NoteV2, Subject } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, useFocusEffect, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SubjectGroup {
  subject: Subject | null;
  controlWorks: Exam[];
  testWorks: Exam[];
  homework: Homework[];
  notesV2: NoteV2[];
}

type SectionType = 'control' | 'test' | 'homework' | 'notesV2';
type ScreenTab = 'notes' | 'analytics' | 'cards';

export default function NotesScreen() {
  const { colors, isDark } = useAppTheme();
  const { notes: notesV2, removeNote: removeNoteV2, reload: reloadNotesV2 } = useNotesV2();
  const { subjects } = useSubjects();
  const { lessons } = useLessons();
  const { exams, reload: reloadExams, remove: removeExam } = useExams();
  const { homework, reload: reloadHomework, remove: removeHomework, toggle: toggleHomework } = useHomework();
  const { grades, reload: reloadGrades } = useGrades();
  const { setExamDone, setExamGrade, deleteExamEntry } = useAssessmentActions();
  const [gradingExamId, setGradingExamId] = useState<number | null>(null);
  const { flashcards, dueToday, reload: reloadFlashcards } = useFlashcards();
  const { streak, last7Days: streakDays } = useStreak();
  const { vaultEnabled } = useVaultSettings();
  const canUseLiquidGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  const [activeTab, setActiveTab] = useState<ScreenTab>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null | 'null' | 'none'>('none');

  const noteEditorHref = '/note-editor' as Href;
  const scrollViewRef = useRef<ScrollView>(null);
  const showDebugSeedActions = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEBUG_SEEDS === 'true';

  const closeSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
  }, []);

  const handleSeedNow = useCallback(() => {
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
            Alert.alert(result.ok ? 'Готово' : 'Ошибка', result.message);
          },
        },
      ]
    );
  }, []);

  const handleClearAllData = useCallback(() => {
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
            Alert.alert(result.ok ? 'Готово' : 'Ошибка', result.message);
          },
        },
      ]
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadNotesV2();
      reloadExams();
      reloadHomework();
      reloadGrades();
      reloadFlashcards();
    }, [reloadExams, reloadFlashcards, reloadGrades, reloadHomework, reloadNotesV2])
  );

  const lessonsMap = useMemo(() => {
    const map = new Map<number, Lesson>();
    lessons.forEach(l => map.set(l.id, l));
    return map;
  }, [lessons]);

  const subjectsMap = useMemo(() => {
    const map = new Map<number, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const subjectGroups = useMemo(() => {
    const groups = new Map<number | null, SubjectGroup>();
    subjects.forEach(s => groups.set(s.id, { subject: s, controlWorks: [], testWorks: [], homework: [], notesV2: [] }));
    groups.set(null, { subject: null, controlWorks: [], testWorks: [], homework: [], notesV2: [] });

    notesV2.forEach(note => {
      const key = note.subject_id || null;
      (groups.get(key) || groups.get(null)!).notesV2.push(note);
    });

    exams.forEach(exam => {
      const g = groups.get(exam.subject_id) || groups.get(null)!;
      if (isControlWork(exam.type)) g.controlWorks.push(exam);
      else if (isTestWork(exam.type)) g.testWorks.push(exam);
    });

    homework.forEach(hw => {
      const lesson = lessonsMap.get(hw.lesson_id);
      const key = lesson?.subject_id || null;
      (groups.get(key) || groups.get(null)!).homework.push(hw);
    });

    groups.forEach(g => {
      g.notesV2.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      g.controlWorks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      g.testWorks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      g.homework.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    });

    return Array.from(groups.values())
      .filter(g => g.notesV2.length > 0 || g.controlWorks.length > 0 || g.testWorks.length > 0 || g.homework.length > 0)
      .sort((a, b) => {
        if (!a.subject) return 1;
        if (!b.subject) return -1;
        return a.subject.name.localeCompare(b.subject.name);
      });
  }, [notesV2, exams, homework, subjects, lessonsMap]);

  const sortedSubjectGroups = useMemo(() => {
    const sorted = [...subjectGroups];
    if (expandedSubjectId !== 'none') {
      const target = expandedSubjectId === 'null' ? null : expandedSubjectId;
      const idx = sorted.findIndex(g => (g.subject?.id ?? null) === target);
      if (idx >= 0) {
        const [item] = sorted.splice(idx, 1);
        sorted.unshift(item);
      }
    }
    return sorted;
  }, [subjectGroups, expandedSubjectId]);

  const displayedGroups = useMemo(() => {
    if (!searchQuery) return sortedSubjectGroups;
    return sortedSubjectGroups
      .map(g => ({
        ...g,
        notesV2: g.notesV2.filter(note => {
          const q = searchQuery.toLowerCase();
          return !searchQuery ||
            note.title.toLowerCase().includes(q) ||
            note.body.toLowerCase().includes(q);
        }),
      }))
      .filter(g => g.notesV2.length > 0 || g.controlWorks.length > 0 || g.testWorks.length > 0 || g.homework.length > 0);
  }, [sortedSubjectGroups, searchQuery]);

  // Analytics computations
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const gradesBySubject = useMemo(() => {
    const map = new Map<number, number[]>();
    grades.forEach(g => {
      if (!map.has(g.subject_id)) map.set(g.subject_id, []);
      map.get(g.subject_id)!.push(g.grade);
    });
    return Array.from(map.entries())
      .map(([id, gs]) => ({ subject: subjectsMap.get(id), avg: gs.reduce((s, v) => s + v, 0) / gs.length }))
      .filter((e): e is { subject: Subject; avg: number } => e.subject !== undefined)
      .sort((a, b) => b.avg - a.avg);
  }, [grades, subjectsMap]);

  const hwStats = useMemo(() => {
    const total = homework.length;
    const done = homework.filter(h => h.is_completed === 1).length;
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [homework]);

  const upcomingExams = useMemo(() => exams
    .filter(e => new Date(e.date) >= today && e.is_completed !== 1)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5),
  [exams, today]);

  const notesBySubject = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    subjects.forEach(s => map.set(`s${s.id}`, { name: s.name, count: 0 }));
    map.set('null', { name: 'Без предмета', count: 0 });
    notesV2.forEach(n => {
      const key = n.subject_id ? `s${n.subject_id}` : 'null';
      const entry = map.get(key) || map.get('null')!;
      entry.count++;
    });
    return Array.from(map.values()).filter(v => v.count > 0).sort((a, b) => b.count - a.count);
  }, [notesV2, subjects]);

  const examReadiness = useMemo(() => {
    return upcomingExams.map(exam => {
      const subject = subjectsMap.get(exam.subject_id);
      const daysLeft = Math.ceil(
        (new Date(exam.date).getTime() - today.getTime()) / 86400000
      );
      const subjectCards = flashcards.filter(c => c.subject_id === exam.subject_id);
      const dueCards = subjectCards.filter(c => {
        if (!c.next_review) return true;
        const rev = new Date(c.next_review);
        rev.setHours(0, 0, 0, 0);
        return rev <= today;
      }).length;
      const totalCards = subjectCards.length;
      const readyPercent = totalCards > 0
        ? Math.round(((totalCards - dueCards) / totalCards) * 100)
        : 0;
      const cardsPerDay = daysLeft > 0 ? Math.ceil(dueCards / daysLeft) : dueCards;
      const isOnTrack = daysLeft > 0 && cardsPerDay <= 20;
      return { exam, subject, daysLeft, totalCards, dueCards, readyPercent, cardsPerDay, isOnTrack };
    });
  }, [upcomingExams, flashcards, subjectsMap, today]);

  const maxGrade = 5;
  const maxNoteCount = notesBySubject.length > 0 ? notesBySubject[0].count : 1;

  // Cards by subject
  const flashcardsBySubject = useMemo(() => {
    const map = new Map<number | null, { subject: Subject | null; cards: Flashcard[] }>();
    subjects.forEach(s => map.set(s.id, { subject: s, cards: [] }));
    map.set(null, { subject: null, cards: [] });
    flashcards.forEach(c => {
      const key = c.subject_id ?? null;
      (map.get(key) || map.get(null)!).cards.push(c);
    });
    return Array.from(map.values())
      .filter(v => v.cards.length > 0)
      .sort((a, b) => {
        if (!a.subject) return 1;
        if (!b.subject) return -1;
        return a.subject.name.localeCompare(b.subject.name);
      });
  }, [flashcards, subjects]);

  // Handlers
  const toggleSubject = (subjectId: number | null) => {
    const normalizedId = subjectId === null ? 'null' : subjectId;
    if (expandedSubjectId === normalizedId) {
      setExpandedSubjectId('none');
    } else {
      setExpandedSubjectId(normalizedId);
      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
    }
  };

  const toggleSection = (subjectId: number | null, sectionType: SectionType) => {
    const key = `${subjectId}-${sectionType}`;
    const next = new Set(expandedSections);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedSections(next);
  };

  const isSectionExpanded = (subjectId: number | null, sectionType: SectionType) =>
    expandedSections.has(`${subjectId}-${sectionType}`);

  const handleDeleteNoteV2 = (id: number) =>
    Alert.alert('Удалить заметку', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeNoteV2(id) },
    ]);

  const handleDeleteExam = (id: number) =>
    Alert.alert('Удалить', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeExam(id) },
    ]);

  const handleDeleteHomework = (id: number) =>
    Alert.alert('Удалить', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => removeHomework(id) },
    ]);

  // Render helpers
  const renderNoteV2 = ({ item }: { item: NoteV2 }) => {
    const formattedDate = new Date(item.updated_at).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const bodyPreview = item.body.replace(/\s+/g, ' ').replace(/[#>*_`~-]/g, '').trim();
    return (
      <TouchableOpacity
        style={[styles.noteCard, styles.noteCardV2]}
        onPress={() => router.push({ pathname: '/note-editor', params: { noteId: String(item.id) } })}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <View style={styles.noteMetaLeft}>
            <Text style={styles.noteDate}>{formattedDate}</Text>
            <View style={styles.noteV2Label}><Text style={styles.noteV2LabelText}>MD</Text></View>
          </View>
          <TouchableOpacity
            onPress={e => { e.stopPropagation(); handleDeleteNoteV2(item.id); }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.noteTitleV2} numberOfLines={1}>{item.title || 'Без названия'}</Text>
        <Text style={styles.noteBodyPreview} numberOfLines={2}>{bodyPreview || 'Без текста'}</Text>
      </TouchableOpacity>
    );
  };

  const renderExam = (exam: Exam) => {
    const formattedDate = new Date(exam.date).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const isCompleted = exam.is_completed === 1;
    return (
      <TouchableOpacity
        key={exam.id}
        style={[styles.examCard, isCompleted && styles.examCardCompleted]}
        onLongPress={() => handleDeleteExam(exam.id)}
        activeOpacity={0.7}
      >
        <View style={styles.examHeader}>
          <View style={styles.examHeaderLeft}>
            <Text style={[styles.examDate, isCompleted && styles.examTextCompleted]}>{formattedDate}</Text>
            {exam.room && (
              <Text style={[styles.examRoom, isCompleted && styles.examTextCompleted]}>
                Аудитория: {exam.room}
              </Text>
            )}
          </View>
          <AssessmentActions
            exam={exam}
            compact
            expanded={gradingExamId === exam.id}
            onToggleExpanded={() => setGradingExamId(gradingExamId === exam.id ? null : exam.id)}
            onToggleDone={(currentExam, done) => {
              setExamDone(currentExam.id, done);
            }}
            onDelete={(currentExam) => {
              deleteExamEntry(currentExam.id);
            }}
            onSetGrade={(currentExam, grade) =>
              setExamGrade({ exam: currentExam, subjectId: currentExam.subject_id, grade })
            }
          />
        </View>
        <Text style={[styles.examType, isCompleted && styles.examTextCompleted]}>{exam.type}</Text>
      </TouchableOpacity>
    );
  };

  const renderHomeworkItem = (hw: Homework) => {
    const formattedDate = new Date(hw.due_date).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const lesson = lessonsMap.get(hw.lesson_id);
    const isCompleted = hw.is_completed === 1;
    return (
      <TouchableOpacity
        key={hw.id}
        style={[styles.homeworkCard, isCompleted && styles.homeworkCardCompleted]}
        onLongPress={() => handleDeleteHomework(hw.id)}
        activeOpacity={0.7}
      >
        <View style={styles.homeworkHeader}>
          <View style={styles.homeworkHeaderLeft}>
            <Text style={[styles.homeworkTitle, isCompleted && styles.homeworkTextCompleted]}>{hw.title}</Text>
            <Text style={[styles.homeworkDate, isCompleted && styles.homeworkTextCompleted]}>Срок: {formattedDate}</Text>
            {lesson && (
              <Text style={[styles.homeworkLesson, isCompleted && styles.homeworkTextCompleted]}>
                Урок: {lesson.subject_name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => toggleHomework(hw.id, !isCompleted)}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
              {isCompleted && <Ionicons name="checkmark" size={16} color={colors.inverseText} />}
            </View>
          </TouchableOpacity>
        </View>
        {hw.description ? (
          <Text style={[styles.homeworkDescription, isCompleted && styles.homeworkTextCompleted]} numberOfLines={3}>
            {hw.description}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSection = (
    subjectId: number | null,
    sectionType: SectionType,
    title: string,
    count: number,
    icon: string,
    controlWorks?: Exam[],
    testWorks?: Exam[],
    hw?: Homework[],
    notesV2Items?: NoteV2[]
  ) => {
    if (count === 0) return null;
    const isExpanded = isSectionExpanded(subjectId, sectionType);
    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(subjectId, sectionType)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderContent}>
            <Ionicons name={icon as any} size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>({count})</Text>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {sectionType === 'control' && controlWorks && <View>{controlWorks.map(renderExam)}</View>}
            {sectionType === 'test' && testWorks && <View>{testWorks.map(renderExam)}</View>}
            {sectionType === 'homework' && hw && <View>{hw.map(renderHomeworkItem)}</View>}
            {sectionType === 'notesV2' && notesV2Items && (
              <FlatList
                data={notesV2Items}
                renderItem={renderNoteV2}
                keyExtractor={n => n.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  // Subject card component — defined inside to access render helpers via closure
  const SubjectCard = ({
    item,
    isExpanded,
    onToggle,
  }: {
    item: SubjectGroup;
    isExpanded: boolean;
    onToggle: () => void;
  }) => {
    const subjectId = item.subject?.id || null;
    const subjectName = item.subject?.name || 'Без предмета';
    const totalCount =
      item.notesV2.length + item.controlWorks.length + item.testWorks.length + item.homework.length;
    const animatedOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(animatedOpacity, {
        toValue: isExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [animatedOpacity, isExpanded]);

    return (
      <View
        style={[
          styles.subjectGroup,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            shadowOpacity: isDark ? 0 : 0.25,
          },
          isExpanded ? styles.subjectGroupExpanded : styles.subjectGroupCollapsed,
        ]}
      >
        <TouchableOpacity
          style={[styles.subjectHeader, isExpanded && styles.subjectHeaderExpanded]}
          onPress={() => {
            if (subjectId !== null) {
              router.push({
                pathname: '/subject-details',
                params: { subjectId: String(subjectId) },
              });
              return;
            }
            onToggle();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.subjectHeaderContent}>
            <Text style={[styles.subjectName, { color: colors.textPrimary }]}>{subjectName}</Text>
            <Text style={[styles.subjectHint, { color: colors.textMuted }]}>
              Открыть предмет
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {totalCount > 0 && !isExpanded && (
          <Animated.View style={[styles.countBadge, { opacity: animatedOpacity }]}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </Animated.View>
        )}

        {isExpanded && (
          <View style={styles.sectionsContainer}>
            {renderSection(subjectId, 'control', 'Контрольные', item.controlWorks.length, 'document-text-outline', item.controlWorks)}
            {renderSection(subjectId, 'test', 'Проверочные', item.testWorks.length, 'clipboard-outline', undefined, item.testWorks)}
            {renderSection(subjectId, 'homework', 'Домашние', item.homework.length, 'book-outline', undefined, undefined, item.homework)}
            {renderSection(subjectId, 'notesV2', 'Заметки', item.notesV2.length, 'document-outline', undefined, undefined, undefined, item.notesV2)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Знания</Text>
        <View style={styles.headerActions}>
          {vaultEnabled && (
            <TouchableOpacity
              onPress={() => router.push('/vault-sync')}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsButton} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen-level tab bar */}
      <View style={[styles.tabBar, { borderColor: colors.borderSubtle, borderWidth: 1 }]}>
        {canUseLiquidGlass ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? 'dark' : 'light'}
            tintColor={colors.glassTint}
            glassEffectStyle="regular"
            isInteractive={false}
          />
        ) : (
          <>
            <BlurView
              style={StyleSheet.absoluteFill}
              intensity={isDark ? 45 : 60}
              tint={isDark ? 'dark' : 'light'}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceGlass }]} />
          </>
        )}
        {(['notes', 'analytics', 'cards'] as ScreenTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === 'notes' ? 'document-text-outline' : tab === 'analytics' ? 'stats-chart-outline' : 'flash-outline'}
              size={20}
              color={activeTab === tab ? colors.inverseText : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── NOTES TAB ─── */}
      {activeTab === 'notes' && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Поиск заметок..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {displayedGroups.length > 0 ? (
            <View style={styles.scrollWrapper}>
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.subjectsGrid}>
                  {displayedGroups.map(item => {
                    const subjectId = item.subject?.id ?? null;
                    const normalizedId = subjectId === null ? 'null' : subjectId;
                    const isExpanded = expandedSubjectId !== 'none' && expandedSubjectId === normalizedId;
                    return (
                      <SubjectCard
                        key={subjectId !== null ? `subject-${subjectId}` : 'null-subject'}
                        item={item}
                        isExpanded={isExpanded}
                        onToggle={() => toggleSubject(subjectId)}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Измените поисковый запрос'
                  : 'Нажмите + чтобы добавить заметку'}
              </Text>
            </View>
          )}

          {/* FAB */}
          <PrimaryFab onPress={() => router.push(noteEditorHref)} />
        </>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {activeTab === 'analytics' && (
        <ScrollView
          style={styles.analyticsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.analyticsContent}
        >
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Активность</Text>

            <View style={styles.streakRow}>
              <View style={styles.streakStat}>
                <Text style={styles.streakNumber}>
                  {streak > 0 ? `${streak} 🔥` : '—'}
                </Text>
                <Text style={styles.streakLabel}>дней подряд</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakStat}>
                <Text style={styles.streakNumber}>
                  {streakDays[streakDays.length - 1]?.count ?? 0}
                </Text>
                <Text style={styles.streakLabel}>повторено сегодня</Text>
              </View>
            </View>

            <View style={styles.activityBars}>
              {streakDays.map((day, i) => {
                const isToday = i === streakDays.length - 1;
                const maxCount = Math.max(...streakDays.map(d => d.count), 1);
                const heightPercent =
                  day.count > 0 ? Math.max((day.count / maxCount) * 80, 12) : 4;
                const dayLabel = new Date(day.date).toLocaleDateString('ru-RU', {
                  weekday: 'short',
                });
                return (
                  <View key={i} style={styles.activityBarCol}>
                    <View style={styles.activityBarTrack}>
                      <View
                        style={[
                          styles.activityBarFill,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: isToday
                              ? '#C89153'
                              : day.count > 0
                                ? '#C8915366'
                                : '#EEF1F5',
                            borderRadius: 4,
                          },
                        ]}
                      />
                    </View>
                    {day.count > 0 && (
                      <Text style={styles.activityBarValue}>{day.count}</Text>
                    )}
                    <Text
                      style={[
                        styles.activityBarLabel,
                        isToday && { color: '#C89153', fontWeight: '600' },
                      ]}
                    >
                      {dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Exam readiness forecast */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Прогноз подготовки к экзаменам</Text>
            {upcomingExams.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Нет предстоящих экзаменов</Text>
            ) : (
              examReadiness.map(({ exam, subject, daysLeft, totalCards, dueCards, readyPercent, cardsPerDay, isOnTrack }) => (
                <View key={exam.id} style={styles.readinessItem}>
                  <View style={styles.readinessHeader}>
                    <Text style={styles.readinessSubject}>{subject?.name || 'Неизвестный предмет'}</Text>
                    <Text style={styles.readinessDays}>
                      {daysLeft === 0 ? 'Сегодня' : `Осталось ${daysLeft} дн.`}
                    </Text>
                  </View>
                  {totalCards === 0 ? (
                    <Text style={styles.readinessNoCards}>
                      Нет карточек по предмету — добавьте их из заметок
                    </Text>
                  ) : (
                    <>
                      <View style={styles.readinessProgressTrack}>
                        <View
                          style={[
                            styles.readinessProgressFill,
                            {
                              width: `${readyPercent}%`,
                              backgroundColor: readyPercent >= 80 ? '#4CAF50' : readyPercent >= 50 ? '#C89153' : '#E25A2C',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.readinessCardsText}>
                        {totalCards - dueCards} карточек готово из {totalCards}
                      </Text>
                      <Text style={[styles.readinessPaceText, { color: isOnTrack ? '#4CAF50' : '#E25A2C' }]}>
                        {isOnTrack
                          ? `✓ Успеваете (${cardsPerDay} карточек/день)`
                          : `⚠ Нужно ${cardsPerDay} карточек/день`}
                      </Text>
                    </>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Grades */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Оценки по предметам</Text>
            {gradesBySubject.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Нет данных об оценках</Text>
            ) : (
              gradesBySubject.map(({ subject, avg }) => (
                <View key={subject.id} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{subject.name}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(avg / maxGrade) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.barValue}>{avg.toFixed(1)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Homework completion */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Домашние задания</Text>
            {hwStats.total === 0 ? (
              <Text style={styles.analyticsEmpty}>Нет домашних заданий</Text>
            ) : (
              <>
                <View style={styles.hwProgressRow}>
                  <Text style={styles.hwProgressLabel}>Выполнено {hwStats.done} из {hwStats.total}</Text>
                  <Text style={styles.hwProgressPercent}>{hwStats.percent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${hwStats.percent}%` as any }]} />
                </View>
              </>
            )}
          </View>

          {/* Upcoming exams */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Ближайшие экзамены</Text>
            {upcomingExams.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Нет предстоящих экзаменов</Text>
            ) : (
              upcomingExams.map(exam => {
                const subject = subjectsMap.get(exam.subject_id);
                const daysLeft = Math.ceil(
                  (new Date(exam.date).getTime() - today.getTime()) / 86400000
                );
                return (
                  <View key={exam.id} style={styles.examTimelineRow}>
                    <View style={styles.examTimelineDot} />
                    <View style={styles.examTimelineContent}>
                      <Text style={styles.examTimelineSubject}>
                        {subject?.name || 'Неизвестный предмет'}
                      </Text>
                      <Text style={styles.examTimelineType}>{exam.type}</Text>
                    </View>
                    <View style={styles.examTimelineDateBlock}>
                      <Text style={styles.examTimelineDate}>
                        {new Date(exam.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={[styles.examTimelineDays, daysLeft <= 3 && styles.examTimelineDaysUrgent]}>
                        {daysLeft === 0 ? 'Сегодня' : `через ${daysLeft} дн.`}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Notes per subject */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Заметки по предметам</Text>
            {notesBySubject.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Нет заметок</Text>
            ) : (
              notesBySubject.map((item, i) => (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.barFill, styles.barFillBlue, { width: `${(item.count / maxNoteCount) * 100}%` as any }]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.count}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ─── CARDS TAB ─── */}
      {activeTab === 'cards' && (
        <ScrollView
          style={styles.analyticsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.analyticsContent}
        >
          {/* Due today banner */}
          {dueToday.length > 0 && (
            <TouchableOpacity
              style={styles.dueTodayBanner}
              onPress={() => router.push('/flashcard-review')}
              activeOpacity={0.85}
            >
              <View style={styles.dueTodayLeft}>
                <Ionicons name="flash-outline" size={24} color={colors.inverseText} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.dueTodayTitle}>К повторению сегодня</Text>
                  <Text style={styles.dueTodayCount}>{dueToday.length} карточек</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.inverseText} />
            </TouchableOpacity>
          )}

          {flashcardsBySubject.length === 0 ? (
            <View style={styles.cardsPlaceholder}>
              <Ionicons name="layers-outline" size={64} color={colors.textMuted} />
              <Text style={styles.cardsPlaceholderTitle}>Нет карточек</Text>
              <Text style={styles.cardsPlaceholderText}>
                Добавляйте карточки прямо из редактора заметок
              </Text>
            </View>
          ) : (
            flashcardsBySubject.map(({ subject, cards }) => {
              const dueCount = cards.filter(c => {
                if (!c.next_review) return true;
                const rev = new Date(c.next_review);
                rev.setHours(0, 0, 0, 0);
                return rev <= today;
              }).length;

              const nextReviewDate = cards
                .filter(c => c.next_review)
                .map(c => new Date(c.next_review!))
                .sort((a, b) => a.getTime() - b.getTime())[0];

              const nextReviewText = nextReviewDate
                ? (() => {
                    const diff = Math.ceil((nextReviewDate.getTime() - today.getTime()) / 86400000);
                    if (diff <= 0) return null;
                    if (diff === 1) return 'Следующее: завтра';
                    return `Следующее: через ${diff} дн.`;
                  })()
                : null;

              const newCards = cards.filter(c => !c.next_review).length;
              const learningCards = cards.filter(c => {
                if (!c.next_review) return false;
                return c.interval < 7;
              }).length;
              const matureCards = cards.filter(c => {
                if (!c.next_review) return false;
                return c.interval >= 7;
              }).length;

              return (
                <View key={subject?.id ?? 'null'} style={styles.analyticsCard}>
                  <View style={styles.cardSubjectHeader}>
                    <Text style={styles.cardSubjectName}>{subject?.name || 'Без предмета'}</Text>
                    <Text style={styles.cardSubjectTotal}>{cards.length} карточек</Text>
                  </View>

                  <View style={styles.cardStatsPills}>
                    {newCards > 0 && (
                      <View style={[styles.cardStatPill, { backgroundColor: '#E3F0FF' }]}>
                        <Text style={[styles.cardStatPillText, { color: '#4A90E2' }]}>
                          {newCards} новых
                        </Text>
                      </View>
                    )}
                    {learningCards > 0 && (
                      <View style={[styles.cardStatPill, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={[styles.cardStatPillText, { color: '#C89153' }]}>
                          {learningCards} учатся
                        </Text>
                      </View>
                    )}
                    {matureCards > 0 && (
                      <View style={[styles.cardStatPill, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={[styles.cardStatPillText, { color: '#4CAF50' }]}>
                          {matureCards} выучено
                        </Text>
                      </View>
                    )}
                  </View>

                  {dueCount === 0 && nextReviewText ? (
                    <Text style={styles.cardNextReview}>{nextReviewText}</Text>
                  ) : null}

                  {dueCount > 0 && (
                    <View style={styles.cardDueBadge}>
                      <Text style={styles.cardDueBadgeText}>{dueCount} к повторению</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.startReviewBtn, dueCount === 0 && styles.startReviewBtnDisabled]}
                    onPress={() => router.push({
                      pathname: '/flashcard-review',
                      params: subject ? { subjectId: String(subject.id) } : {},
                    })}
                    activeOpacity={0.8}
                    disabled={dueCount === 0}
                  >
                    <Ionicons name="play-outline" size={16} color={dueCount > 0 ? colors.inverseText : colors.textMuted} />
                    <Text style={[styles.startReviewBtnText, dueCount === 0 && styles.startReviewBtnTextDisabled]}>
                      {dueCount > 0 ? `Начать (${dueCount})` : 'Всё повторено'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.practiceAllBtn}
                    onPress={() => router.push({
                      pathname: '/flashcard-review',
                      params: subject
                        ? { subjectId: String(subject.id), mode: 'all' }
                        : { mode: 'all' },
                    })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.practiceAllBtnText}>Повторить все ({cards.length})</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Settings modal */}
      <Modal
        visible={showSettingsModal}
        animationType="fade"
        transparent
        onRequestClose={closeSettingsModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeSettingsModal}>
          <View style={styles.settingsModalContent}>
            <Pressable onPress={() => {}} style={styles.settingsModalInner}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Настройки</Text>
              <TouchableOpacity onPress={closeSettingsModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.settingsScroll}
              contentContainerStyle={styles.settingsOptions}
              showsVerticalScrollIndicator={false}
              bounces
            >
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => { closeSettingsModal(); router.push('/settings'); }}
                activeOpacity={0.7}
              >
                <View style={styles.settingsOptionContent}>
                  <Ionicons name="time-outline" size={24} color={colors.accent} />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Настроить расписание</Text>
                    <Text style={styles.settingsOptionSubtitle}>Изменить время уроков и перемен</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => { closeSettingsModal(); router.push('/edit-schedule'); }}
                activeOpacity={0.7}
              >
                <View style={styles.settingsOptionContent}>
                  <Ionicons name="create-outline" size={24} color={isDark ? '#6BA7F8' : '#4A90E2'} />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Настроить текущее расписание</Text>
                    <Text style={styles.settingsOptionSubtitle}>Добавить или изменить уроки</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => { closeSettingsModal(); router.push('/startup'); }}
                activeOpacity={0.7}
              >
                <View style={styles.settingsOptionContent}>
                  <Ionicons name="refresh-outline" size={24} color={colors.accent} />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Полная переустановка расписания</Text>
                    <Text style={styles.settingsOptionSubtitle}>Настроить заново с нуля</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => { closeSettingsModal(); router.push('/vault-sync'); }}
                activeOpacity={0.7}
              >
                <View style={styles.settingsOptionContent}>
                  <Ionicons name="cloud-outline" size={24} color="#C89153" />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Синхронизация с Obsidian</Text>
                    <Text style={styles.settingsOptionSubtitle}>
                      {vaultEnabled ? 'Включена' : 'Не настроена'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {showDebugSeedActions && (
                <>
                  <TouchableOpacity
                    style={styles.settingsOption}
                    onPress={() => {
                      closeSettingsModal();
                      setTimeout(() => handleSeedNow(), 80);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingsOptionContent}>
                      <Ionicons name="flask-outline" size={24} color="#C89153" />
                      <View style={styles.settingsOptionText}>
                        <Text style={styles.settingsOptionTitle}>Применить отладочные сиды</Text>
                        <Text style={styles.settingsOptionSubtitle}>Очистить и заполнить тестовыми данными</Text>
                      </View>
                    </View>
                    <Ionicons name="sparkles-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsOption}
                    onPress={() => {
                      closeSettingsModal();
                      setTimeout(() => handleClearAllData(), 80);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingsOptionContent}>
                      <Ionicons name="trash-outline" size={24} color={colors.danger} />
                      <View style={styles.settingsOptionText}>
                        <Text style={styles.settingsOptionTitle}>Очистить все данные</Text>
                        <Text style={styles.settingsOptionSubtitle}>Полностью удалить данные приложения</Text>
                      </View>
                    </View>
                    <Ionicons name="warning-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  // Header
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F7F8FA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 40, fontWeight: '700', color: '#121417', fontFamily: Typography.fonts.heading },
  settingsButton: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionBtn: { padding: 8 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    overflow: 'hidden',
  },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { backgroundColor: '#C89153' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: '#121417', fontSize: 15 },

  // Tag filter
  tagFilterBar: { maxHeight: 40, marginBottom: 10 },
  tagFilterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE3EA',
  },
  tagChipSelected: { backgroundColor: '#C89153', borderColor: '#C89153' },
  tagChipText: { fontSize: 13, color: '#6D7680' },
  tagChipTextSelected: { color: '#000', fontWeight: '600' },

  // Notes list
  scrollWrapper: { flex: 1 },
  listContent: { paddingBottom: 100, paddingHorizontal: 12 },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Subject cards
  subjectGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DEE3EA',
    overflow: 'visible',
    minHeight: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  subjectGroupCollapsed: { width: '48%', maxWidth: '48%' },
  subjectGroupExpanded: { width: '100%' },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
    minHeight: 170,
  },
  subjectHeaderExpanded: { paddingBottom: 4, minHeight: 'auto' as any },
  subjectHeaderContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121417',
    fontFamily: 'serif',
    marginBottom: 6,
    textAlign: 'left',
    flexShrink: 1,
  },
  subjectHint: {
    fontSize: 12,
    marginTop: 6,
  },
  countBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#C89153',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#000' },
  sectionsContainer: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 16 },

  // Sections
  sectionContainer: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EEF1F5',
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionHeaderContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#121417', marginLeft: 8, fontFamily: 'serif' },
  sectionCount: { fontSize: 14, color: '#6D7680', marginLeft: 8 },
  sectionContent: { paddingHorizontal: 0, paddingTop: 4 },

  // Note cards
  noteCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 },
  noteCardV2: { borderLeftWidth: 3, borderLeftColor: '#C89153' },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDate: { fontSize: 12, color: '#999' },
  noteV2Label: { backgroundColor: '#F4E4D0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  noteV2LabelText: { fontSize: 10, color: '#8A5B2D', fontWeight: '700' },
  deleteButton: { padding: 4 },
  noteTitleV2: { fontSize: 14, color: '#000', fontWeight: '600', lineHeight: 20 },
  noteBodyPreview: { fontSize: 12, color: '#666', lineHeight: 18, marginTop: 4 },

  // Exam cards
  examCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 },
  examCardCompleted: { opacity: 0.6 },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  examHeaderLeft: { flex: 1 },
  checkboxContainer: { marginLeft: 12, padding: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C89153',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#C89153', borderColor: '#C89153' },
  examTextCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  examDate: { fontSize: 12, color: '#999', marginBottom: 4 },
  examRoom: { fontSize: 12, color: '#666' },
  examType: { fontSize: 14, color: '#000', fontWeight: '600' },

  // Homework cards
  homeworkCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 },
  homeworkCardCompleted: { opacity: 0.6 },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  homeworkHeaderLeft: { flex: 1 },
  homeworkTextCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  homeworkTitle: { fontSize: 14, color: '#000', fontWeight: '600', marginBottom: 4 },
  homeworkDate: { fontSize: 12, color: '#999', marginBottom: 4 },
  homeworkLesson: { fontSize: 12, color: '#666' },
  homeworkDescription: { fontSize: 13, color: '#666', lineHeight: 18 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: '600', color: '#121417', marginTop: 16, fontFamily: 'serif' },
  emptySubtext: { fontSize: 14, color: '#6D7680', marginTop: 8, textAlign: 'center' },

  // FAB
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C89153',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Settings modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(8,10,15,0.24)', justifyContent: 'flex-end' },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '76%',
  },
  settingsModalInner: { width: '100%' },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsModalTitle: { fontSize: 24, fontWeight: '700', color: '#000', fontFamily: 'serif' },
  closeButton: { padding: 4 },
  settingsScroll: { maxHeight: '100%' },
  settingsOptions: { gap: 12, paddingBottom: 10 },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingsOptionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingsOptionText: { marginLeft: 16, flex: 1 },
  settingsOptionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  settingsOptionSubtitle: { fontSize: 14, color: '#666' },

  // Analytics
  analyticsContainer: { flex: 1 },
  analyticsContent: { padding: 16, paddingBottom: 100 },
  analyticsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  analyticsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121417',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  streakStat: { flex: 1, alignItems: 'center' },
  streakNumber: { fontSize: 28, fontWeight: '700', color: '#121417' },
  streakLabel: { fontSize: 12, color: '#6D7680', marginTop: 4, textAlign: 'center' },
  streakDivider: { width: 1, height: 48, backgroundColor: '#EEF1F5' },
  activityBars: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 4 },
  activityBarCol: { flex: 1, alignItems: 'center' },
  activityBarTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', marginBottom: 4 },
  activityBarFill: { width: '100%' },
  activityBarValue: { fontSize: 10, color: '#6D7680', marginBottom: 2 },
  activityBarLabel: { fontSize: 10, color: '#6D7680' },
  analyticsEmpty: { fontSize: 14, color: '#6D7680', textAlign: 'center', paddingVertical: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 90, fontSize: 12, color: '#48505A', marginRight: 8 },
  barTrack: { flex: 1, height: 10, backgroundColor: '#EEF1F5', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#C89153', borderRadius: 5 },
  barFillBlue: { backgroundColor: '#4A90E2' },
  barValue: { width: 32, fontSize: 12, color: '#6D7680', textAlign: 'right', marginLeft: 8 },
  hwProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  hwProgressLabel: { fontSize: 14, color: '#48505A' },
  hwProgressPercent: { fontSize: 14, color: '#C89153', fontWeight: '700' },
  progressTrack: { height: 12, backgroundColor: '#EEF1F5', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C89153', borderRadius: 6 },
  examTimelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  examTimelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C89153', marginRight: 12 },
  examTimelineContent: { flex: 1 },
  examTimelineSubject: { fontSize: 14, color: '#121417', fontWeight: '600' },
  examTimelineType: { fontSize: 12, color: '#6D7680', marginTop: 2 },
  examTimelineDateBlock: { alignItems: 'flex-end' },
  examTimelineDate: { fontSize: 13, color: '#48505A' },
  examTimelineDays: { fontSize: 11, color: '#6D7680', marginTop: 2 },
  examTimelineDaysUrgent: { color: '#E25A2C' },
  activityChart: { borderRadius: 12 },
  readinessItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  readinessSubject: {
    flex: 1,
    fontSize: 14,
    color: '#121417',
    fontWeight: '600',
  },
  readinessDays: {
    fontSize: 12,
    color: '#6D7680',
  },
  readinessProgressTrack: {
    height: 6,
    backgroundColor: '#EEF1F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  readinessProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  readinessCardsText: {
    fontSize: 13,
    color: '#48505A',
    marginBottom: 4,
  },
  readinessPaceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  readinessNoCards: {
    fontSize: 13,
    color: '#6D7680',
  },

  // Cards
  dueTodayBanner: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueTodayLeft: { flexDirection: 'row', alignItems: 'center' },
  dueTodayTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  dueTodayCount: { fontSize: 13, color: '#3a2000', marginTop: 2 },
  cardSubjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSubjectName: { fontSize: 16, fontWeight: '700', color: '#121417', fontFamily: 'serif', flex: 1 },
  cardSubjectTotal: { fontSize: 13, color: '#6D7680' },
  cardDueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a1a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  cardDueBadgeText: { fontSize: 12, color: '#C89153', fontWeight: '600' },
  startReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C89153',
    borderRadius: 10,
    paddingVertical: 12,
  },
  startReviewBtnDisabled: { backgroundColor: '#EEF1F5' },
  startReviewBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  startReviewBtnTextDisabled: { color: '#555' },
  practiceAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF1F5',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  practiceAllBtnText: { fontSize: 13, color: '#6D7680', fontWeight: '500' },
  cardStatsPills: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  cardStatPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardStatPillText: { fontSize: 11, fontWeight: '600' },
  cardNextReview: { fontSize: 12, color: '#6D7680', marginBottom: 8 },
  cardsPlaceholder: { paddingVertical: 60, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  cardsPlaceholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121417',
    marginTop: 16,
    fontFamily: 'serif',
    textAlign: 'center',
  },
  cardsPlaceholderText: { fontSize: 14, color: '#6D7680', marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
