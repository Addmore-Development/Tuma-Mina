import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface TableSubscription {
  table: string;
  schema?: string;
}

/**
 * Subscribe to one or more Supabase tables for any INSERT / UPDATE / DELETE
 * events. When any event fires, `callback` is invoked so the caller can
 * re-fetch whatever data it needs.
 *
 * Returns the array of active RealtimeChannel handles so they can be passed
 * to `unsubscribe` for cleanup.
 */
export function subscribeToTables(
  tables: TableSubscription[],
  callback: () => void
): RealtimeChannel[] {
  return tables.map(({ table, schema = "public" }) => {
    const channel = supabase
      .channel(`realtime:${schema}:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema, table },
        () => callback()
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