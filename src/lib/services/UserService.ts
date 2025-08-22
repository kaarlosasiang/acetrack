import { supabase } from "../config/supabase";
import type { UserProfile } from "../types/Database";
import CloudinaryService from "./CloudinaryService";

const userService = {
  /**
   * Get user profile by student ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Get user profile by student ID (alternative method)
   */
  async getProfileByStudentId(studentId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("student_id", studentId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(studentId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("student_id", studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update user avatar
   */
  async updateAvatar(studentId: string, file: File): Promise<string> {
    try {
      // Get current profile to check for existing avatar
      const currentProfile = await this.getProfile(studentId);
      
      // Upload new avatar to Cloudinary
      const avatarUrl = await CloudinaryService.uploadAvatarToCloudinary(file, studentId);

      // Update profile with new avatar URL
      await this.updateProfile(studentId, { avatar: avatarUrl });

      // Delete old avatar if it exists and is from Cloudinary
      if (currentProfile?.avatar && currentProfile.avatar.includes('cloudinary.com')) {
        try {
          await CloudinaryService.deleteImage(currentProfile.avatar);
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError);
        }
      }

      return avatarUrl;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      throw new Error('Failed to update avatar');
    }
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(studentId: string): Promise<void> {
    try {
      const currentProfile = await this.getProfile(studentId);
      
      // Remove avatar URL from profile
      await this.updateProfile(studentId, { avatar: null });

      // Delete avatar from Cloudinary if it exists
      if (currentProfile?.avatar && currentProfile.avatar.includes('cloudinary.com')) {
        try {
          await CloudinaryService.deleteImage(currentProfile.avatar);
        } catch (deleteError) {
          console.warn('Failed to delete avatar from Cloudinary:', deleteError);
        }
      }
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      throw new Error('Failed to remove avatar');
    }
  },

  /**
   * Get optimized avatar URL for display
   */
  getAvatarUrl(profile: UserProfile | null, size: 'sm' | 'md' | 'lg' = 'md'): string {
    if (profile?.avatar) {
      return CloudinaryService.getOptimizedAvatarUrl(profile.avatar, size);
    }
    
    // Generate full name from first and last name
    const fullName = profile 
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : 'User';
    
    return CloudinaryService.getDefaultAvatarUrl(fullName);
  },

  /**
   * Get all users with optional filters
   */
  async getUsers(filters?: {
    role_id?: number;
    course_id?: number;
    year_level?: number;
  }) {
    let query = supabase.from("user_profiles").select(`
      *,
      course:courses(course_name),
      role:roles(type)
    `);

    if (filters?.role_id) {
      query = query.eq("role_id", filters.role_id);
    }
    if (filters?.course_id) {
      query = query.eq("course_id", filters.course_id);
    }
    if (filters?.year_level) {
      query = query.eq("year_level", filters.year_level);
    }

    const { data, error } = await query.order("first_name");
    if (error) throw error;
    return data;
  },
};

export default userService;
