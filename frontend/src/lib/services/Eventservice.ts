import { supabase } from "@/lib/config/supabase";
import type { Event, EventInsert } from "@/lib/types/Database";

const eventService = {
  /**
   * Create a new event
   */
  async createEvent(eventData: Omit<EventInsert, "id">) {
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
  async getEvent(eventId: number): Promise<Event | null> {
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
    status?: number;
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase.from("events").select("*");

    if (filters?.status !== undefined) {
      query = query.eq("status", filters.status);
    }
    if (filters?.startDate) {
      query = query.gte("start_datetime", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("end_datetime", filters.endDate);
    }

    const { data, error } = await query.order("start_datetime", {
      ascending: false,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Update an event
   */
  async updateEvent(eventId: number, updates: Partial<Event>) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an event
   */
  async deleteEvent(eventId: number) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) throw error;
  },
};

export default eventService;
