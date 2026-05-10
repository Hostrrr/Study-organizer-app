import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const THEME_PREFERENCE_KEY = 'themePreference';

export type ThemePreference = 'system' | 'light' | 'dark';

export async function persistThemePreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
}

export function useThemePreference() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setThemePreferenceState(value);
        }
      })
      .catch(() => {
        // keep system fallback
      });
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await persistThemePreference(preference);
  };

  return {
    themePreference,
    setThemePreference,
  };
}
