import { supabase } from "../config/supabase";
import type { UserProfile } from "../types/Database";

const userService = {
  /**
   * Get user profile by student ID
   */
  async getProfile(studentId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profile")
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
      .from("user_profile")
      .update(updates)
      .eq("student_id", studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all users with optional filters
   */
  async getUsers(filters?: {
    role_id?: number;
    course_id?: number;
    year_id?: number;
  }) {
    let query = supabase.from("user_profile").select(`
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
    if (filters?.year_id) {
      query = query.eq("year_id", filters.year_id);
    }

    const { data, error } = await query.order("full_name");
    if (error) throw error;
    return data;
  },
};

export default userService;
