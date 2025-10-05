import createAPIService from "./apiClient";

// Create API service instance for auth operations
const api = createAPIService();

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone_number?: string;
  course?: string;
  year_level?: "1st" | "2nd" | "3rd" | "4th" | "5th" | "Graduate" | "Alumni";
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

// Authentication response types based on your backend
export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      phone_number?: string;
      course?: string;
      year_level?: string;
      status: string;
      role: string;
      created_at: string;
      updated_at: string;
      last_login_at?: string;
    };
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
  };
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string[]>;
}

class AuthService {
  /**
   * User login
   */
  async login(loginData: LoginData): Promise<AuthResponse> {
    const response = await api.post(loginData, "auth/login");

    // Store tokens in localStorage
    if (response.data.success && response.data.data) {
      localStorage.setItem("access_token", response.data.data.access_token);
      localStorage.setItem("refresh_token", response.data.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
    }

    return response.data;
  }

  /**
   * User registration
   */
  async register(registerData: RegisterData): Promise<ApiResponse> {
    const response = await api.post(registerData, "auth/register");
    return response.data;
  }

  /**
   * User logout
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await api.post({}, "api/auth/logout");

      // Clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      return response.data;
    } catch (error) {
      // Even if logout fails on backend, clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<
    ApiResponse<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>
  > {
    const refresh_token = localStorage.getItem("refresh_token");

    if (!refresh_token) {
      throw new Error("No refresh token available");
    }

    const response = await api.post({ refresh_token }, "api/auth/refresh");

    // Update access token
    if (response.data.success && response.data.data?.access_token) {
      localStorage.setItem("access_token", response.data.data.access_token);
    }

    return response.data;
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse> {
    const response = await api.post(data, "auth/forgot-password");
    return response.data;
  }

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordData): Promise<ApiResponse> {
    const response = await api.post(data, "auth/reset-password");
    return response.data;
  }

  /**
   * Verify email
   */
  async verifyEmail(data: VerifyEmailData): Promise<ApiResponse> {
    const response = await api.post(data, "auth/verify-email");
    return response.data;
  }

  /**
   * Resend verification email
   */
  async resendVerification(data: ResendVerificationData): Promise<ApiResponse> {
    const response = await api.post(data, "auth/resend-verification");
    return response.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse> {
    const response = await api.get("api/auth/profile");
    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("user");
    return !!(token && user && token !== "undefined");
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined") {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem("access_token");
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }
}

const authService = new AuthService();
export default authService;
