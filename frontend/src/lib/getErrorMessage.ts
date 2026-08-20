
 
const FRIENDLY_BY_CODE: Record<string, string> = {
  PGRST116: "We couldn't find that — it may not exist yet or you may not have access to it.",
  PGRST301: "You don't have permission to do that.",
  "23505": "That already exists.",
  "23503": "That can't be completed because something it depends on is missing.",
  "42501": "You don't have permission to do that.",
};

const FRIENDLY_BY_SUBSTRING: [string, string][] = [
  ["Cannot coerce the result to a single JSON object", "We couldn't find that — it may not exist yet or you may not have access to it."],
  ["JWT expired", "Your session has expired — please log in again."],
  ["Failed to fetch", "Couldn't reach the server — check your connection and try again."],
  ["Failed to send a request to the Edge Function", "Couldn't reach the server — please try again in a moment."],
];

export function getErrorMessage(e: unknown, fallback: string): string {
  const code = e && typeof e === "object" && "code" in e ? (e as { code?: unknown }).code : undefined;
  if (typeof code === "string" && FRIENDLY_BY_CODE[code]) {
    return FRIENDLY_BY_CODE[code];
  }

  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    const msg = (e as { message: string }).message;
    if (!msg.trim()) return fallback;
    const match = FRIENDLY_BY_SUBSTRING.find(([needle]) => msg.includes(needle));
    return match ? match[1] : msg;
  }
  if (typeof e === "string" && e.trim()) return e;
  return fallback;
}