/**
 * Attendance-related type definitions for AceTrack
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from './Database'
import type { User } from './User'
import type { Event } from './Event'

// Core Attendance types derived from database schema
export type Attendance = Tables<'attendances'>
export type AttendanceInsert = TablesInsert<'attendances'>
export type AttendanceUpdate = TablesUpdate<'attendances'>
export type AttendanceStatus = Enums<'attendance_status'>

// Extended Attendance types for application use
export interface AttendanceWithUser extends Attendance {
  user: Pick<User, 'id' | 'full_name' | 'email' | 'student_id' | 'avatar_url'>
}

export interface AttendanceWithEvent extends Attendance {
  event: Pick<Event, 'id' | 'title' | 'event_date' | 'start_time' | 'end_time'>
}

export interface AttendanceWithDetails extends AttendanceWithUser, AttendanceWithEvent {
  // Combined type with user and event details
  isLate: boolean
  duration?: number | null // in minutes if both check-in and check-out exist
}

// Attendance creation types
export interface AttendanceCheckInData {
  eventId: string
  userId: string
  locationVerified?: boolean
  notes?: string
}

export interface AttendanceCheckOutData {
  attendanceId: string
  notes?: string
}

// Attendance summary types
export interface AttendanceSummary {
  userId: string
  fullName: string | null
  email: string
  totalEvents: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export interface EventAttendanceStats {
  eventId: string
  eventTitle: string
  eventDate: string
  totalRegistered: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

// Attendance filter types for queries
export interface AttendanceFilters {
  eventId?: string
  userId?: string
  status?: AttendanceStatus
  dateRange?: {
    start: Date
    end: Date
  }
  course?: string
  yearLevel?: string
  locationVerified?: boolean
}

// Bulk attendance operations
export interface BulkAttendanceUpdate {
  attendanceIds: string[]
  status: AttendanceStatus
  notes?: string
}

export interface AttendanceReportFilters {
  startDate: Date
  endDate: Date
  course?: string
  yearLevel?: string
  instructorId?: string
  includeStats?: boolean
}

// Constants
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused'
}

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'green',
  absent: 'red',
  late: 'yellow',
  excused: 'blue'
}

export const ATTENDANCE_STATUS_ICONS: Record<AttendanceStatus, string> = {
  present: '✓',
  absent: '✗',
  late: '⏰',
  excused: 'ℹ'
}

// Utility functions for Attendance types
export const isLateAttendance = (attendance: Attendance, event: Event): boolean => {
  if (!attendance.check_in_time || attendance.status !== 'present') {
    return false
  }
  
  const checkInTime = new Date(attendance.check_in_time)
  const eventStartTime = new Date(`${event.event_date}T${event.start_time}`)
  
  return checkInTime > eventStartTime
}

export const getAttendanceDuration = (attendance: Attendance): number | null => {
  if (!attendance.check_in_time || !attendance.check_out_time) {
    return null
  }
  
  const checkIn = new Date(attendance.check_in_time)
  const checkOut = new Date(attendance.check_out_time)
  
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)) // duration in minutes
}

export const formatAttendanceTime = (attendance: Attendance): string => {
  const checkIn = attendance.check_in_time 
    ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '--'
  
  const checkOut = attendance.check_out_time 
    ? new Date(attendance.check_out_time).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '--'
  
  return `${checkIn} - ${checkOut}`
}

export const calculateAttendanceRate = (summary: {
  totalEvents: number
  presentCount: number
  lateCount: number
}): number => {
  if (summary.totalEvents === 0) return 0
  return Math.round(((summary.presentCount + summary.lateCount) / summary.totalEvents) * 100)
}

export const getAttendanceStatusFromCheckIn = (
  checkInTime: Date,
  eventStartTime: Date,
  lateThresholdMinutes = 15
): AttendanceStatus => {
  const diffInMinutes = Math.floor((checkInTime.getTime() - eventStartTime.getTime()) / (1000 * 60))
  
  if (diffInMinutes <= 0) {
    return 'present'
  } else if (diffInMinutes <= lateThresholdMinutes) {
    return 'late'
  } else {
    return 'absent' // Too late, considered absent
  }
}

// Transform functions
export const toAttendanceWithDetails = (
  attendance: Attendance,
  user: User,
  event: Event
): AttendanceWithDetails => ({
  ...attendance,
  user: {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    student_id: user.student_id,
    avatar_url: user.avatar_url
  },
  event: {
    id: event.id,
    title: event.title,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time
  },
  isLate: isLateAttendance(attendance, event),
  duration: getAttendanceDuration(attendance)
})

// Validation functions
export const canCheckIn = (event: Event): boolean => {
  const now = new Date()
  const startTime = new Date(`${event.event_date}T${event.start_time}`)
  const lateThreshold = new Date(startTime.getTime() + 15 * 60 * 1000) // 15 minutes after start
  
  return now >= new Date(startTime.getTime() - 15 * 60 * 1000) && // 15 minutes before start
         now <= lateThreshold && 
         event.is_active
}

export const canCheckOut = (event: Event): boolean => {
  const now = new Date()
  const startTime = new Date(`${event.event_date}T${event.start_time}`)
  const endTime = new Date(`${event.event_date}T${event.end_time}`)
  const checkoutWindow = new Date(endTime.getTime() + 15 * 60 * 1000) // 15 minutes after end
  
  return now >= startTime && now <= checkoutWindow && event.is_active
}