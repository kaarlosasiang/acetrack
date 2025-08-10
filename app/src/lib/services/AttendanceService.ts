import { supabase } from "../config/supabase";
import type { Attendance } from "../types/Attendance";

const attendanceService = {
  /**
   * Record attendance
   */
  async recordAttendance(
    attendanceData: Omit<Attendance, "id" | "created_at" | "updated_at">
  ) {
    const { data, error } = await supabase
      .from("attendances")
      .insert(attendanceData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get attendance records with optional filters
   */
  async getAttendances(filters?: {
    eventId?: string;
    userId?: string;
    status?: Attendance["status"];
  }) {
    let query = supabase.from("attendances").select(`
        *,
        event:events(*),
        user:users(*)
      `);

    if (filters?.eventId) {
      query = query.eq("event_id", filters.eventId);
    }
    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Update attendance record
   */
  async updateAttendance(attendanceId: string, updates: Partial<Attendance>) {
    const { data, error } = await supabase
      .from("attendances")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check in user for an event
   */
  async checkIn(eventId: string, userId: string, locationVerified = false) {
    const checkInTime = new Date().toISOString();

    // Try to update existing record first
    const { data: existingRecord, error: fetchError } = await supabase
      .from("attendances")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabase
        .from("attendances")
        .update({
          status: "present",
          check_in_time: checkInTime,
          location_verified: locationVerified,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from("attendances")
        .insert({
          event_id: eventId,
          user_id: userId,
          status: "present",
          check_in_time: checkInTime,
          location_verified: locationVerified,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Check out user from an event
   */
  async checkOut(eventId: string, userId: string) {
    const checkOutTime = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendances")
      .update({
        check_out_time: checkOutTime,
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default attendanceService;
