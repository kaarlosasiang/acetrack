import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/Database";

// Simple Supabase client - just need URL and key from environment
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export { supabase };
export default supabase;
