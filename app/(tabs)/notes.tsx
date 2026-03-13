import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useLessons } from '@/hooks/use-lessons';
import { useNotes } from '@/hooks/use-notes';
import { useSubjects } from '@/hooks/use-subjects';
import { Exam, Homework, Lesson, Note, Subject } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated, Dimensions, FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SubjectGroup {
  subject: Subject | null;
  controlWorks: Exam[]; // Контрольные
  testWorks: Exam[]; // Проверочные
  homework: Homework[];
  notes: Note[];
}

type SectionType = 'control' | 'test' | 'homework' | 'notes';


export default function NotesScreen() {
  const { notes, create, update, remove, reload } = useNotes();
  const { subjects } = useSubjects();
  const { lessons, reload: reloadLessons } = useLessons();
  const { exams, reload: reloadExams, remove: removeExam, toggle: toggleExam } = useExams();
  const { homework, reload: reloadHomework, remove: removeHomework, toggle: toggleHomework } = useHomework();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editSelectedSubjectId, setEditSelectedSubjectId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // формат: "subjectId-sectionType"

  // Перезагружаем данные при возврате на экран
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadExams();
      reloadHomework();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );


  // Создаем мапу уроков для получения subject_id из lesson_id
  const lessonsMap = useMemo(() => {
    const map = new Map<number, Lesson>();
    lessons.forEach(lesson => {
      map.set(lesson.id, lesson);
    });
    return map;
  }, [lessons]);

  // Группируем данные по предметам с разделами
  const subjectGroups = useMemo(() => {
    const groups = new Map<number | null, SubjectGroup>();

    // Создаем группы для всех предметов
    subjects.forEach(subject => {
      groups.set(subject.id, {
        subject,
        controlWorks: [],
        testWorks: [],
        homework: [],
        notes: [],
      });
    });

    // Группа для данных без предмета
    groups.set(null, {
      subject: null,
      controlWorks: [],
      testWorks: [],
      homework: [],
      notes: [],
    });

    // Распределяем заметки
    notes.forEach(note => {
      const subjectId = note.subject_id || null;
      const group = groups.get(subjectId) || groups.get(null)!;
      group.notes.push(note);
    });

    // Распределяем экзамены (контрольные и проверочные)
    exams.forEach(exam => {
      const subjectId = exam.subject_id;
      const group = groups.get(subjectId) || groups.get(null)!;
      if (isControlWork(exam.type)) {
        group.controlWorks.push(exam);
      } else if (isTestWork(exam.type)) {
        group.testWorks.push(exam);
      }
    });

    // Распределяем домашние задания (через lesson_id получаем subject_id)
    homework.forEach(hw => {
      const lesson = lessonsMap.get(hw.lesson_id);
      const subjectId = lesson?.subject_id || null;
      const group = groups.get(subjectId) || groups.get(null)!;
      group.homework.push(hw);
    });

    // Сортируем данные внутри каждой группы
    groups.forEach(group => {
      group.notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      group.controlWorks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      group.testWorks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      group.homework.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    });

    // Фильтруем группы, которые имеют хотя бы один элемент
    return Array.from(groups.values())
      .filter(group => 
        group.notes.length > 0 || 
        group.controlWorks.length > 0 || 
        group.testWorks.length > 0 || 
        group.homework.length > 0
      )
      .sort((a, b) => {
        if (!a.subject) return 1;
        if (!b.subject) return -1;
        return a.subject.name.localeCompare(b.subject.name);
      });
  }, [notes, exams, homework, subjects, lessonsMap]);

  const handleAddNote = () => {
    if (!noteText.trim()) {
      Alert.alert('Ошибка', 'Введите текст заметки');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    create(noteText.trim(), today, selectedSubjectId || undefined);
    setNoteText('');
    setSelectedSubjectId(null);
    setShowAddModal(false);
  };

  const handleEditNote = () => {
    if (!editingNote || !editNoteText.trim()) {
      Alert.alert('Ошибка', 'Введите текст заметки');
      return;
    }

    update(editingNote.id, editNoteText.trim(), editSelectedSubjectId || undefined);
    setEditingNote(null);
    setEditNoteText('');
    setEditSelectedSubjectId(null);
    setShowEditModal(false);
  };

  const handleOpenEditModal = (note: Note) => {
    setEditingNote(note);
    setEditNoteText(note.text);
    setEditSelectedSubjectId(note.subject_id || null);
    setShowEditModal(true);
  };

  const handleDeleteNote = (noteId: number) => {
    Alert.alert(
      'Удалить заметку',
      'Вы уверены, что хотите удалить эту заметку?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => remove(noteId),
        },
      ]
    );
  };

  const handleDeleteExam = (examId: number) => {
    Alert.alert(
      'Удалить',
      'Вы уверены, что хотите удалить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => removeExam(examId),
        },
      ]
    );
  };

  const handleDeleteHomework = (homeworkId: number) => {
    Alert.alert(
      'Удалить домашнее задание',
      'Вы уверены, что хотите удалить это домашнее задание?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => removeHomework(homeworkId),
        },
      ]
    );
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null | 'null' | 'none'>('none');

  // Сортируем карточки: раскрытая идет первой
  const sortedSubjectGroups = useMemo(() => {
    const sorted = [...subjectGroups];
    // Проверяем как null, так и числовые ID
    if (expandedSubjectId !== 'none') {
      const expandedIndex = sorted.findIndex(g => {
        const id = g.subject?.id ?? null;
        // Преобразуем null в строку 'null' для сравнения
        const normalizedId = id === null ? 'null' : id;
        return normalizedId === expandedSubjectId;
      });
      if (expandedIndex >= 0 && expandedIndex < sorted.length) {
        const [expandedItem] = sorted.splice(expandedIndex, 1);
        sorted.unshift(expandedItem);
      }
    }
    return sorted;
  }, [subjectGroups, expandedSubjectId]);

  const toggleSubject = (subjectId: number | null) => {
    // Нормализуем ID: null -> 'null', число -> число
    const normalizedId = subjectId === null ? 'null' : subjectId;
    const currentExpanded = expandedSubjectId;
    
    // Сравниваем
    if (currentExpanded === normalizedId) {
      // Если карточка уже раскрыта, закрываем её
      setExpandedSubjectId('none');
    } else {
      // Раскрываем только выбранную карточку
      setExpandedSubjectId(normalizedId);
      
      // Прокручиваем наверх при раскрытии
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: 0,
            animated: true,
          });
        }
      }, 100);
    }
  };

  const toggleSection = (subjectId: number | null, sectionType: SectionType) => {
    const key = `${subjectId}-${sectionType}`;
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const isSectionExpanded = (subjectId: number | null, sectionType: SectionType) => {
    return expandedSections.has(`${subjectId}-${sectionType}`);
  };

  // Компонент карточки предмета
  const SubjectCard = ({ item, isExpanded, onToggle }: { item: SubjectGroup; isExpanded: boolean; onToggle: () => void }) => {
    const subjectId = item.subject?.id || null;
    const subjectName = item.subject?.name || 'Без предмета';
    const totalCount = item.notes.length + item.controlWorks.length + item.testWorks.length + item.homework.length;
    const animatedOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(animatedOpacity, {
        toValue: isExpanded ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [isExpanded]);

    return (
      <View
        style={[
          styles.subjectGroup,
          isExpanded && styles.subjectGroupExpanded,
          !isExpanded && styles.subjectGroupCollapsed,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.subjectHeader,
            isExpanded && styles.subjectHeaderExpanded
          ]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.subjectHeaderContent}>
            <Text style={styles.subjectName}>
              {subjectName}
            </Text>
          </View>
        </TouchableOpacity>
        
        {totalCount > 0 && !isExpanded && (
          <Animated.View 
            style={[
              styles.countBadge,
              { opacity: animatedOpacity }
            ]}
          >
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </Animated.View>
        )}

        {isExpanded ? (
          <View style={styles.sectionsContainer}>
            {renderSection(subjectId, 'control', 'Контрольные', item.controlWorks.length, 'document-text-outline', item.controlWorks)}
            {renderSection(subjectId, 'test', 'Проверочные', item.testWorks.length, 'clipboard-outline', undefined, item.testWorks)}
            {renderSection(subjectId, 'homework', 'Домашние', item.homework.length, 'book-outline', undefined, undefined, item.homework)}
            {renderSection(subjectId, 'notes', 'Заметки', item.notes.length, 'create-outline', undefined, undefined, undefined, item.notes)}
          </View>
        ) : null}
      </View>
    );
  };

  const renderNote = ({ item }: { item: Note }) => {
    const noteDate = new Date(item.date);
    const formattedDate = noteDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.noteCard}
        onPress={() => handleOpenEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteDate}>{formattedDate}</Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteNote(item.id);
            }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#E25A2C" />
          </TouchableOpacity>
        </View>
        <Text style={styles.noteText} numberOfLines={3}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderExam = (exam: Exam) => {
    const examDate = new Date(exam.date);
    const formattedDate = examDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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
            {exam.room && <Text style={[styles.examRoom, isCompleted && styles.examTextCompleted]}>Аудитория: {exam.room}</Text>}
          </View>
          <TouchableOpacity
            onPress={() => toggleExam(exam.id, !isCompleted)}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
              {isCompleted && <Ionicons name="checkmark" size={16} color="#000" />}
            </View>
          </TouchableOpacity>
        </View>
        <Text style={[styles.examType, isCompleted && styles.examTextCompleted]}>{exam.type}</Text>
      </TouchableOpacity>
    );
  };

  const renderHomeworkItem = (hw: Homework) => {
    const dueDate = new Date(hw.due_date);
    const formattedDate = dueDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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
            {lesson && <Text style={[styles.homeworkLesson, isCompleted && styles.homeworkTextCompleted]}>Урок: {lesson.subject_name}</Text>}
          </View>
          <TouchableOpacity
            onPress={() => toggleHomework(hw.id, !isCompleted)}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
              {isCompleted && <Ionicons name="checkmark" size={16} color="#000" />}
            </View>
          </TouchableOpacity>
        </View>
        {hw.description && (
          <Text style={[styles.homeworkDescription, isCompleted && styles.homeworkTextCompleted]} numberOfLines={3}>
            {hw.description}
          </Text>
        )}
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
    homework?: Homework[],
    notes?: Note[]
  ) => {
    const isExpanded = isSectionExpanded(subjectId, sectionType);
    if (count === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(subjectId, sectionType)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderContent}>
            <Ionicons name={icon as any} size={20} color="#C89153" />
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCount}>({count})</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#999"
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {sectionType === 'control' && controlWorks && (
              <View>
                {controlWorks.map(exam => renderExam(exam))}
              </View>
            )}
            {sectionType === 'test' && testWorks && (
              <View>
                {testWorks.map(exam => renderExam(exam))}
              </View>
            )}
            {sectionType === 'homework' && homework && (
              <View>
                {homework.map(hw => renderHomeworkItem(hw))}
              </View>
            )}
            {sectionType === 'notes' && notes && (
              <FlatList
                data={notes}
                renderItem={renderNote}
                keyExtractor={(note) => note.id.toString()}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Знания</Text>
        <TouchableOpacity
          onPress={() => setShowSettingsModal(true)}
          style={styles.settingsButton}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Список данных по предметам */}
      {subjectGroups.length > 0 ? (
        <View style={styles.scrollWrapper}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.subjectsGrid}>
              {sortedSubjectGroups.map((item) => {
                const subjectId = item.subject?.id ?? null;
                // Нормализуем ID для сравнения
                const normalizedId = subjectId === null ? 'null' : subjectId;
                // Проверяем, раскрыта ли карточка
                const isExpanded = expandedSubjectId !== 'none' && expandedSubjectId === normalizedId;

                return (
                  <SubjectCard
                    key={subjectId !== null ? `subject-${subjectId}` : `null-subject`}
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
          <Ionicons name="document-text-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>Нет данных</Text>
          <Text style={styles.emptySubtext}>Нажмите + чтобы добавить заметку</Text>
        </View>
      )}

      {/* Кнопка добавления заметки */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#000" />
      </TouchableOpacity>

      {/* Модальное окно добавления заметки */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Новая заметка</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    setNoteText('');
                    setSelectedSubjectId(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Выбор предмета */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Предмет (необязательно)</Text>
                <FlatList
                  horizontal
                  data={[{ id: null, name: 'Без предмета' }, ...subjects]}
                  keyExtractor={(item) => (item.id || 'null').toString()}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.subjectChip,
                        selectedSubjectId === item.id && styles.subjectChipSelected,
                      ]}
                      onPress={() => setSelectedSubjectId(item.id || null)}
                    >
                      <Text
                        style={[
                          styles.subjectChipText,
                          selectedSubjectId === item.id && styles.subjectChipTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Текст заметки */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Текст заметки</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Введите текст заметки..."
                  placeholderTextColor="#999"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              {/* Кнопка сохранения */}
              <TouchableOpacity
                style={[styles.saveButton, !noteText.trim() && styles.saveButtonDisabled]}
                onPress={handleAddNote}
                disabled={!noteText.trim()}
              >
                <Text style={[styles.saveButtonText, !noteText.trim() && styles.saveButtonTextDisabled]}>
                  Сохранить
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Модальное окно редактирования заметки */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowEditModal(false);
            setEditingNote(null);
            setEditNoteText('');
            setEditSelectedSubjectId(null);
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderContent}>
                    <Text style={styles.modalTitle}>Редактировать заметку</Text>
                    {editingNote && (
                      <Text style={styles.modalDate}>
                        {new Date(editingNote.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowEditModal(false);
                      setEditingNote(null);
                      setEditNoteText('');
                      setEditSelectedSubjectId(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                {/* Выбор предмета */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Предмет (необязательно)</Text>
                  <FlatList
                    horizontal
                    data={[{ id: null, name: 'Без предмета' }, ...subjects]}
                    keyExtractor={(item) => (item.id || 'null').toString()}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.subjectChip,
                          editSelectedSubjectId === item.id && styles.subjectChipSelected,
                        ]}
                        onPress={() => setEditSelectedSubjectId(item.id || null)}
                      >
                        <Text
                          style={[
                            styles.subjectChipText,
                            editSelectedSubjectId === item.id && styles.subjectChipTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>

                {/* Текст заметки */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Текст заметки</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Введите текст заметки..."
                    placeholderTextColor="#999"
                    value={editNoteText}
                    onChangeText={setEditNoteText}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>

                {/* Кнопка сохранения */}
                <TouchableOpacity
                  style={[styles.saveButton, !editNoteText.trim() && styles.saveButtonDisabled]}
                  onPress={handleEditNote}
                  disabled={!editNoteText.trim()}
                >
                  <Text style={[styles.saveButtonText, !editNoteText.trim() && styles.saveButtonTextDisabled]}>
                    Сохранить изменения
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Модальное окно настроек */}
        <Modal
          visible={showSettingsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.settingsModalContent}>
              <View style={styles.settingsModalHeader}>
                <Text style={styles.settingsModalTitle}>Настройки</Text>
                <TouchableOpacity
                  onPress={() => setShowSettingsModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.settingsOptions}>
                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowSettingsModal(false);
                    router.push('/settings');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsOptionContent}>
                    <Ionicons name="time-outline" size={24} color="#C89153" />
                    <View style={styles.settingsOptionText}>
                      <Text style={styles.settingsOptionTitle}>Настроить расписание</Text>
                      <Text style={styles.settingsOptionSubtitle}>Изменить время уроков и перемен</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowSettingsModal(false);
                    router.push('/edit-schedule');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsOptionContent}>
                    <Ionicons name="create-outline" size={24} color="#4A90E2" />
                    <View style={styles.settingsOptionText}>
                      <Text style={styles.settingsOptionTitle}>Настроить текущее расписание</Text>
                      <Text style={styles.settingsOptionSubtitle}>Добавить или изменить уроки</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowSettingsModal(false);
                    router.push('/startup');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingsOptionContent}>
                    <Ionicons name="refresh-outline" size={24} color="#C89153" />
                    <View style={styles.settingsOptionText}>
                      <Text style={styles.settingsOptionTitle}>Полная переустановка расписания</Text>
                      <Text style={styles.settingsOptionSubtitle}>Настроить заново с нуля</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </Modal>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Glanz',
  },
  settingsButton: {
    padding: 8,
  },
  scrollWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 12,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectGroup: {
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'visible',
    minHeight: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  subjectGroupCollapsed: {
    width: '48%',
    maxWidth: '48%',
  },
  subjectGroupExpanded: {
    width: '100%',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
    minHeight: 170,
  },
  subjectHeaderExpanded: {
    paddingBottom: 4,
    minHeight: 'auto',
  },
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
    color: '#fff',
    fontFamily: 'serif',
    marginBottom: 6,
    textAlign: 'left',
    flexShrink: 1,
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
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  sectionsContainerAnimated: {
    overflow: 'hidden',
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  sectionsContainerHidden: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'serif',
  },
  sectionCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  examCardCompleted: {
    opacity: 0.6,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  examHeaderLeft: {
    flex: 1,
  },
  checkboxContainer: {
    marginLeft: 12,
    padding: 4,
  },
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
  checkboxChecked: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  examTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  examDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  examRoom: {
    fontSize: 12,
    color: '#666',
  },
  examType: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  homeworkCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  homeworkCardCompleted: {
    opacity: 0.6,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  homeworkHeaderLeft: {
    flex: 1,
  },
  homeworkTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  homeworkTitle: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    marginBottom: 4,
  },
  homeworkDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  homeworkLesson: {
    fontSize: 12,
    color: '#666',
  },
  homeworkDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    fontFamily: 'serif',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    flexGrow: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subjectChipSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#666',
  },
  subjectChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#C89153',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '50%',
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'serif',
  },
  closeButton: {
    padding: 4,
  },
  settingsOptions: {
    gap: 12,
  },
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
  settingsOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  settingsOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Стили для модального окна настроек расписания
  scheduleSettingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    flexGrow: 0,
  },
  scheduleSettingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  scheduleSettingsModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'serif',
  },
  scheduleSettingsModalScroll: {
    flex: 1,
  },
  scheduleSettingsSection: {
    marginBottom: 30,
  },
  scheduleSettingsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  scheduleSettingsInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    color: '#000',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scheduleSettingsHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  scheduleSettingsLongBreakContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  scheduleSettingsLongBreakOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scheduleSettingsLongBreakOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  scheduleSettingsLongBreakOptionText: {
    color: '#666',
    fontSize: 14,
  },
  scheduleSettingsLongBreakOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  scheduleSettingsLongBreakDurationContainer: {
    marginTop: 16,
  },
  scheduleSettingsFormatContainer: {
    gap: 12,
  },
  scheduleSettingsFormatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scheduleSettingsFormatOptionSelected: {
    borderColor: '#C89153',
    backgroundColor: '#fff5e6',
  },
  scheduleSettingsFormatOptionText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 12,
  },
  scheduleSettingsFormatOptionTextSelected: {
    color: '#C89153',
    fontWeight: '600',
  },
  scheduleSettingsPreviewContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  scheduleSettingsPreviewSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  scheduleSettingsPreviewSlotNumber: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
    width: 30,
  },
  scheduleSettingsPreviewSlotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scheduleSettingsPreviewSlotTimeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleSettingsPreviewSlotSeparator: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 8,
  },
  scheduleSettingsSaveButton: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  scheduleSettingsSaveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  // Стили для модального окна редактирования расписания
  editScheduleModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    flexGrow: 0,
  },
  editScheduleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editScheduleModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'serif',
  },
  editScheduleModalScroll: {
    flex: 1,
  },
  editScheduleSection: {
    marginBottom: 30,
  },
  editScheduleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  editScheduleOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  editScheduleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editScheduleSelectedOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  editScheduleOptionText: {
    color: '#666',
    fontSize: 14,
  },
  editScheduleSelectedOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  editScheduleAddButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  editScheduleAddButtonText: {
    color: '#C89153',
    fontSize: 14,
    textAlign: 'center',
  },
  editScheduleNewInputContainer: {
    marginTop: 10,
  },
  editScheduleInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    color: '#000',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  editScheduleNewInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editScheduleCancelNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editScheduleCancelNewText: {
    color: '#666',
    fontSize: 14,
  },
  editScheduleConfirmNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#C89153',
    borderRadius: 8,
  },
  editScheduleConfirmNewText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  editScheduleLessonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editScheduleAddLessonButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C89153',
    borderRadius: 12,
  },
  editScheduleAddLessonButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  editScheduleEmptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  editScheduleEmptyStateText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 4,
  },
  editScheduleEmptyStateSubtext: {
    color: '#999',
    fontSize: 12,
  },
  editScheduleLessonCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editScheduleLessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editScheduleLessonNumber: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
  },
  editScheduleRemoveButton: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '600',
  },
  editScheduleLessonField: {
    marginBottom: 16,
  },
  editScheduleLessonFieldHalf: {
    flex: 1,
    marginRight: 10,
  },
  editScheduleLessonFieldLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  editScheduleLessonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  editScheduleLessonOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editScheduleLessonOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  editScheduleLessonOptionText: {
    color: '#666',
    fontSize: 12,
  },
  editScheduleLessonOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  editScheduleTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editScheduleTypeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  editScheduleSelectedTypeOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  editScheduleTypeOptionText: {
    color: '#666',
    fontSize: 12,
  },
  editScheduleSelectedTypeOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  editScheduleTimeSlotOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editScheduleTimeSlotOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  editScheduleTimeSlotText: {
    color: '#666',
    fontSize: 12,
  },
  editScheduleTimeSlotTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  editScheduleWeekContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editScheduleWeekOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  editScheduleWeekOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  editScheduleWeekOptionText: {
    color: '#666',
    fontSize: 12,
  },
  editScheduleWeekOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  editScheduleLessonInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    color: '#000',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editScheduleCompleteButton: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  editScheduleCompleteButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});

