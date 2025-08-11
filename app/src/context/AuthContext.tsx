import authService from "@/lib/services/AuthService";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User } from "@/lib/types/User";
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
  login: (values: { email: string; password: string }) => Promise<LoginResponse>;
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

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseUser = await authService.getUser();
      if (supabaseUser) {
        // Here you would fetch your custom user profile from the database
        // For now, let's create a basic mapping
        const userProfile: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          full_name: supabaseUser.user_metadata?.full_name || null,
          avatar_url: supabaseUser.user_metadata?.avatar_url || null,
          role: supabaseUser.user_metadata?.role || 'student',
          year_level: supabaseUser.user_metadata?.year_level || null,
          course: supabaseUser.user_metadata?.course || null,
          student_id: supabaseUser.user_metadata?.student_id || null,
          created_at: supabaseUser.created_at || new Date().toISOString(),
          updated_at: supabaseUser.updated_at || new Date().toISOString(),
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const authContextValue: AuthContextType = {
    user,
    login: authService.login,
    logout: authService.logout,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
