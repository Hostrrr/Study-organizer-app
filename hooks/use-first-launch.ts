import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const FIRST_LAUNCH_KEY = '@study_organizer:first_launch';

export function useFirstLaunch() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      setIsFirstLaunch(value === null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking first launch:', error);
      setIsFirstLaunch(true);
      setIsLoading(false);
    }
  };

  const completeFirstLaunch = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error completing first launch:', error);
    }
  };

  return { isFirstLaunch, isLoading, completeFirstLaunch };
}

