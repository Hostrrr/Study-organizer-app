import AssessmentActions from '@/components/assessment-actions';
import ScreenContainer from '@/components/ui/screen-container';
import ScreenHeader from '@/components/ui/screen-header';
import { ensureRuCalendarLocale, getCalendarTheme } from '@/constants/calendar-theme';
import { Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getExamsBySubjectId, getExamsBySubjectIdAndDate, getHomeworkByLessonId, getLessonById, getNotesByLessonId } from '@/database/queries';
import { useAssessmentActions } from '@/hooks/use-assessment-actions';
import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useNotes } from '@/hooks/use-notes';
import { Exam, Homework, Lesson, Note } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function LessonDetailsScreen() {
  const { colors, isDark } = useAppTheme();
  const { lessonId, date } = useLocalSearchParams<{ lessonId: string; date?: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState<string>('');
  const [showAddHW, setShowAddHW] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newHWTitle, setNewHWTitle] = useState('');
  const [newHWDescription, setNewHWDescription] = useState('');
  const [newHWDate, setNewHWDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newExamType, setNewExamType] = useState('контрольная');
  const [newExamDate, setNewExamDate] = useState('');
  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [newExamRoom, setNewExamRoom] = useState('');
  const [gradingExamId, setGradingExamId] = useState<number | null>(null);

  const { create: createHomework, remove: removeHomework, toggle: toggleHomework } = useHomework();
  const { create: createExam } = useExams();
  const { setExamDone, setExamGrade, deleteExamEntry } = useAssessmentActions();
  const { create: createNote } = useNotes();
  const calendarTheme = useMemo(() => getCalendarTheme(isDark), [isDark]);

  useEffect(() => {
    ensureRuCalendarLocale();
  }, []);

  // Получаем дату урока (из параметров или сегодняшнюю)
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (lessonId) {
      const lessonData = getLessonById(Number(lessonId));
      setLesson(lessonData);
      
      if (lessonData) {
        // Загружаем домашние задания для этого урока
        const hw = getHomeworkByLessonId(lessonData.id);
        setHomework(hw);
        
        // Загружаем экзамены для этого предмета на дату урока
        // Если дата передана, показываем только контрольные на эту дату
        const lessonExams = date 
          ? getExamsBySubjectIdAndDate(lessonData.subject_id, date)
          : getExamsBySubjectId(lessonData.subject_id);
        setExams(lessonExams);
        
        // Загружаем заметки для этого урока
        const lessonNotes = getNotesByLessonId(lessonData.id);
        setNotes(lessonNotes);
      }
    }
  }, [lessonId, date, todayDate]);

  // Вычисляем дату следующего урока на основе day_of_week
  const getNextLessonDate = useMemo(() => {
    if (!lesson) return todayDate;
    
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = воскресенье, 1 = понедельник, ...
    
    // Преобразуем day_of_week из базы (0 = понедельник) в формат JavaScript (0 = воскресенье)
    // day_of_week: 0=Пн, 1=Вт, 2=Ср, 3=Чт, 4=Пт, 5=Сб, 6=Вс
    // JavaScript: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб
    // Формула: jsDay = (day_of_week + 1) % 7
    const lessonDayOfWeek = (lesson.day_of_week + 1) % 7;
    
    // Вычисляем разницу дней до следующего урока
    let daysUntilNext = lessonDayOfWeek - todayDayOfWeek;
    
    // Если урок уже прошел на этой неделе или сегодня, берем следующий раз
    if (daysUntilNext <= 0) {
      daysUntilNext += 7;
    }
    
    // Создаем дату следующего урока
    const nextLessonDate = new Date(today);
    nextLessonDate.setDate(today.getDate() + daysUntilNext);
    
    return nextLessonDate.toISOString().split('T')[0];
  }, [lesson, todayDate]);

  const controlWorks = useMemo(() => {
    return exams.filter(exam => isControlWork(exam.type));
  }, [exams]);

  const testWorks = useMemo(() => {
    return exams.filter(exam => isTestWork(exam.type));
  }, [exams]);

  const handleSaveNote = () => {
    if (!noteText.trim() || !lesson) return;
    
    createNote(noteText.trim(), todayDate, lesson.subject_id, lesson.id);
    setNoteText('');
    
    // Перезагружаем заметки
    if (lesson) {
      const updatedNotes = getNotesByLessonId(lesson.id);
      setNotes(updatedNotes);
    }
  };

  const handleAddHomework = () => {
    if (!newHWTitle.trim() || !lesson) {
      Alert.alert('Ошибка', 'Заполните название домашнего задания');
      return;
    }
    
    if (!newHWDate.trim()) {
      Alert.alert('Ошибка', 'Укажите дату выполнения');
      return;
    }
    
    // Используем выбранную дату как срок выполнения
    createHomework(lesson.id, newHWTitle.trim(), newHWDescription.trim(), newHWDate.trim());
    setNewHWTitle('');
    setNewHWDescription('');
    setNewHWDate('');
    setShowAddHW(false);
    
    // Перезагружаем домашние задания
    if (lesson) {
      const updatedHW = getHomeworkByLessonId(lesson.id);
      setHomework(updatedHW);
    }
  };

  const handleAddExam = () => {
    if (!lesson) {
      Alert.alert('Ошибка', 'Ошибка загрузки урока');
      return;
    }
    
    if (!newExamDate.trim()) {
      Alert.alert('Ошибка', 'Укажите дату контрольной/проверочной');
      return;
    }
    
    // Используем выбранную дату
    createExam(lesson.subject_id, newExamDate.trim(), newExamType, newExamRoom || undefined);
    setNewExamType('контрольная');
    setNewExamDate('');
    setNewExamRoom('');
    setShowAddExam(false);
    
    // Перезагружаем экзамены (только на дату урока, если дата передана)
    const updatedExams = date 
      ? getExamsBySubjectIdAndDate(lesson.subject_id, date)
      : getExamsBySubjectId(lesson.subject_id);
    setExams(updatedExams);
  };

  const handleDeleteHomework = (hwId: number) => {
    Alert.alert(
      'Удалить домашнее задание',
      'Вы уверены, что хотите удалить это домашнее задание?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeHomework(hwId);
            if (lesson) {
              const updatedHW = getHomeworkByLessonId(lesson.id);
              setHomework(updatedHW);
            }
          },
        },
      ]
    );
  };

  const handleToggleExam = (examId: number, currentStatus: number) => {
    setExamDone(examId, currentStatus !== 1);
    // Обновляем локальное состояние после переключения
    if (lesson) {
      const updatedExams = date 
        ? getExamsBySubjectIdAndDate(lesson.subject_id, date)
        : getExamsBySubjectId(lesson.subject_id);
      setExams(updatedExams);
    }
  };

  const handleToggleHomework = (hwId: number, currentStatus: number) => {
    toggleHomework(hwId, currentStatus !== 1);
    // Обновляем локальное состояние после переключения
    if (lesson) {
      const updatedHW = getHomeworkByLessonId(lesson.id);
      setHomework(updatedHW);
    }
  };

  const handleDeleteExam = (examId: number) => {
    Alert.alert(
      'Удалить работу',
      'Вы уверены, что хотите удалить эту работу?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteExamEntry(examId);
            if (lesson) {
              const updatedExams = date 
                ? getExamsBySubjectIdAndDate(lesson.subject_id, date)
                : getExamsBySubjectId(lesson.subject_id);
              setExams(updatedExams);
            }
          },
        },
      ]
    );
  };

  const handleSetExamGrade = (exam: Exam, gradeValue: number) => {
    if (!lesson) {
      return;
    }
    setExamGrade({ exam, subjectId: lesson.subject_id, grade: gradeValue });
    setGradingExamId(null);
    Alert.alert('Успешно', `Оценка ${gradeValue} сохранена`);
    if (lesson) {
      const updatedExams = date 
        ? getExamsBySubjectIdAndDate(lesson.subject_id, date)
        : getExamsBySubjectId(lesson.subject_id);
      setExams(updatedExams);
    }
  };

  if (!lesson) {
    return (
      <ScreenContainer style={styles.container}>
        <ScreenHeader action="close" />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Загрузка...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScreenHeader action="close" />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Заголовок с названием пары */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{lesson.subject_name || `Предмет #${lesson.subject_id}`}</Text>
        
        <View style={[styles.typePill, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.typePillText, { color: colors.accent }]}>{lesson.type}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {lesson.teacher_name || `Преподаватель #${lesson.teacher_id}`}
          </Text>
        </View>

        {lesson.room ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.metaIcon} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>{lesson.room}</Text>
          </View>
        ) : null}

        <View style={[styles.metaRow, styles.metaRowLast]}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {lesson.start_time} — {lesson.end_time}
          </Text>
        </View>

        {/* Список контрольных работ */}
        {controlWorks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Контрольные работы</Text>
            {controlWorks.map((exam) => {
              const isCompleted = exam.is_completed === 1;
              return (
                <React.Fragment key={exam.id}>
                  <View style={styles.workItem}>
                    <View style={[styles.workIndicator, styles.controlWorkIndicator]} />
                    <View style={styles.workContent}>
                      <Text style={[styles.workTitle, isCompleted && styles.workTitleCompleted]}>{exam.type}</Text>
                      {exam.room && (
                        <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Аудитория: {exam.room}</Text>
                      )}
                      <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Дата: {exam.date}</Text>
                    </View>
                    <View style={styles.workActions}>
                      <AssessmentActions
                        exam={exam}
                        expanded={gradingExamId === exam.id}
                        onToggleExpanded={() => setGradingExamId(gradingExamId === exam.id ? null : exam.id)}
                        onToggleDone={(currentExam, done) => {
                          handleToggleExam(currentExam.id, done ? 0 : 1);
                        }}
                        onDelete={(currentExam) => {
                          handleDeleteExam(currentExam.id);
                        }}
                        onSetGrade={handleSetExamGrade}
                      />
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Список проверочных работ */}
        {testWorks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Проверочные работы</Text>
            {testWorks.map((exam) => {
              const isCompleted = exam.is_completed === 1;
              return (
                <React.Fragment key={exam.id}>
                  <View style={styles.workItem}>
                    <View style={[styles.workIndicator, styles.testWorkIndicator]} />
                    <View style={styles.workContent}>
                      <Text style={[styles.workTitle, isCompleted && styles.workTitleCompleted]}>{exam.type}</Text>
                      {exam.room && (
                        <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Аудитория: {exam.room}</Text>
                      )}
                      <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Дата: {exam.date}</Text>
                    </View>
                    <View style={styles.workActions}>
                      <AssessmentActions
                        exam={exam}
                        expanded={gradingExamId === exam.id}
                        onToggleExpanded={() => setGradingExamId(gradingExamId === exam.id ? null : exam.id)}
                        onToggleDone={(currentExam, done) => {
                          handleToggleExam(currentExam.id, done ? 0 : 1);
                        }}
                        onDelete={(currentExam) => {
                          handleDeleteExam(currentExam.id);
                        }}
                        onSetGrade={handleSetExamGrade}
                      />
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Список домашних заданий */}
        {homework.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Домашние задания</Text>
            {homework.map((hw) => {
              const isCompleted = hw.is_completed === 1;
              return (
                <View key={hw.id} style={styles.workItem}>
                  <View style={[styles.workIndicator, styles.homeworkIndicator]} />
                  <View style={styles.workContent}>
                    <Text style={[styles.workTitle, isCompleted && styles.workTitleCompleted]}>{hw.title}</Text>
                    {hw.description && (
                      <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>{hw.description}</Text>
                    )}
                    <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Срок: {hw.due_date}</Text>
                  </View>
                  <View style={styles.workActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleHomework(hw.id, hw.is_completed)}
                      style={styles.checkboxContainer}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                        {isCompleted && <Ionicons name="checkmark" size={16} color={colors.inverseText} />}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteHomework(hw.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Кнопки добавления */}
        <View style={styles.actionsSection}>
          {!showAddHW && !showAddExam && (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setNewHWDate(getNextLessonDate);
                  setShowAddHW(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Добавить ДЗ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setNewExamDate(getNextLessonDate);
                  setShowAddExam(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Добавить контрольную/проверочную</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Форма добавления ДЗ */}
          {showAddHW && (
            <View style={styles.addForm}>
              <Text style={styles.formTitle}>Новое домашнее задание</Text>
              <TextInput
                style={styles.input}
                placeholder="Название"
                placeholderTextColor="#999"
                value={newHWTitle}
                onChangeText={setNewHWTitle}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Описание (необязательно)"
                placeholderTextColor="#999"
                value={newHWDescription}
                onChangeText={setNewHWDescription}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.sectionLabel}>Срок выполнения</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Text style={styles.dateButtonText}>
                  {newHWDate 
                    ? (() => {
                        const date = new Date(newHWDate);
                        const day = date.getDate();
                        const month = date.toLocaleDateString('ru-RU', { month: 'long' });
                        const year = date.getFullYear();
                        return `${day} ${month} ${year}`;
                      })()
                    : 'Выберите дату'}
                </Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={newHWDate || new Date().toISOString().split('T')[0]}
                    onDayPress={(day) => {
                      setNewHWDate(day.dateString);
                      setShowDatePicker(false);
                    }}
                    markedDates={{
                      [newHWDate]: {
                        selected: true,
                        selectedColor: '#C89153',
                      },
                    }}
                    firstDay={1}
                    minDate={new Date().toISOString().split('T')[0]}
                    theme={calendarTheme}
                  />
                </View>
              )}
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={() => {
                    setShowAddHW(false);
                    setNewHWTitle('');
                    setNewHWDescription('');
                    setNewHWDate('');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.cancelFormText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveFormButton}
                  onPress={handleAddHomework}
                >
                  <Text style={styles.saveFormText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Форма добавления экзамена */}
          {showAddExam && (
            <View style={styles.addForm}>
              <Text style={styles.formTitle}>Новая контрольная/проверочная</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, newExamType === 'контрольная' && styles.typeButtonActive]}
                  onPress={() => setNewExamType('контрольная')}
                >
                  <Text style={[styles.typeButtonText, newExamType === 'контрольная' && styles.typeButtonTextActive]}>
                    Контрольная
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, newExamType === 'проверочная' && styles.typeButtonActive]}
                  onPress={() => setNewExamType('проверочная')}
                >
                  <Text style={[styles.typeButtonText, newExamType === 'проверочная' && styles.typeButtonTextActive]}>
                    Проверочная
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLabel}>Дата *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowExamDatePicker(!showExamDatePicker)}
              >
                <Text style={styles.dateButtonText}>
                  {newExamDate 
                    ? (() => {
                        const date = new Date(newExamDate);
                        const day = date.getDate();
                        const month = date.toLocaleDateString('ru-RU', { month: 'long' });
                        const year = date.getFullYear();
                        return `${day} ${month} ${year}`;
                      })()
                    : 'Выберите дату'}
                </Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </TouchableOpacity>
              
              {showExamDatePicker && (
                <View style={styles.calendarContainer}>
                  <Calendar
                    current={newExamDate || new Date().toISOString().split('T')[0]}
                    onDayPress={(day) => {
                      setNewExamDate(day.dateString);
                      setShowExamDatePicker(false);
                    }}
                    markedDates={{
                      [newExamDate]: {
                        selected: true,
                        selectedColor: '#C89153',
                      },
                    }}
                    firstDay={1}
                    minDate={new Date().toISOString().split('T')[0]}
                    theme={calendarTheme}
                  />
                </View>
              )}
              <Text style={styles.sectionLabel}>Аудитория (необязательно)</Text>
              <TextInput
                style={styles.input}
                placeholder="Аудитория (необязательно)"
                placeholderTextColor="#999"
                value={newExamRoom}
                onChangeText={setNewExamRoom}
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={() => {
                    setShowAddExam(false);
                    setNewExamType('контрольная');
                    setNewExamDate('');
                    setNewExamRoom('');
                    setShowExamDatePicker(false);
                  }}
                >
                  <Text style={styles.cancelFormText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveFormButton}
                  onPress={handleAddExam}
                >
                  <Text style={styles.saveFormText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Поле для заметки */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Заметки</Text>
          {notes.length > 0 && (
            <View style={styles.notesList}>
              {notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <Text style={styles.noteText}>{note.text}</Text>
                  <Text style={styles.noteDate}>{note.date}</Text>
                </View>
              ))}
            </View>
          )}
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Добавить заметку..."
            placeholderTextColor="#999"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={styles.saveNoteButton}
            onPress={handleSaveNote}
            disabled={!noteText.trim()}
          >
            <Text style={[styles.saveNoteText, !noteText.trim() && styles.saveNoteTextDisabled]}>
              Сохранить заметку
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Typography.fonts.heading,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  typePillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaIcon: {
    marginRight: 10,
  },
  metaText: {
    fontSize: 16,
    flex: 1,
  },
  metaRowLast: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  workItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  workIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  controlWorkIndicator: {
    backgroundColor: '#E25A2C',
  },
  testWorkIndicator: {
    backgroundColor: '#FFF76A',
  },
  homeworkIndicator: {
    backgroundColor: '#4CAF50',
  },
  workContent: {
    flex: 1,
  },
  workTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 4,
  },
  workTitleCompleted: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  workSubtitle: {
    fontSize: 14,
    color: '#6D7680',
    marginBottom: 2,
  },
  workSubtitleCompleted: {
    opacity: 0.6,
  },
  workActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxContainer: {
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
  completed: {
    color: '#4CAF50',
  },
  notCompleted: {
    color: '#E25A2C',
  },
  actionsSection: {
    marginBottom: 30,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE3EA',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#C89153',
    fontSize: 14,
    textAlign: 'center',
  },
  addForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    color: '#121417',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DEE3EA',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EEF1F5',
    borderWidth: 2,
    borderColor: '#DEE3EA',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  typeButtonText: {
    color: '#6D7680',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelFormButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelFormText: {
    color: '#6D7680',
    fontSize: 14,
  },
  saveFormButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#C89153',
    borderRadius: 8,
  },
  saveFormText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  notesList: {
    marginBottom: 16,
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    color: '#121417',
    fontSize: 14,
    marginBottom: 4,
  },
  noteDate: {
    color: '#6D7680',
    fontSize: 12,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  saveNoteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#C89153',
    alignItems: 'center',
  },
  saveNoteText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  saveNoteTextDisabled: {
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#E25A2C',
    fontSize: 24,
    fontWeight: 'bold',
  },
  gradeButton: {
    backgroundColor: '#EEF1F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gradeButtonText: {
    color: '#121417',
    fontSize: 12,
    fontWeight: '600',
  },
  gradePickerRow: {
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 24,
    flexDirection: 'row',
    gap: 8,
  },
  gradeActionRow: {
    marginTop: -6,
    marginBottom: 12,
    marginLeft: 24,
    backgroundColor: '#2A2016',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  gradeActionRowText: {
    color: '#F6D3A7',
    fontSize: 13,
    fontWeight: '700',
  },
  gradeChip: {
    backgroundColor: '#C89153',
    borderRadius: 10,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeChipText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6D7680',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#121417',
    marginBottom: 8,
    marginTop: 10,
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DEE3EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButtonText: {
    color: '#121417',
    fontSize: 14,
  },
  dateButtonIcon: {
    fontSize: 20,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
});


