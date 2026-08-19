/**
 * Supabase throws plain objects (PostgrestError, AuthError, StorageError),
 * not real `Error` instances — so `e instanceof Error` is always false for
 * them and any code using that check silently falls through to a generic
 * fallback message, hiding the real error (RLS denial, missing table,
 * FK violation, etc). This checks for a `.message` string on anything
 * thrown, regardless of its prototype, and falls back only if there
 * truly isn't one.
 */
export function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    const msg = (e as { message: string }).message;
    return msg.trim() ? msg : fallback;
  }
  if (typeof e === "string" && e.trim()) return e;
  return fallback;
}