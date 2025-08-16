import authService from "@/lib/services/AuthService";
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
        // Here you should fetch your custom user profile from the user_profile table
        // For now, let's create a basic mapping based on your schema
        const userProfile: User = {
          student_id: supabaseUser.user_metadata?.student_id || supabaseUser.id,
          firstname: supabaseUser.user_metadata?.firstname || '',
          middlename: supabaseUser.user_metadata?.middlename || null,
          lastname: supabaseUser.user_metadata?.lastname || '',
          course_id: supabaseUser.user_metadata?.course_id || 1,
          year_id: supabaseUser.user_metadata?.year_id || 1,
          avatar: supabaseUser.user_metadata?.avatar || null,
          password: '', // Don't store password in context
          role_id: supabaseUser.user_metadata?.role_id || 1,
          email: supabaseUser.email || '',
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
