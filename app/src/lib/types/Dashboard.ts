/**
 * Core Database Schema Definition for AceTrack
 * 
 * This file contains the main Supabase database interface.
 * Individual entity types are organized in separate files.
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'student' | 'instructor' | 'admin'
          year_level: string | null
          course: string | null
          student_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'instructor' | 'admin'
          year_level?: string | null
          course?: string | null
          student_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'student' | 'instructor' | 'admin'
          year_level?: string | null
          course?: string | null
          student_id?: string | null
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_date: string
          start_time: string
          end_time: string
          location: string | null
          instructor_id: string
          course: string | null
          year_level: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_date: string
          start_time: string
          end_time: string
          location?: string | null
          instructor_id: string
          course?: string | null
          year_level?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_date?: string
          start_time?: string
          end_time?: string
          location?: string | null
          instructor_id?: string
          course?: string | null
          year_level?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      attendances: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: 'present' | 'absent' | 'late' | 'excused'
          check_in_time: string | null
          check_out_time: string | null
          location_verified: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          check_in_time?: string | null
          check_out_time?: string | null
          location_verified?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          check_in_time?: string | null
          check_out_time?: string | null
          location_verified?: boolean
          notes?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      attendance_summary: {
        Row: {
          user_id: string
          full_name: string | null
          email: string
          total_events: number
          present_count: number
          absent_count: number
          late_count: number
          excused_count: number
          attendance_rate: number
        }
      }
      event_attendance_stats: {
        Row: {
          event_id: string
          event_title: string
          event_date: string
          total_registered: number
          present_count: number
          absent_count: number
          late_count: number
          attendance_rate: number
        }
      }
    }
    Functions: {
      get_user_attendance_rate: {
        Args: {
          user_uuid: string
          start_date?: string
          end_date?: string
        }
        Returns: number
      }
      get_event_statistics: {
        Args: {
          event_uuid: string
        }
        Returns: {
          total_expected: number
          present_count: number
          absent_count: number
          late_count: number
          attendance_rate: number
        }
      }
    }
    Enums: {
      user_role: 'student' | 'instructor' | 'admin'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
    }
  }
}

// Type helper utilities for easier usage across the application
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]