import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Определяем размеры экрана
export const isTablet = SCREEN_WIDTH >= 768;
export const isDesktop = SCREEN_WIDTH >= 1024;

// Максимальная ширина контента для больших экранов
export const MAX_CONTENT_WIDTH = 1200;

// Вычисляем ширину контента с учетом максимальной ширины
export const getContentWidth = () => {
  if (isDesktop) {
    return Math.min(SCREEN_WIDTH, MAX_CONTENT_WIDTH);
  }
  return SCREEN_WIDTH;
};

// Вычисляем горизонтальные отступы
export const getHorizontalPadding = () => {
  if (isDesktop) {
    return Math.max(20, (SCREEN_WIDTH - MAX_CONTENT_WIDTH) / 2);
  }
  if (isTablet) {
    return 40;
  }
  return 20;
};

// Масштабирование шрифтов для больших экранов
export const scaleFontSize = (baseSize: number) => {
  if (isDesktop) {
    return baseSize * 1.1;
  }
  if (isTablet) {
    return baseSize * 1.05;
  }
  return baseSize;
};

// Масштабирование отступов для больших экранов
export const scalePadding = (basePadding: number) => {
  if (isDesktop) {
    return basePadding * 1.2;
  }
  if (isTablet) {
    return basePadding * 1.1;
  }
  return basePadding;
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };

