import { supabase } from "@/lib/config/supabase";
import type { Event } from "@/lib/types/Event";

const eventService = {
  /**
   * Create a new event
   */
  async createEvent(
    eventData: Omit<Event, "id" | "created_at" | "updated_at">
  ) {
    const { data, error } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Get events with optional filters
   */
  async getEvents(filters?: {
    instructorId?: string;
    course?: string;
    yearLevel?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase.from("events").select("*");

    if (filters?.instructorId) {
      query = query.eq("instructor_id", filters.instructorId);
    }
    if (filters?.course) {
      query = query.eq("course", filters.course);
    }
    if (filters?.yearLevel) {
      query = query.eq("year_level", filters.yearLevel);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq("is_active", filters.isActive);
    }
    if (filters?.startDate) {
      query = query.gte("event_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("event_date", filters.endDate);
    }

    const { data, error } = await query.order("event_date", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Update an event
   */
  async updateEvent(eventId: string, updates: Partial<Event>) {
    const { data, error } = await supabase
      .from("events")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) throw error;
  },
};

export default eventService;
