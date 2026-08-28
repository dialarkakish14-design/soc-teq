import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check .env.local.",
  );
}

// supabase-js accepts the new sb_publishable_... key the same way it accepts
// the legacy anon key — passed straight through as the client's public key.
export const supabase = createClient(url, publishableKey);
