"use client";

import authService, {
  type LoginData,
  type RegisterData,
} from "@/lib/services/authService";
import { type User } from "@/lib/services/userService";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

export interface AuthContextType {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Authentication methods
  login: (
    loginData: LoginData,
    redirectAfterLogin?: boolean
  ) => Promise<boolean>;
  register: (registerData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Session management
  checkAuthStatus: () => void;
  clearAuthData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Clear authentication data
  const clearAuthData = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }, []);

  // Check authentication status on app load
  const checkAuthStatus = useCallback(() => {
    try {
      const token = localStorage.getItem("access_token");
      const userData = localStorage.getItem("user");

      if (
        token &&
        userData &&
        token !== "undefined" &&
        userData !== "undefined"
      ) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch {
          // Failed to parse user data
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } catch {
      // Error checking auth status
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthData]);

  // Refresh user profile data
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      }
    } catch {
      // Failed to refresh user profile
      // Don't clear auth data on profile refresh failure
      // The user might still be authenticated, just network issues
    }
  }, [isAuthenticated]);

  // Login function
  const login = useCallback(
    async (
      loginData: LoginData,
      redirectAfterLogin: boolean = true
    ): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await authService.login(loginData);

        if (response.success && response.data) {
          setUser(response.data.user);
          setIsAuthenticated(true);

          toast.success(response.message || "Login successful!");

          // Redirect to appropriate dashboard if requested
          if (redirectAfterLogin) {
            const dashboardUrl = getDashboardUrl(response.data.user);
            router.push(dashboardUrl);
          }

          return true;
        } else {
          toast.error(response.message || "Login failed");
          return false;
        }
      } catch (error: any) {
        // Handle specific error messages
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Login failed. Please try again.";

        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Register function
  const register = useCallback(
    async (registerData: RegisterData): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await authService.register(registerData);

        if (response.success) {
          toast.success(
            response.message ||
              "Registration successful! Please check your email to verify your account."
          );
          return true;
        } else {
          // Handle validation errors
          if (response.errors) {
            const errorMessages = Object.values(response.errors).flat();
            errorMessages.forEach(message => toast.error(message));
          } else {
            toast.error(response.message || "Registration failed");
          }
          return false;
        }
      } catch (error: any) {
        // Handle specific error messages
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Registration failed. Please try again.";

        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call backend logout endpoint to clear refresh token cookie
      await authService.logout();
      toast.success("Logged out successfully");
    } catch {
      // Even if backend logout fails, clear local data
      toast.warning("Logout completed (some cleanup may have failed)");
    } finally {
      // Always clear local authentication data
      clearAuthData();
      setIsLoading(false);
    }
  }, [clearAuthData]);

  // Initialize authentication state on component mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Handle session expiration messages
  useEffect(() => {
    const sessionExpiredMessage = localStorage.getItem("session_expired_toast");
    if (sessionExpiredMessage) {
      toast.error(sessionExpiredMessage);
      localStorage.removeItem("session_expired_toast");
      clearAuthData();
    }
  }, [clearAuthData]);

  // Listen for storage changes (logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && !e.newValue && isAuthenticated) {
        // Access token was removed in another tab
        clearAuthData();
        toast.info("You have been logged out");
      } else if (e.key === "user" && e.newValue && !isAuthenticated) {
        // User was set in another tab (login)
        checkAuthStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isAuthenticated, clearAuthData, checkAuthStatus]);

  // Periodically check auth status (optional - helps catch edge cases)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem("access_token");
      if (!token || token === "undefined") {
        clearAuthData();
        toast.error("Your session has expired. Please log in again.");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, clearAuthData]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    checkAuthStatus,
    clearAuthData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Custom hook for checking authentication with loading state
export function useAuthCheck(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
} {
  const { isAuthenticated, isLoading, user } = useAuth();
  return { isAuthenticated, isLoading, user };
}

// Export the context for advanced usage
export { AuthContext };
