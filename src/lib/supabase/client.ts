import { createBrowserClient } from "@supabase/ssr";

import { readPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database.generated";

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = readPublicEnvironment();

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
