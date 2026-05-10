import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useThemePreference } from './use-theme-preference';

export { type ThemePreference, useThemePreference } from './use-theme-preference';

export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme();
  const { themePreference } = useThemePreference();

  if (themePreference === 'system') {
    return nativeColorScheme ?? 'light';
  }

  return themePreference;
}
