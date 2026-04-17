import { Stack } from 'expo-router';
import { useTheme } from '@/context/theme';

export default function ManualReceiptsLayout() {
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
