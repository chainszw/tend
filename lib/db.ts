import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client using the service-role key.
 * Row Level Security blocks every other path to the data, so all access
 * control happens in our data layer, scoped by the session's circle id.
 */
export function db(): SupabaseClient {
  client ??= createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
