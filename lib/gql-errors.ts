/**
 * Extracts a human-readable error string from a graphene-django-auth mutation response.
 *
 * Django returns errors shaped like:
 *   { nonFieldErrors: [{message, code}], email: [{message, code}], password1: [{message, code}], ... }
 *
 * nonFieldErrors are surfaced first, followed by any field-level messages.
 */
export function parseGqlErrors(
  errors: Record<string, Array<{ message: string; code?: string }>> | null | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!errors || typeof errors !== 'object') return fallback;

  const messages: string[] = [];

  // Surface non-field errors first
  (errors.nonFieldErrors ?? []).forEach((e) => {
    if (e?.message) messages.push(e.message);
  });

  // Then field-level errors
  Object.entries(errors).forEach(([key, msgs]) => {
    if (key === 'nonFieldErrors') return;
    (msgs ?? []).forEach((e) => {
      if (e?.message) messages.push(e.message);
    });
  });

  return messages.length > 0 ? messages.join('\n') : fallback;
}
