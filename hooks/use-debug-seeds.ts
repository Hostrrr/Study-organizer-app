import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const DEBUG_SEEDS_ENABLED_KEY = '@study_organizer:debug_seeds_enabled';

export function useDebugSeeds() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEBUG_SEEDS_ENABLED_KEY);
        setEnabled(stored === 'true');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const setDebugSeedsEnabled = async (nextValue: boolean) => {
    try {
      await AsyncStorage.setItem(DEBUG_SEEDS_ENABLED_KEY, nextValue ? 'true' : 'false');
      setEnabled(nextValue);
      return true;
    } catch (error) {
      console.error('[DEBUG_SEEDS] Failed to save toggle:', error);
      return false;
    }
  };

  return {
    debugSeedsEnabled: enabled,
    isDebugSeedsLoading: isLoading,
    setDebugSeedsEnabled,
  };
}
