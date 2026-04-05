import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../context/theme';

export function LoadingState() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
