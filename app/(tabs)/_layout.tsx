import FloatingTabBar from '@/components/FloatingTabBar';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="schedule"
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: () => null, // Полностью скрываем из таб-бара
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Расписание',
          tabBarIconName: 'book-outline',
        } as any}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Календарь',
          tabBarIconName: 'calendar-outline',
        } as any}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Знания',
          tabBarIconName: 'document-text-outline',
        } as any}
      />
    </Tabs>
  );
}