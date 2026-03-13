/**
 * Утилиты для работы с экзаменами
 */

/**
 * Проверяет, является ли экзамен контрольной работой
 * Контрольные: midterm, final, контрольная
 */
export function isControlWork(examType: string): boolean {
  const type = examType.toLowerCase();
  return type === 'midterm' || type === 'final' || type === 'контрольная';
}

/**
 * Проверяет, является ли экзамен проверочной работой
 * Проверочные: credit, lab, oral, проверочная
 */
export function isTestWork(examType: string): boolean {
  const type = examType.toLowerCase();
  return type === 'credit' || type === 'lab' || type === 'oral' || type === 'проверочная';
}

/**
 * Определяет тип экзамена (контрольная или проверочная)
 * @returns 'control' | 'test' | null
 */
export function getExamWorkType(examType: string): 'control' | 'test' | null {
  if (isControlWork(examType)) {
    return 'control';
  }
  if (isTestWork(examType)) {
    return 'test';
  }
  return null;
}

