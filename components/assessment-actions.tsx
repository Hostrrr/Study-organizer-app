import { useAppTheme } from '@/hooks/use-app-theme';
import { Exam } from '@/types/db';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  exam: Exam;
  compact?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onToggleDone: (exam: Exam, done: boolean) => void;
  onDelete: (exam: Exam) => void;
  onSetGrade: (exam: Exam, grade: number) => void;
};

export default function AssessmentActions({
  exam,
  compact = false,
  expanded = false,
  onToggleExpanded,
  onToggleDone,
  onDelete,
  onSetGrade,
}: Props) {
  const { colors } = useAppTheme();
  const isCompleted = exam.is_completed === 1;
  const chips = [2, 3, 4, 5];

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => onToggleDone(exam, !isCompleted)}
          style={[styles.checkButton, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
        >
          <Ionicons name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={isCompleted ? colors.success : colors.textMuted} />
          {!compact && <Text style={[styles.actionText, { color: colors.textSecondary }]}>{isCompleted ? 'Выполнено' : 'Отметить'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(exam)} style={[styles.deleteButton, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleExpanded} style={[styles.gradeButton, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.gradeButtonText, { color: colors.accent }]}>Оценка</Text>
        </TouchableOpacity>
      </View>
      {expanded && (
        <View style={styles.chips}>
          {chips.map((grade) => (
            <TouchableOpacity key={`${exam.id}-${grade}`} onPress={() => onSetGrade(exam, grade)} style={[styles.chip, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>{grade}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionText: { fontSize: 13, fontWeight: '500' },
  deleteButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  gradeButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  gradeButtonText: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 34,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
