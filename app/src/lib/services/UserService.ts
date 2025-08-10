import { supabase } from "../config/supabase";
import type { User } from "../types/User";

const userService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all users with optional filters
   */
  async getUsers(filters?: {
    role?: User["role"];
    course?: string;
    yearLevel?: string;
  }) {
    let query = supabase.from("users").select("*");

    if (filters?.role) {
      query = query.eq("role", filters.role);
    }
    if (filters?.course) {
      query = query.eq("course", filters.course);
    }
    if (filters?.yearLevel) {
      query = query.eq("year_level", filters.yearLevel);
    }

    const { data, error } = await query.order("full_name");
    if (error) throw error;
    return data;
  },
};

export default userService;
