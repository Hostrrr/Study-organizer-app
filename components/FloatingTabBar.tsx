import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FloatingTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        
        // Пропускаем маршруты, которые должны быть скрыты из таббара
        if (options.tabBarButton === null || route.name === 'index') {
          return null;
        }
        
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;
        const iconName = options.tabBarIconName || 'home';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? '#ffffffff' : '#999'}
            />
            <Text style={[styles.label, isFocused && styles.activeLabel]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000ff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 8,
    paddingBottom: 25,
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#d3d3d3ff',
    fontSize: 12,
    marginTop: 2,
  },
  activeLabel: {
    color: '#ffffffff',
    fontWeight: '700',
  },
});