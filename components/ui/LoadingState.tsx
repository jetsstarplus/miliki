import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../context/theme';

export function LoadingState() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
