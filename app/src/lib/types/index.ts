/**
 * Main types export file for AceTrack
 * 
 * This file consolidates all type exports for easy importing throughout the application.
 * Import specific types from individual files when you only need a few,
 * or import from this file when you need multiple types from different entities.
 */

// Re-export core database types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './Database'

// Re-export User types
export type {
  User,
  UserInsert,
  UserUpdate,
  UserRole,
  UserProfile,
  UserWithStats,
  UserRegistrationData,
  UserProfileData,
  UserFilters,
  AuthUser
} from './User'

export {
  USER_ROLES,
  isStudent,
  isInstructor,
  isAdmin,
  getUserDisplayName,
  getUserInitials,
  toUserProfile
} from './User'

// Re-export Event types
export type {
  Event,
  EventInsert,
  EventUpdate,
  EventWithInstructor,
  EventWithStats,
  EventWithDetails,
  EventCreationData,
  EventSchedule,
  EventFilters,
  EventStatus,
  EventTimeInfo
} from './Event'

export {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  getEventStatus,
  getEventTimeInfo,
  formatEventTime,
  getEventDuration,
  formatEventDate,
  toEventWithTimeInfo
} from './Event'

// Re-export Attendance types
export type {
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  AttendanceStatus,
  AttendanceWithUser,
  AttendanceWithEvent,
  AttendanceWithDetails,
  AttendanceCheckInData,
  AttendanceCheckOutData,
  AttendanceSummary,
  EventAttendanceStats,
  AttendanceFilters,
  BulkAttendanceUpdate,
  AttendanceReportFilters
} from './Attendance'

export {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_ICONS,
  isLateAttendance,
  getAttendanceDuration,
  formatAttendanceTime,
  calculateAttendanceRate,
  getAttendanceStatusFromCheckIn,
  toAttendanceWithDetails,
  canCheckIn,
  canCheckOut
} from './Attendance'
