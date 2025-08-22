import authService from "@/lib/services/AuthService";
import userService from "@/lib/services/UserService";
import { supabase } from "@/lib/config/supabase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User } from "@/lib/types/Database";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

// Type for login response
type LoginResponse = {
  user: SupabaseUser;
  session: Session;
  weakPassword?: {
    reasons: string[];
    message: string;
  };
};

interface AuthContextType {
  user: User | null;
  login: (values: {
    email: string;
    password: string;
  }) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  getUser: () => Promise<SupabaseUser | null>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to merge Supabase user data with database profile data
  const mergeUserData = useCallback((supabaseUser: SupabaseUser, dbProfile: User | null): User => {
    if (dbProfile) {
      // Combine database profile with Supabase auth data (email)
      return {
        ...dbProfile,
        email: supabaseUser.email || "",
        password: "", // Don't store password in context
      };
    } else {
      // Fallback to metadata if no database profile exists
      return {
        id: 0,
        student_id: supabaseUser.user_metadata?.student_id || supabaseUser.id,
        first_name: supabaseUser.user_metadata?.first_name || "",
        middle_initial: supabaseUser.user_metadata?.middle_initial || null,
        last_name: supabaseUser.user_metadata?.last_name || "",
        username:
          supabaseUser.user_metadata?.username ||
          `${supabaseUser.user_metadata?.first_name || ""}${
            supabaseUser.user_metadata?.last_name || ""
          }`.toLowerCase(),
        course_id: supabaseUser.user_metadata?.course_id || null,
        year_level: supabaseUser.user_metadata?.year_level || 1,
        avatar: supabaseUser.user_metadata?.avatar || null,
        password: "", // Don't store password in context
        role_id: supabaseUser.user_metadata?.role_id,
        email: supabaseUser.email || "",
      };
    }
  }, []);

  useEffect(() => {
    // Initial user fetch on mount/refresh only
    const initialFetch = async () => {
      setLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Authentication timeout")), 10000)
        );

        const userPromise = authService.getUser();

        const supabaseUser = (await Promise.race([
          userPromise,
          timeoutPromise,
        ])) as SupabaseUser | null;

        if (supabaseUser) {
          try {
            // Try to fetch the actual user profile from the database
            const dbUserProfile = await userService.getProfile(supabaseUser.id);
            console.log(dbUserProfile);
            
            // Merge database profile with Supabase auth data
            const mergedUser = mergeUserData(supabaseUser, dbUserProfile);
            setUser(mergedUser);
          } catch (error) {
            console.warn('Failed to fetch user profile from database, using metadata:', error);
            // Fallback to metadata if database fetch fails
            const userProfile = mergeUserData(supabaseUser, null);
            setUser(userProfile);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initialFetch();

    // Listen for auth state changes - use session data directly
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            // Try to fetch the actual user profile from the database
            const dbUserProfile = await userService.getProfileByStudentId(session.user.id);
            // Merge database profile with Supabase auth data
            const mergedUser = mergeUserData(session.user, dbUserProfile);
            setUser(mergedUser);
          } catch (error) {
            console.warn('Failed to fetch user profile from database, using metadata:', error);
            // Fallback to metadata if database fetch fails
            const userProfile = mergeUserData(session.user, null);
            setUser(userProfile);
          }
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [mergeUserData]);

  const login = async (values: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const result = await authService.login(values);
    // No need to refetch - auth state change handler will update the user
    return result;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    user,
    login,
    logout,
    loading,
    getUser: authService.getUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
