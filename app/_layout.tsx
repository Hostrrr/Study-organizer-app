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
  const { isFirstLaunch, isLoading } = useFirstLaunch();
  const [dbInitialized, setDbInitialized] = useState(false);

  // Загружаем шрифты
  const [fontsLoaded, fontError] = useFonts({
    'Glanz': require('../assets/fonts/Glanz.otf'),
    'Glanz-Italic': require('../assets/fonts/Glanz Italic.otf'),
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
          <ActivityIndicator size="large" color="#C89153" />
          <StatusBar style="light" />
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
          <StatusBar style="light" />
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
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="lesson-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="date-details" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="add-lesson" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="add-homework" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="edit-schedule" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="startup" options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});