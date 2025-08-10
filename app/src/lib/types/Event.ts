/**
 * Event-related type definitions for AceTrack
 */

import type { Tables, TablesInsert, TablesUpdate } from './Database'
import type { User } from './User'

// Core Event types derived from database schema
export type Event = Tables<'events'>
export type EventInsert = TablesInsert<'events'>
export type EventUpdate = TablesUpdate<'events'>

// Extended Event types for application use
export interface EventWithInstructor extends Event {
  instructor: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface EventWithStats extends Event {
  // Attendance statistics
  totalRegistered: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export interface EventWithDetails extends EventWithInstructor, EventWithStats {
  // Combined type with all details
  isUpcoming: boolean
  isOngoing: boolean
  isPast: boolean
  canCheckIn: boolean
  canCheckOut: boolean
}

// Event creation types
export interface EventCreationData {
  title: string
  description?: string
  eventDate: Date
  startTime: string
  endTime: string
  location?: string
  course?: string
  yearLevel?: string
}

export interface EventSchedule {
  date: Date
  startTime: string
  endTime: string
  duration: number // in minutes
}

// Event filter types for queries
export interface EventFilters {
  instructorId?: string
  course?: string
  yearLevel?: string
  isActive?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  status?: 'upcoming' | 'ongoing' | 'past'
  search?: string // For searching by title or description
}

// Event status types
export type EventStatus = 'upcoming' | 'ongoing' | 'past'

export interface EventTimeInfo {
  status: EventStatus
  isUpcoming: boolean
  isOngoing: boolean
  isPast: boolean
  timeUntilStart?: number // minutes
  timeUntilEnd?: number // minutes
  canCheckIn: boolean
  canCheckOut: boolean
}

// Constants
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Upcoming',
  ongoing: 'In Progress',
  past: 'Completed'
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  upcoming: 'blue',
  ongoing: 'green',
  past: 'gray'
}

// Utility functions for Event types
export const getEventStatus = (event: Event): EventStatus => {
  const now = new Date()
  const startTime = new Date(`${event.event_date}T${event.start_time}`)
  const endTime = new Date(`${event.event_date}T${event.end_time}`)

  if (now < startTime) {
    return 'upcoming'
  } else if (now >= startTime && now <= endTime) {
    return 'ongoing'
  } else {
    return 'past'
  }
}

export const getEventTimeInfo = (event: Event): EventTimeInfo => {
  const now = new Date()
  const startTime = new Date(`${event.event_date}T${event.start_time}`)
  const endTime = new Date(`${event.event_date}T${event.end_time}`)
  
  const status = getEventStatus(event)
  const isUpcoming = status === 'upcoming'
  const isOngoing = status === 'ongoing'
  const isPast = status === 'past'
  
  // Calculate time differences in minutes
  const timeUntilStart = isUpcoming ? Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60)) : undefined
  const timeUntilEnd = !isPast ? Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60)) : undefined
  
  // Check-in is available 15 minutes before start until 15 minutes after start
  const checkInStart = new Date(startTime.getTime() - 15 * 60 * 1000)
  const checkInEnd = new Date(startTime.getTime() + 15 * 60 * 1000)
  const canCheckIn = now >= checkInStart && now <= checkInEnd && event.is_active
  
  // Check-out is available from start time until 15 minutes after end
  const checkOutEnd = new Date(endTime.getTime() + 15 * 60 * 1000)
  const canCheckOut = now >= startTime && now <= checkOutEnd && event.is_active
  
  return {
    status,
    isUpcoming,
    isOngoing,
    isPast,
    timeUntilStart,
    timeUntilEnd,
    canCheckIn,
    canCheckOut
  }
}

export const formatEventTime = (event: Event): string => {
  return `${event.start_time} - ${event.end_time}`
}

export const getEventDuration = (event: Event): number => {
  const start = new Date(`1970-01-01T${event.start_time}`)
  const end = new Date(`1970-01-01T${event.end_time}`)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60)) // duration in minutes
}

export const formatEventDate = (event: Event): string => {
  const date = new Date(event.event_date)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Transform Event to EventWithDetails
export const toEventWithTimeInfo = (event: Event): Event & EventTimeInfo => ({
  ...event,
  ...getEventTimeInfo(event)
})