import { useTheme } from '@/context/theme';
import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
