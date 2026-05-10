import { useExams } from '@/hooks/use-exams';
import { useGrades } from '@/hooks/use-grades';
import { Exam } from '@/types/db';
import { useCallback } from 'react';

type SetExamGradeParams = {
  exam: Exam;
  subjectId: number;
  grade: number;
};

export function useAssessmentActions() {
  const { toggle: toggleExam, remove: removeExam, reload: reloadExams } = useExams();
  const { create: createGrade, reload: reloadGrades } = useGrades();

  const refreshAll = useCallback(() => {
    reloadExams();
    reloadGrades();
  }, [reloadExams, reloadGrades]);

  const setExamGrade = useCallback(
    ({ exam, subjectId, grade }: SetExamGradeParams) => {
      const description = `${exam.type} (${exam.date})`;
      createGrade(subjectId, grade, description, exam.date, exam.id);
      toggleExam(exam.id, true);
      refreshAll();
    },
    [createGrade, toggleExam, refreshAll]
  );

  const setExamDone = useCallback(
    (examId: number, done: boolean) => {
      toggleExam(examId, done);
      refreshAll();
    },
    [toggleExam, refreshAll]
  );

  const deleteExamEntry = useCallback(
    (examId: number) => {
      removeExam(examId);
      refreshAll();
    },
    [removeExam, refreshAll]
  );

  return {
    setExamGrade,
    setExamDone,
    deleteExamEntry,
    refreshAll,
  };
}
