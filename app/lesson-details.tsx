import { DARK_CALENDAR_THEME } from '@/constants/calendar-theme';
import { getExamsBySubjectId, getExamsBySubjectIdAndDate, getHomeworkByLessonId, getLessonById, getNotesByLessonId } from '@/database/queries';
import { useExams } from '@/hooks/use-exams';
import { useHomework } from '@/hooks/use-homework';
import { useNotes } from '@/hooks/use-notes';
import { Exam, Homework, Lesson, Note } from '@/types/db';
import { isControlWork, isTestWork } from '@/utils/exam-utils';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Локализация календаря
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
  firstDayOfWeek: 1,
};
LocaleConfig.defaultLocale = 'ru';

export default function LessonDetailsScreen() {
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

  const { create: createHomework, remove: removeHomework, reload: reloadHomework, toggle: toggleHomework } = useHomework();
  const { create: createExam, remove: removeExam, reload: reloadExams, toggle: toggleExam } = useExams();
  const { create: createNote, reload: reloadNotes } = useNotes();

  // Получаем дату урока (из параметров или сегодняшнюю)
  const lessonDate = date || new Date().toISOString().split('T')[0];
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
    toggleExam(examId, currentStatus !== 1);
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
            removeExam(examId);
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

  if (!lesson) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Заголовок с названием пары */}
        <Text style={styles.title}>{lesson.subject_name || `Предмет #${lesson.subject_id}`}</Text>
        
        {/* Тип пары */}
        <Text style={styles.type}>{lesson.type}</Text>
        
        {/* Преподаватель и аудитория */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {lesson.teacher_name || `Преподаватель #${lesson.teacher_id}`}
          </Text>
          {lesson.room && (
            <Text style={styles.infoText}> · {lesson.room}</Text>
          )}
        </View>

        {/* Время */}
        <Text style={styles.time}>
          {lesson.start_time} - {lesson.end_time}
        </Text>

        {/* Список контрольных работ */}
        {controlWorks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контрольные работы</Text>
            {controlWorks.map((exam) => {
              const isCompleted = exam.is_completed === 1;
              return (
                <View key={exam.id} style={styles.workItem}>
                  <View style={[styles.workIndicator, styles.controlWorkIndicator]} />
                  <View style={styles.workContent}>
                    <Text style={[styles.workTitle, isCompleted && styles.workTitleCompleted]}>{exam.type}</Text>
                    {exam.room && (
                      <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Аудитория: {exam.room}</Text>
                    )}
                    <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Дата: {exam.date}</Text>
                  </View>
                  <View style={styles.workActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleExam(exam.id, exam.is_completed || 0)}
                      style={styles.checkboxContainer}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                        {isCompleted && <Ionicons name="checkmark" size={16} color="#000" />}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExam(exam.id)}
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

        {/* Список проверочных работ */}
        {testWorks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Проверочные работы</Text>
            {testWorks.map((exam) => {
              const isCompleted = exam.is_completed === 1;
              return (
                <View key={exam.id} style={styles.workItem}>
                  <View style={[styles.workIndicator, styles.testWorkIndicator]} />
                  <View style={styles.workContent}>
                    <Text style={[styles.workTitle, isCompleted && styles.workTitleCompleted]}>{exam.type}</Text>
                    {exam.room && (
                      <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Аудитория: {exam.room}</Text>
                    )}
                    <Text style={[styles.workSubtitle, isCompleted && styles.workSubtitleCompleted]}>Дата: {exam.date}</Text>
                  </View>
                  <View style={styles.workActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleExam(exam.id, exam.is_completed || 0)}
                      style={styles.checkboxContainer}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                        {isCompleted && <Ionicons name="checkmark" size={16} color="#000" />}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExam(exam.id)}
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

        {/* Список домашних заданий */}
        {homework.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Домашние задания</Text>
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
                        {isCompleted && <Ionicons name="checkmark" size={16} color="#000" />}
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
                    theme={DARK_CALENDAR_THEME}
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
                    theme={DARK_CALENDAR_THEME}
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
          <Text style={styles.sectionTitle}>Заметки</Text>
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Glanz',
  },
  type: {
    fontSize: 26,
    color: '#C89153',
    marginBottom: 12,
    fontFamily: 'Glanz',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#999',
  },
  time: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
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
    color: '#fff',
    marginBottom: 4,
  },
  workTitleCompleted: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  workSubtitle: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#C89153',
    fontSize: 14,
    textAlign: 'center',
  },
  addForm: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
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
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  typeButtonText: {
    color: '#999',
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
    color: '#999',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  noteDate: {
    color: '#999',
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
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  dateButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  dateButtonIcon: {
    fontSize: 20,
  },
  calendarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
});


