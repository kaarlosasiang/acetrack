/**
 * User-related type definitions for AceTrack
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from './Database'

// Core User types derived from database schema
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>
export type UserRole = Enums<'user_role'>

// Extended User types for application use
export interface UserProfile extends User {
  // Computed properties
  displayName: string
  initials: string
  isStudent: boolean
  isInstructor: boolean
  isAdmin: boolean
}

export interface UserWithStats extends User {
  // Statistics
  totalEvents: number
  attendanceRate: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
}

// User creation/registration types
export interface UserRegistrationData {
  email: string
  password: string
  fullName: string
  role: UserRole
  yearLevel?: string
  course?: string
  studentId?: string
}

// User profile update type - excludes system-managed fields
export type UserProfileData = Omit<UserInsert, 'id' | 'email' | 'created_at' | 'updated_at'>

// User filter types for queries
export interface UserFilters {
  role?: UserRole
  course?: string
  yearLevel?: string
  search?: string // For searching by name or email
  isActive?: boolean
}

// User authentication types
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  profile?: UserProfile
}

// Constants
export const USER_ROLES: Record<UserRole, { label: string; description: string }> = {
  student: {
    label: 'Student',
    description: 'Can view and mark attendance for assigned events'
  },
  instructor: {
    label: 'Instructor',
    description: 'Can create events and manage student attendance'
  },
  admin: {
    label: 'Administrator',
    description: 'Full system access and user management'
  }
}

// Type guards
export const isStudent = (user: User): boolean => user.role === 'student'
export const isInstructor = (user: User): boolean => user.role === 'instructor'
export const isAdmin = (user: User): boolean => user.role === 'admin'

// Utility functions for User types
export const getUserDisplayName = (user: User): string => {
  return user.full_name || user.email.split('@')[0] || 'Unknown User'
}

export const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user)
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// Transform User to UserProfile
export const toUserProfile = (user: User): UserProfile => ({
  ...user,
  displayName: getUserDisplayName(user),
  initials: getUserInitials(user),
  isStudent: isStudent(user),
  isInstructor: isInstructor(user),
  isAdmin: isAdmin(user),
})