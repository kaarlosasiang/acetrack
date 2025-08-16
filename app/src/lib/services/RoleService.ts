import { supabase } from "../config/supabase";
import type { Role, RoleInsert } from "../types/Database";

const roleService = {
  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("type");

    if (error) throw error;
    return data || [];
  },

  /**
   * Get role by ID
   */
  async getRole(roleId: number): Promise<Role | null> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Create a new role
   */
  async createRole(roleData: Omit<RoleInsert, "id">) {
    const { data, error } = await supabase
      .from("roles")
      .insert(roleData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a role
   */
  async updateRole(roleId: number, updates: Partial<Role>) {
    const { data, error } = await supabase
      .from("roles")
      .update(updates)
      .eq("id", roleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a role
   */
  async deleteRole(roleId: number) {
    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", roleId);

    if (error) throw error;
  },
};

export default roleService;
