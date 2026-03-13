import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { useSubjects } from '@/hooks/use-subjects';
import { useTeachers } from '@/hooks/use-teachers';
import { Lesson } from '@/types/db';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const LESSON_TYPES = [
  { value: 'Лекция', label: 'Лекция' },
  { value: 'Практика', label: 'Практика' },
];

interface LessonForm {
  id?: number; // ID существующего урока, если редактируем
  subjectId: number | null;
  teacherId: number | null;
  type: string;
  timeSlot: number;
  room: string;
  weekNumber: number | null;
}

export default function EditScheduleScreen() {
  const { subjects, create: createSubject, remove: removeSubject, reload: reloadSubjects } = useSubjects();
  const { teachers, create: createTeacher, remove: removeTeacher, reload: reloadTeachers } = useTeachers();
  const { lessons, create: createLesson, remove: removeLesson, reload: reloadLessons } = useLessons();
  const { generateTimeSlots, settings } = useScheduleSettings();

  // Генерируем временные слоты на основе настроек (до 21:00)
  const TIME_SLOTS = useMemo(() => generateTimeSlots(), [
    settings.firstLessonStartTime,
    settings.lessonDuration,
    settings.breakDuration,
    settings.longBreakAfterLesson,
    settings.longBreakDuration,
  ]);

  const [currentDay, setCurrentDay] = useState<number>(0);
  const [lessonsByDay, setLessonsByDay] = useState<Record<number, LessonForm[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });
  // Функция для загрузки уроков в форму
  const loadLessonsIntoForm = useCallback(() => {
    const loadedLessons: Record<number, LessonForm[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    lessons.forEach((lesson: Lesson) => {
      const day = lesson.day_of_week;
      if (day >= 0 && day <= 6) {
        // Находим соответствующий временной слот
        const timeSlotIndex = TIME_SLOTS.findIndex(
          slot => slot.start === lesson.start_time && slot.end === lesson.end_time
        );
        
        loadedLessons[day].push({
          id: lesson.id,
          subjectId: lesson.subject_id,
          teacherId: lesson.teacher_id,
          type: lesson.type,
          timeSlot: timeSlotIndex >= 0 ? timeSlotIndex : 0,
          room: lesson.room || '',
          weekNumber: lesson.week_number ?? null,
        });
      }
    });

    setLessonsByDay(loadedLessons);
  }, [lessons, TIME_SLOTS]);

  // Загружаем существующие уроки при изменении lessons или TIME_SLOTS
  useEffect(() => {
    loadLessonsIntoForm();
  }, [loadLessonsIntoForm]);

  // Перезагружаем данные при возврате на экран
  useFocusEffect(
    useCallback(() => {
      reloadLessons();
      reloadSubjects();
      reloadTeachers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Для создания новых предметов и преподавателей
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
  const [showNewTeacherInput, setShowNewTeacherInput] = useState(false);

  // Для выпадающих списков в карточках уроков
  const [showSubjectPicker, setShowSubjectPicker] = useState<number | null>(null); // индекс урока
  const [showTeacherPicker, setShowTeacherPicker] = useState<number | null>(null); // индекс урока

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      createSubject(newSubjectName.trim());
      setNewSubjectName('');
      setShowNewSubjectInput(false);
      setTimeout(() => reloadSubjects(), 100);
    }
  };

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      createTeacher(newTeacherName.trim());
      setNewTeacherName('');
      setShowNewTeacherInput(false);
      setTimeout(() => reloadTeachers(), 100);
    }
  };

  const handleDeleteSubject = (subjectId: number, subjectName: string) => {
    Alert.alert(
      'Удалить предмет',
      `Вы уверены, что хотите удалить предмет "${subjectName}"? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeSubject(subjectId);
            setTimeout(() => reloadSubjects(), 100);
          },
        },
      ]
    );
  };

  const handleDeleteTeacher = (teacherId: number, teacherName: string) => {
    Alert.alert(
      'Удалить преподавателя',
      `Вы уверены, что хотите удалить преподавателя "${teacherName}"? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeTeacher(teacherId);
            setTimeout(() => reloadTeachers(), 100);
          },
        },
      ]
    );
  };

  const addLessonToDay = () => {
    const newLesson: LessonForm = {
      subjectId: null,
      teacherId: null,
      type: 'Лекция',
      timeSlot: 0,
      room: '',
      weekNumber: settings.scheduleFormat === 1 ? null : 0,
    };
    setLessonsByDay(prev => ({
      ...prev,
      [currentDay]: [...prev[currentDay], newLesson],
    }));
  };

  const updateLesson = (index: number, field: keyof LessonForm, value: any) => {
    setLessonsByDay(prev => {
      const dayLessons = [...prev[currentDay]];
      dayLessons[index] = { ...dayLessons[index], [field]: value };
      return { ...prev, [currentDay]: dayLessons };
    });
  };

  const removeLessonFromDay = (index: number) => {
    const lesson = lessonsByDay[currentDay][index];
    if (lesson.id) {
      // Удаляем существующий урок из базы
      Alert.alert(
        'Удалить урок',
        'Вы уверены, что хотите удалить этот урок?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              removeLesson(lesson.id!);
              setLessonsByDay(prev => {
                const dayLessons = [...prev[currentDay]];
                dayLessons.splice(index, 1);
                return { ...prev, [currentDay]: dayLessons };
              });
            },
          },
        ]
      );
    } else {
      // Просто удаляем из формы
      setLessonsByDay(prev => {
        const dayLessons = [...prev[currentDay]];
        dayLessons.splice(index, 1);
        return { ...prev, [currentDay]: dayLessons };
      });
    }
  };

  const handleSave = () => {
    // Сохраняем все изменения
    let hasChanges = false;
    for (let day = 0; day < 7; day++) {
      const dayLessons = lessonsByDay[day];
      for (const lesson of dayLessons) {
        if (lesson.subjectId && lesson.teacherId) {
          const timeSlot = TIME_SLOTS[lesson.timeSlot];
          
          if (lesson.id) {
            // Обновляем существующий урок: удаляем старый и создаем новый
            removeLesson(lesson.id);
          }
          
          // Создаем урок (новый или обновленный)
          createLesson(
            lesson.subjectId,
            lesson.teacherId,
            lesson.type,
            day,
            timeSlot.start,
            timeSlot.end,
            lesson.room || undefined,
            lesson.weekNumber
          );
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      Alert.alert('Успешно', 'Расписание обновлено', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const currentDayLessons = lessonsByDay[currentDay];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Редактировать расписание</Text>
        </View>
        <View style={styles.closeButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Добавление предметов */}
        <View style={styles.section}>
          <Text style={styles.label}>Предметы</Text>
          {!showNewSubjectInput ? (
            <>
              <View style={styles.optionsContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.option}
                    onLongPress={() => handleDeleteSubject(subject.id, subject.name)}>
                    <Text style={styles.optionText}>{subject.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setShowNewSubjectInput(true)}
                style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Добавить предмет</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Название предмета"
                placeholderTextColor="#666"
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                autoFocus
              />
              <View style={styles.newInputButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewSubjectInput(false);
                    setNewSubjectName('');
                  }}
                  style={styles.cancelNewButton}>
                  <Text style={styles.cancelNewText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddSubject} style={styles.confirmNewButton}>
                  <Text style={styles.confirmNewText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Добавление преподавателей */}
        <View style={styles.section}>
          <Text style={styles.label}>Преподаватели</Text>
          {!showNewTeacherInput ? (
            <>
              <View style={styles.optionsContainer}>
                {teachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.id}
                    style={styles.option}
                    onLongPress={() => handleDeleteTeacher(teacher.id, teacher.name)}>
                    <Text style={styles.optionText}>{teacher.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setShowNewTeacherInput(true)}
                style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Добавить преподавателя</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.newInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Имя преподавателя"
                placeholderTextColor="#666"
                value={newTeacherName}
                onChangeText={setNewTeacherName}
                autoFocus
              />
              <View style={styles.newInputButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowNewTeacherInput(false);
                    setNewTeacherName('');
                  }}
                  style={styles.cancelNewButton}>
                  <Text style={styles.cancelNewText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddTeacher} style={styles.confirmNewButton}>
                  <Text style={styles.confirmNewText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Выбор дня недели */}
        <View style={styles.section}>
          <Text style={styles.label}>День недели</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
            {DAYS_OF_WEEK.map((day, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentDay(index)}
                style={[
                  styles.option,
                  currentDay === index && styles.selectedOption,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    currentDay === index && styles.selectedOptionText,
                  ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Уроки для выбранного дня */}
        <View style={styles.section}>
          <View style={styles.lessonsHeader}>
            <Text style={styles.label}>Уроки на {DAYS_OF_WEEK[currentDay]}</Text>
            <TouchableOpacity onPress={addLessonToDay} style={styles.addLessonButton}>
              <Text style={styles.addLessonButtonText}>+ Добавить урок</Text>
            </TouchableOpacity>
          </View>

          {currentDayLessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Пока нет уроков</Text>
              <Text style={styles.emptyStateSubtext}>Нажмите &quot;Добавить урок&quot; чтобы начать</Text>
            </View>
          ) : (
            currentDayLessons.map((lesson, index) => (
              <View key={index} style={styles.lessonCard}>
                <View style={styles.lessonCardHeader}>
                  <Text style={styles.lessonNumber}>Урок {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeLessonFromDay(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Предмет */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Предмет</Text>
                  <TouchableOpacity
                    onPress={() => setShowSubjectPicker(index)}
                    style={styles.dropdownButton}>
                    <Text style={[
                      styles.dropdownButtonText,
                      !lesson.subjectId && styles.dropdownButtonTextPlaceholder
                    ]}>
                      {lesson.subjectId 
                        ? subjects.find(s => s.id === lesson.subjectId)?.name || 'Выберите предмет'
                        : 'Выберите предмет'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Преподаватель */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Преподаватель</Text>
                  <TouchableOpacity
                    onPress={() => setShowTeacherPicker(index)}
                    style={styles.dropdownButton}>
                    <Text style={[
                      styles.dropdownButtonText,
                      !lesson.teacherId && styles.dropdownButtonTextPlaceholder
                    ]}>
                      {lesson.teacherId 
                        ? teachers.find(t => t.id === lesson.teacherId)?.name || 'Выберите преподавателя'
                        : 'Выберите преподавателя'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Тип */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Тип</Text>
                  <View style={styles.typeContainer}>
                    {LESSON_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        onPress={() => updateLesson(index, 'type', type.value)}
                        style={[
                          styles.typeOption,
                          lesson.type === type.value && styles.selectedTypeOption,
                        ]}>
                        <Text
                          style={[
                            styles.typeOptionText,
                            lesson.type === type.value && styles.selectedTypeOptionText,
                          ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Время */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Время</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TIME_SLOTS.map((slot, slotIndex) => (
                      <TouchableOpacity
                        key={slotIndex}
                        onPress={() => updateLesson(index, 'timeSlot', slotIndex)}
                        style={[
                          styles.timeSlotOption,
                          lesson.timeSlot === slotIndex && styles.timeSlotOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.timeSlotText,
                            lesson.timeSlot === slotIndex && styles.timeSlotTextSelected,
                          ]}>
                          {slot.start}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Неделя (только для формата "две недели") */}
                {settings.scheduleFormat === 2 && (
                  <View style={styles.lessonField}>
                    <Text style={styles.lessonFieldLabel}>Неделя</Text>
                    <View style={styles.weekContainer}>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', null)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === null && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === null && styles.weekOptionTextSelected,
                          ]}>
                          Обе недели
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', 0)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === 0 && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === 0 && styles.weekOptionTextSelected,
                          ]}>
                          Неделя A
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateLesson(index, 'weekNumber', 1)}
                        style={[
                          styles.weekOption,
                          lesson.weekNumber === 1 && styles.weekOptionSelected,
                        ]}>
                        <Text
                          style={[
                            styles.weekOptionText,
                            lesson.weekNumber === 1 && styles.weekOptionTextSelected,
                          ]}>
                          Неделя B
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Аудитория */}
                <View style={styles.lessonField}>
                  <Text style={styles.lessonFieldLabel}>Аудитория (необязательно)</Text>
                  <TextInput
                    style={styles.lessonInput}
                    placeholder="Например: Аудитория 129"
                    placeholderTextColor="#666"
                    value={lesson.room}
                    onChangeText={(value) => updateLesson(index, 'room', value)}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Кнопка сохранения */}
        <TouchableOpacity onPress={handleSave} style={styles.completeButton}>
          <Text style={styles.completeButtonText}>Сохранить изменения</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно выбора предмета */}
      <Modal
        visible={showSubjectPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите предмет</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => {
                    if (showSubjectPicker !== null) {
                      updateLesson(showSubjectPicker, 'subjectId', subject.id);
                      setShowSubjectPicker(null);
                    }
                  }}
                  style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>{subject.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно выбора преподавателя */}
      <Modal
        visible={showTeacherPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeacherPicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTeacherPicker(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите преподавателя</Text>
              <TouchableOpacity onPress={() => setShowTeacherPicker(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {teachers.map((teacher) => (
                <TouchableOpacity
                  key={teacher.id}
                  onPress={() => {
                    if (showTeacherPicker !== null) {
                      updateLesson(showTeacherPicker, 'teacherId', teacher.id);
                      setShowTeacherPicker(null);
                    }
                  }}
                  style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>{teacher.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Glanz',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  optionText: {
    color: '#999',
    fontSize: 12,
  },
  selectedOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#C89153',
    fontSize: 14,
    textAlign: 'center',
  },
  newInputContainer: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  newInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelNewText: {
    color: '#999',
    fontSize: 14,
  },
  confirmNewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#C89153',
    borderRadius: 8,
  },
  confirmNewText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  lessonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addLessonButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#C89153',
    borderRadius: 12,
  },
  addLessonButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#444',
    fontSize: 12,
  },
  lessonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lessonNumber: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: '600',
  },
  lessonField: {
    marginBottom: 16,
  },
  lessonFieldLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  lessonOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  lessonOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
  },
  lessonOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  lessonOptionText: {
    color: '#999',
    fontSize: 11,
  },
  lessonOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  selectedTypeOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  typeOptionText: {
    color: '#999',
    fontSize: 12,
  },
  selectedTypeOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  timeSlotOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#000',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeSlotOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  timeSlotText: {
    color: '#999',
    fontSize: 12,
  },
  timeSlotTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  weekContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  weekOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  weekOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  weekOptionText: {
    color: '#999',
    fontSize: 12,
  },
  weekOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  lessonInput: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  completeButton: {
    backgroundColor: '#C89153',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  completeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  dropdownButtonTextPlaceholder: {
    color: '#666',
  },
  dropdownArrow: {
    color: '#999',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalClose: {
    color: '#999',
    fontSize: 24,
    fontWeight: '300',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
  },
});

