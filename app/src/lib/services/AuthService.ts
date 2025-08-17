import { supabase } from "@/lib/config/supabase";
import type { User } from "@/lib/types/Database";

const authService = {
  /**
   * Get the current user session
   */
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get the current user
   */
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Sign in with email and password
   */
  async login(values: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) throw error;

    return data;
  },

  /**
   * Sign up with email and password
   */
  async register(email: string, password: string, userData?: Partial<User>) {
    console.log(userData);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { avatar: "", ...userData },
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Complete registration by creating user profile
   */
  async createUserProfile(profileData: {
    student_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    course_id: number;
    year_level: number;
    role_id?: number;
  }) {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        ...profileData,
        role_id: profileData.role_id || 1, // Default to student role
        avatar: null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },
};

export default authService;
