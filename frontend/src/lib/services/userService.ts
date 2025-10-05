import createAPIService from "./apiClient";

const api = createAPIService();

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  course?: string;
  year_level?: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile_image_url?: string;
  is_super_admin?: number;
  email_verified_at?: string;
  password_reset_expires_at?: string;
  deleted_at?: string;
  organizations?: Organization[];
  membership?: {
    id: number;
    user_id: number;
    organization_id: number;
    student_id_number?: string;
    role: "admin" | "org_subadmin" | "member";
    status: "active" | "inactive" | "invited";
    joined_at: string;
    left_at?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  is_default?: number;
  status: string;
  role: "admin" | "org_subadmin" | "member";
  membership_status: "active" | "inactive" | "invited";
  joined_at: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  course?: string;
  year_level?: "1st" | "2nd" | "3rd" | "4th" | "5th" | "Graduate" | "Alumni";
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: Record<string, string[]>;
}

class UserService {
  /**
   * Get current user profile
   */
  async getProfile(organizationId?: string): Promise<ApiResponse<User>> {
    const config: any = {};

    // Add organization context header if provided
    if (organizationId) {
      config.headers = {
        "X-Tenant-ID": organizationId,
      };
    }

    const response = await api.get("api/profile", config);
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<User>> {
    const response = await api.put(data, "api/user/profile");

    // Update user in localStorage if successful
    if (response.data.success && response.data.data) {
      localStorage.setItem("user", JSON.stringify(response.data.data));
    }

    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    const response = await api.post(data, "api/user/change-password");
    return response.data;
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append("profile_picture", file);

    const response = await api.post(
      formData,
      "api/user/upload-profile-picture"
    );
    return response.data;
  }

  /**
   * Delete account
   */
  async deleteAccount(): Promise<ApiResponse> {
    const response = await api.remove("api/user/delete-account");

    // Clear local storage if successful (refresh token cookie cleared by backend)
    if (response.data.success) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }

    return response.data;
  }

  /**
   * Get user notifications
   */
  async getNotifications(): Promise<ApiResponse> {
    const response = await api.get("api/user/notifications");
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
    const response = await api.post(
      {},
      `api/user/notifications/${notificationId}/read`
    );
    return response.data;
  }

  /**
   * Get user organizations
   */
  async getOrganizations(): Promise<ApiResponse> {
    const response = await api.get("api/member/organizations");
    return response.data;
  }

  /**
   * Get user events
   */
  async getEvents(): Promise<ApiResponse> {
    const response = await api.get("api/user/events");
    return response.data;
  }
}

const userService = new UserService();
export default userService;
