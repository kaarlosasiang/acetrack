/**
 * Core Database Schema Definition for AceTrack
 * 
 * This file contains the main Supabase database interface.
 * Individual entity types are organized in separate files.
 */

export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: {
          student_id: string
          firstname: string
          middlename: string | null
          lastname: string
          course_id: any
          year_level: number
          avatar: string | null
          password: string
          role_id: number
          email: string
        }
        Insert: {
          student_id: string
          firstname: string
          middlename?: string | null
          lastname: string
          course_id: number
          year_id: number
          avatar?: string | null
          password: string
          role_id: number
          email: string
        }
        Update: {
          student_id?: string
          firstname?: string
          middlename?: string | null
          lastname?: string
          course_id?: number | null
          year_id?: number
          avatar?: string | null
          password?: string
          role_id?: number
          email?: string
        }
      }
      events: {
        Row: {
          id: number
          name: string
          description: string | null
          banner: string | null
          status: number
          start_datetime: string
          end_datetime: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          banner?: string | null
          status: number
          start_datetime: string
          end_datetime: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          banner?: string | null
          status?: number
          start_datetime?: string
          end_datetime?: string
        }
      }
      attendance: {
        Row: {
          id: number
          event_id: number
          student_id: string
          firstname: string
          middlename: string | null
          lastname: string
          course_id: number
          year_level: string
          avatar: string | null
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          id?: number
          event_id: number
          student_id: string
          firstname: string
          middlename?: string | null
          lastname: string
          course_id: number
          year_level: string
          avatar?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          id?: number
          event_id?: number
          student_id?: string
          firstname?: string
          middlename?: string | null
          lastname?: string
          course_id?: number
          year_level?: string
          avatar?: string | null
          time_in?: string | null
          time_out?: string | null
        }
      }
      courses: {
        Row: {
          id: number
          course_name: string
        }
        Insert: {
          id?: number
          course_name: string
        }
        Update: {
          id?: number
          course_name?: string
        }
      }
      roles: {
        Row: {
          id: number
          type: string
        }
        Insert: {
          id?: number
          type: string
        }
        Update: {
          id?: number
          type?: string
        }
      }
    }
  }
}

// Type helper utilities for easier usage across the application
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Simple type aliases - no need for separate files
export type UserProfile = Tables<'user_profile'>
export type UserProfileInsert = TablesInsert<'user_profile'>
export type UserProfileUpdate = TablesUpdate<'user_profile'>

export type Event = Tables<'events'>
export type EventInsert = TablesInsert<'events'>
export type EventUpdate = TablesUpdate<'events'>

export type Attendance = Tables<'attendance'>
export type AttendanceInsert = TablesInsert<'attendance'>
export type AttendanceUpdate = TablesUpdate<'attendance'>

export type Course = Tables<'courses'>
export type CourseInsert = TablesInsert<'courses'>
export type CourseUpdate = TablesUpdate<'courses'>

export type Role = Tables<'roles'>
export type RoleInsert = TablesInsert<'roles'>
export type RoleUpdate = TablesUpdate<'roles'>

// Keep User as alias for UserProfile for backward compatibility
export type User = UserProfile
export type UserInsert = UserProfileInsert
export type UserUpdate = UserProfileUpdate