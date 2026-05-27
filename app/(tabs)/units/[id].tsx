import { ErrorState } from '@/components/ui/ErrorState';
import { UnitDetailShared } from '@/components/units/UnitDetailShared';
import { type ErrorBoundaryProps, useLocalSearchParams, useRouter } from 'expo-router';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ErrorState
      title="Failed to load unit details"
      message={error.message}
      onRetry={retry}
    />
  );
}

export default function UnitDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();

  const unitId = Array.isArray(id) ? id[0] : id;

  return (
    <UnitDetailShared
      unitId={unitId}
      embedded={false}
      onDeleted={() => router.back()}
    />
  );
}
