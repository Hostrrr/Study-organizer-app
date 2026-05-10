import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ScreenHeaderAction = 'back' | 'close' | 'none';

type Props = {
  title?: string;
  action?: ScreenHeaderAction;
  onActionPress?: () => void;
};

export default function ScreenHeader({ title, action = 'back', onActionPress }: Props) {
  const { colors } = useAppTheme();

  const iconName = action === 'close' ? 'close' : 'arrow-back';
  const showAction = action !== 'none';
  const handlePress = onActionPress ?? (() => router.back());

  return (
    <View style={styles.row}>
      {showAction ? (
        <TouchableOpacity onPress={handlePress} hitSlop={8} style={styles.actionButton}>
          <Ionicons name={iconName} size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      {title ? <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text> : <View style={styles.placeholder} />}
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  actionButton: {
    width: 36,
    alignItems: 'flex-start',
  },
  placeholder: {
    width: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
