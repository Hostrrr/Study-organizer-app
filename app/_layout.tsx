import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDb } from '@/database/db';
import { runDebugSeeds } from '@/database/debug-seeds';
import { Colors } from '@/constants/theme';
import { useDebugSeeds } from '@/hooks/use-debug-seeds';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFirstLaunch } from '@/hooks/use-first-launch';
import StartupScreen from './startup';

// Предотвращаем автоматическое скрытие splash screen
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeName = colorScheme === 'dark' ? 'dark' : 'light';
  const appColors = Colors[themeName];
  const { isFirstLaunch, isLoading } = useFirstLaunch();
  const { debugSeedsEnabled, isDebugSeedsLoading } = useDebugSeeds();
  const [dbInitialized, setDbInitialized] = useState(false);
  const shouldAutoRunDebugSeeds =
    __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEBUG_SEEDS === 'true';

  // Загружаем шрифты
  const [fontsLoaded, fontError] = useFonts({
    'Glanz': require('../assets/fonts/Glanz.otf'),
  });

  useEffect(() => {
    try {
      initDb();
      setDbInitialized(true);
    } catch (error) {
      console.error('[DB] Error initializing database:', error);
      // Продолжаем работу даже при ошибке БД
      setDbInitialized(true);
    }
  }, []);

  // Скрываем splash screen когда все загружено (или при ошибке загрузки шрифтов)
  useEffect(() => {
    if (!dbInitialized || isDebugSeedsLoading) {
      return;
    }

    if (!shouldAutoRunDebugSeeds || !debugSeedsEnabled) {
      return;
    }

    const result = runDebugSeeds();
    console.log('[DEBUG_SEEDS] Auto run result:', result.message);
  }, [dbInitialized, debugSeedsEnabled, isDebugSeedsLoading, shouldAutoRunDebugSeeds]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && dbInitialized && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbInitialized, isLoading]);

  // Показываем загрузку пока проверяем первый запуск, инициализируем БД и загружаем шрифты
  // Продолжаем работу даже если шрифты не загрузились (используем системные)
  if (isLoading || !dbInitialized || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={appColors.accent} />
          <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Показываем startup экран при первом запуске
  if (isFirstLaunch) {
    return (
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StartupScreen />
          <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  // Обычное приложение
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="date-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="add-lesson" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="add-homework" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-schedule" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="note-editor" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="flashcard-review" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="subject-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="vault-sync" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="startup" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
        <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});