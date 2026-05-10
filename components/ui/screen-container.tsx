import { useAppTheme } from '@/hooks/use-app-theme';
import React, { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
}>;

export default function ScreenContainer({ children, style }: Props) {
  const { colors } = useAppTheme();
  return <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
