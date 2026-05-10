import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from './use-theme-preference';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const { themePreference } = useThemePreference();

  if (hasHydrated) {
    if (themePreference === 'system') {
      return colorScheme ?? 'light';
    }
    return themePreference;
  }

  return 'light';
}
