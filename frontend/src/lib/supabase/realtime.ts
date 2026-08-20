import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface TableSubscription {
  table: string;
  schema?: string;
  /** Defaults to "*" (all of INSERT/UPDATE/DELETE) — narrow it for a specific event. */
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  /** Postgres-changes filter string, e.g. "town=eq.Rustenburg". */
  filter?: string;
}

/**
 * Subscribe to one or more Supabase tables for INSERT / UPDATE / DELETE
 * events (or a narrower subset via `event`/`filter` per subscription). When
 * an event fires, `callback` is invoked with the raw payload so the caller
 * can either re-fetch data or react to the change directly (e.g. show a
 * toast for a specific INSERT) — existing callers that ignore the argument
 * keep working unchanged.
 *
 * Returns the array of active RealtimeChannel handles so they can be passed
 * to `unsubscribe` for cleanup.
 */
export function subscribeToTables(
  tables: TableSubscription[],
  callback: (payload: any) => void
): RealtimeChannel[] {
  return tables.map(({ table, schema = "public", event = "*", filter }) => {
    const channel = supabase
      .channel(`realtime:${schema}:${table}:${event}:${filter ?? "all"}`)
      .on(
        "postgres_changes",
        filter ? { event, schema, table, filter } : { event, schema, table },
        (payload) => callback(payload)
      )
      .subscribe();

    return channel;
  });
}

/**
 * Remove all channels returned by `subscribeToTables`.
 */
export async function unsubscribe(channels: RealtimeChannel[]): Promise<void> {
  await Promise.all(channels.map((ch) => supabase.removeChannel(ch)));
}