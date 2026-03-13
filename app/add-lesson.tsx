import { useLessons } from '@/hooks/use-lessons';
import { useScheduleSettings } from '@/hooks/use-schedule-settings';
import { useSubjects } from '@/hooks/use-subjects';
import { useTeachers } from '@/hooks/use-teachers';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

export default function AddLessonScreen() {
  const { subjects, create: createSubject } = useSubjects();
  const { teachers, create: createTeacher } = useTeachers();
  const { create: createLesson } = useLessons();
  const { settings } = useScheduleSettings();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('Лекция');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [room, setRoom] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<number | null>(settings.scheduleFormat === 1 ? null : 0);

  // Для создания новых предметов и преподавателей
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [showNewSubjectInput, setShowNewSubjectInput] = useState(false);
  const [showNewTeacherInput, setShowNewTeacherInput] = useState(false);

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      createSubject(newSubjectName.trim());
      setNewSubjectName('');
      setShowNewSubjectInput(false);
    }
  };

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      createTeacher(newTeacherName.trim());
      setNewTeacherName('');
      setShowNewTeacherInput(false);
    }
  };

  const handleSave = () => {
    if (!selectedSubjectId || !selectedTeacherId) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите предмет и преподавателя');
      return;
    }

    if (!startTime || !endTime) {
      Alert.alert('Ошибка', 'Пожалуйста, укажите время начала и окончания');
      return;
    }

    createLesson(
      selectedSubjectId,
      selectedTeacherId,
      selectedType,
      selectedDay,
      startTime,
      endTime,
      room || undefined,
      weekNumber
    );

    Alert.alert('Успешно', 'Урок добавлен в расписание', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Добавить урок</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Сохранить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Выбор предмета */}
        <View style={styles.section}>
          <Text style={styles.label}>Предмет</Text>
          {!showNewSubjectInput ? (
            <>
              <View style={styles.optionsContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => setSelectedSubjectId(subject.id)}
                    style={[
                      styles.option,
                      selectedSubjectId === subject.id && styles.selectedOption,
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        selectedSubjectId === subject.id && styles.selectedOptionText,
                      ]}>
                      {subject.name}
                    </Text>
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

        {/* Выбор преподавателя */}
        <View style={styles.section}>
          <Text style={styles.label}>Преподаватель</Text>
          {!showNewTeacherInput ? (
            <>
              <View style={styles.optionsContainer}>
                {teachers.map((teacher) => (
                  <TouchableOpacity
                    key={teacher.id}
                    onPress={() => setSelectedTeacherId(teacher.id)}
                    style={[
                      styles.option,
                      selectedTeacherId === teacher.id && styles.selectedOption,
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        selectedTeacherId === teacher.id && styles.selectedOptionText,
                      ]}>
                      {teacher.name}
                    </Text>
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

        {/* Тип урока */}
        <View style={styles.section}>
          <Text style={styles.label}>Тип урока</Text>
          <View style={styles.typeContainer}>
            {LESSON_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setSelectedType(type.value)}
                style={[
                  styles.typeOption,
                  selectedType === type.value && styles.selectedTypeOption,
                ]}>
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === type.value && styles.selectedTypeOptionText,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* День недели */}
        <View style={styles.section}>
          <Text style={styles.label}>День недели</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
            {DAYS_OF_WEEK.map((day, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDay(index)}
                style={[
                  styles.option,
                  selectedDay === index && styles.selectedOption,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    selectedDay === index && styles.selectedOptionText,
                  ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Время */}
        <View style={styles.section}>
          <Text style={styles.label}>Время</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.timeLabel}>Начало</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="09:00"
                value={startTime}
                onChangeText={setStartTime}
                keyboardType="default"
              />
            </View>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.timeLabel}>Окончание</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="10:30"
                value={endTime}
                onChangeText={setEndTime}
                keyboardType="default"
              />
            </View>
          </View>
        </View>

        {/* Неделя (только для формата "две недели") */}
        {settings.scheduleFormat === 2 && (
          <View style={styles.section}>
            <Text style={styles.label}>Неделя</Text>
            <View style={styles.weekContainer}>
              <TouchableOpacity
                onPress={() => setWeekNumber(null)}
                style={[
                  styles.weekOption,
                  weekNumber === null && styles.weekOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.weekOptionText,
                    weekNumber === null && styles.weekOptionTextSelected,
                  ]}>
                  Обе недели
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeekNumber(0)}
                style={[
                  styles.weekOption,
                  weekNumber === 0 && styles.weekOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.weekOptionText,
                    weekNumber === 0 && styles.weekOptionTextSelected,
                  ]}>
                  Неделя A
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWeekNumber(1)}
                style={[
                  styles.weekOption,
                  weekNumber === 1 && styles.weekOptionSelected,
                ]}>
                <Text
                  style={[
                    styles.weekOptionText,
                    weekNumber === 1 && styles.weekOptionTextSelected,
                  ]}>
                  Неделя B
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Аудитория */}
        <View style={styles.section}>
          <Text style={styles.label}>Аудитория (необязательно)</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Аудитория 129"
            value={room}
            onChangeText={setRoom}
          />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    color: '#C89153',
    fontSize: 16,
    fontWeight: '600',
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
  weekContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  weekOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  weekOptionSelected: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  weekOptionText: {
    color: '#999',
    fontSize: 14,
  },
  weekOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
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
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  selectedTypeOption: {
    backgroundColor: '#C89153',
    borderColor: '#C89153',
  },
  typeOptionText: {
    color: '#999',
    fontSize: 14,
  },
  selectedTypeOptionText: {
    color: '#000',
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
});

