import { Colors, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[themeName];

  return {
    isDark: themeName === 'dark',
    colors,
    typography: Typography,
  };
}
