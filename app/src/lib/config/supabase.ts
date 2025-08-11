import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/Dashboard";

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `Invalid Supabase URL format: ${supabaseUrl}. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.`
  );
}

// Production-ready Supabase client configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Storage key for session persistence
    storageKey: "acetrack-auth",
    // Flow type for OAuth flows
    flowType: "pkce" as const,
  },
  // Database configuration
  db: {
    schema: "public" as const,
  },
  // Global settings
  global: {
    headers: {
      "x-client-info": "acetrack-web",
    },
  },
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

// Create the Supabase client instance
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfig
);

// Export for server-side usage (if needed)
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This is required for server-side operations."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Health check function
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from("_health").select("1").limit(1);

    // If table doesn't exist, that's fine - we just want to check connectivity
    if (error && !error.message.includes("does not exist")) {
      console.error("Supabase connection check failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase connection check failed:", error);
    return false;
  }
};

// Export typed client
export type TypedSupabaseClient = typeof supabase;

// Utility function for handling Supabase errors
export const handleSupabaseError = (error: unknown): string => {
  if (!error) return "An unknown error occurred";

  // Type guard for error objects
  if (typeof error !== "object" || error === null) {
    return "An unknown error occurred";
  }

  const errorObj = error as { code?: string; message?: string };

  // Handle specific Supabase error codes
  switch (errorObj.code) {
    case "23505":
      return "This record already exists";
    case "23503":
      return "Referenced record does not exist";
    case "42501":
      return "Insufficient permissions to perform this action";
    case "42P01":
      return "Table does not exist";
    default:
      return (
        errorObj.message || "An error occurred while processing your request"
      );
  }
};

// Environment info for debugging (development only)
if (process.env.NODE_ENV === "development") {
  console.log("🔗 Supabase client initialized:", {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    environment: process.env.NODE_ENV,
  });
}

export default supabase;
