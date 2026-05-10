import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  useLiquidGlass?: boolean;
};

export default function PrimaryFab({ onPress, icon = 'add', useLiquidGlass = true }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 10) + 74;
  const canUseGlass =
    useLiquidGlass &&
    Platform.OS === 'ios' &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: canUseGlass ? 'transparent' : colors.accent,
          borderColor: canUseGlass ? colors.borderSubtle : 'transparent',
          borderWidth: canUseGlass ? 1 : 0,
          bottom: bottomOffset,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {canUseGlass && (
        <View pointerEvents="none" style={styles.glassOverlay}>
          <GlassView
            style={StyleSheet.absoluteFill}
            colorScheme={isDark ? 'dark' : 'light'}
            tintColor={colors.glassTint}
            glassEffectStyle="regular"
            isInteractive={false}
          />
        </View>
      )}
      <Ionicons name={icon} size={28} color={colors.inverseText} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    zIndex: 30,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    overflow: 'hidden',
  },
});
