import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./env";
import type { Database } from "./database.types";

export function createSupabaseServerClient() {
  const { url, key } = getSupabasePublicConfig();
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
