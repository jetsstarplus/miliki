import { Stack } from 'expo-router';
import { useTheme } from '@/context/theme';

export default function UnmatchedLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
