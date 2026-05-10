import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 10);
  const canUseLiquidGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  return (
    <View style={[styles.wrapper, { paddingBottom: tabBarBottom }]}>
      <View style={[styles.container, { borderColor: colors.borderSubtle }]}>
        {canUseLiquidGlass ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? 'dark' : 'light'}
            tintColor={colors.glassTint}
            glassEffectStyle="regular"
            isInteractive={false}
          />
        ) : (
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={isDark ? 45 : 60}
            tint={isDark ? 'dark' : 'light'}
          />
        )}
        {!canUseLiquidGlass && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceGlass }]} />}
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
              color={isFocused ? colors.textPrimary : colors.textMuted}
            />
            <Text
              style={[
                styles.label,
                { color: colors.textMuted, fontFamily: typography.fonts.body },
                isFocused && [styles.activeLabel, { color: colors.textPrimary }],
              ]}
            >
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
    borderWidth: 1,
    marginHorizontal: 14,
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 10,
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  activeLabel: {
    fontWeight: '700',
  },
});