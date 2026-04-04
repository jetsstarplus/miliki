import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/theme';

export function LoadingState() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
