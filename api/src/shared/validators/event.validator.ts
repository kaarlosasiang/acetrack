import { z } from 'zod';

// Event validation schemas
export const createEventSchema = z
  .object({
    organizationId: z.string().min(1, 'Organization ID is required'),
    title: z
      .string()
      .min(1, 'Event title is required')
      .max(200, 'Title must be less than 200 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    eventDate: z.string().datetime('Invalid date format').or(z.date()),
    banner: z.string().min(1, 'Event banner is required'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
    checkInStartTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-in start time format (HH:mm)')
      .optional(),
    checkInEndTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-in end time format (HH:mm)')
      .optional(),
    checkOutStartTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-out start time format (HH:mm)')
      .optional(),
    checkOutEndTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid check-out end time format (HH:mm)')
      .optional(),
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    is_mandatory: z.boolean().default(false),
  })
  .refine(
    data => {
      const start = data.startTime.split(':').map(Number);
      const end = data.endTime.split(':').map(Number);
      const startMinutes = (start[0] || 0) * 60 + (start[1] || 0);
      const endMinutes = (end[0] || 0) * 60 + (end[1] || 0);
      return endMinutes > startMinutes;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInStartTime && data.checkInEndTime) {
        const checkInStart = data.checkInStartTime.split(':').map(Number);
        const checkInEnd = data.checkInEndTime.split(':').map(Number);
        const startMinutes = (checkInStart[0] || 0) * 60 + (checkInStart[1] || 0);
        const endMinutes = (checkInEnd[0] || 0) * 60 + (checkInEnd[1] || 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: 'Check-in end time must be after check-in start time',
      path: ['checkInEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInStartTime) {
        const eventStart = data.startTime.split(':').map(Number);
        const checkInStart = data.checkInStartTime.split(':').map(Number);
        const eventStartMinutes = (eventStart[0] || 0) * 60 + (eventStart[1] || 0);
        const checkInStartMinutes = (checkInStart[0] || 0) * 60 + (checkInStart[1] || 0);
        return checkInStartMinutes <= eventStartMinutes;
      }
      return true;
    },
    {
      message: 'Check-in start time must be before or at event start time (allows early check-in)',
      path: ['checkInStartTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInEndTime) {
        const eventEnd = data.endTime.split(':').map(Number);
        const checkInEnd = data.checkInEndTime.split(':').map(Number);
        const eventEndMinutes = (eventEnd[0] || 0) * 60 + (eventEnd[1] || 0);
        const checkInEndMinutes = (checkInEnd[0] || 0) * 60 + (checkInEnd[1] || 0);
        return checkInEndMinutes >= eventEndMinutes;
      }
      return true;
    },
    {
      message: 'Check-in end time must be at or after event end time (allows post-event check-in)',
      path: ['checkInEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutStartTime && data.checkOutEndTime) {
        const checkOutStart = data.checkOutStartTime.split(':').map(Number);
        const checkOutEnd = data.checkOutEndTime.split(':').map(Number);
        const startMinutes = (checkOutStart[0] || 0) * 60 + (checkOutStart[1] || 0);
        const endMinutes = (checkOutEnd[0] || 0) * 60 + (checkOutEnd[1] || 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: 'Check-out end time must be after check-out start time',
      path: ['checkOutEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutStartTime) {
        const eventStart = data.startTime.split(':').map(Number);
        const checkOutStart = data.checkOutStartTime.split(':').map(Number);
        const eventStartMinutes = (eventStart[0] || 0) * 60 + (eventStart[1] || 0);
        const checkOutStartMinutes = (checkOutStart[0] || 0) * 60 + (checkOutStart[1] || 0);
        return checkOutStartMinutes >= eventStartMinutes;
      }
      return true;
    },
    {
      message:
        'Check-out start time must be at or after event start time (allows early checkout during event)',
      path: ['checkOutStartTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutEndTime) {
        const eventEnd = data.endTime.split(':').map(Number);
        const checkOutEnd = data.checkOutEndTime.split(':').map(Number);
        const eventEndMinutes = (eventEnd[0] || 0) * 60 + (eventEnd[1] || 0);
        const checkOutEndMinutes = (checkOutEnd[0] || 0) * 60 + (checkOutEnd[1] || 0);
        return checkOutEndMinutes >= eventEndMinutes;
      }
      return true;
    },
    {
      message: 'Check-out end time must be at or after event end time (allows extended check-out)',
      path: ['checkOutEndTime'],
    }
  );

export const updateEventSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    eventDate: z.string().datetime().or(z.date()).optional(),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    checkInStartTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    checkInEndTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    checkOutStartTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    checkOutEndTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    location: z.string().max(200).optional(),
    banner: z.string().url().optional(),
    status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).optional(),
    is_mandatory: z.boolean().optional(),
  })
  .refine(
    data => {
      if (data.startTime && data.endTime) {
        const start = data.startTime.split(':').map(Number);
        const end = data.endTime.split(':').map(Number);
        const startMinutes = (start[0] || 0) * 60 + (start[1] || 0);
        const endMinutes = (end[0] || 0) * 60 + (end[1] || 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInStartTime && data.checkInEndTime) {
        const checkInStart = data.checkInStartTime.split(':').map(Number);
        const checkInEnd = data.checkInEndTime.split(':').map(Number);
        const startMinutes = (checkInStart[0] || 0) * 60 + (checkInStart[1] || 0);
        const endMinutes = (checkInEnd[0] || 0) * 60 + (checkInEnd[1] || 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: 'Check-in end time must be after check-in start time',
      path: ['checkInEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInStartTime && data.startTime) {
        const eventStart = data.startTime.split(':').map(Number);
        const checkInStart = data.checkInStartTime.split(':').map(Number);
        const eventStartMinutes = (eventStart[0] || 0) * 60 + (eventStart[1] || 0);
        const checkInStartMinutes = (checkInStart[0] || 0) * 60 + (checkInStart[1] || 0);
        return checkInStartMinutes <= eventStartMinutes;
      }
      return true;
    },
    {
      message: 'Check-in start time must be before or at event start time (allows early check-in)',
      path: ['checkInStartTime'],
    }
  )
  .refine(
    data => {
      if (data.checkInEndTime && data.endTime) {
        const eventEnd = data.endTime.split(':').map(Number);
        const checkInEnd = data.checkInEndTime.split(':').map(Number);
        const eventEndMinutes = (eventEnd[0] || 0) * 60 + (eventEnd[1] || 0);
        const checkInEndMinutes = (checkInEnd[0] || 0) * 60 + (checkInEnd[1] || 0);
        return checkInEndMinutes >= eventEndMinutes;
      }
      return true;
    },
    {
      message: 'Check-in end time must be at or after event end time (allows post-event check-in)',
      path: ['checkInEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutStartTime && data.checkOutEndTime) {
        const checkOutStart = data.checkOutStartTime.split(':').map(Number);
        const checkOutEnd = data.checkOutEndTime.split(':').map(Number);
        const startMinutes = (checkOutStart[0] || 0) * 60 + (checkOutStart[1] || 0);
        const endMinutes = (checkOutEnd[0] || 0) * 60 + (checkOutEnd[1] || 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: 'Check-out end time must be after check-out start time',
      path: ['checkOutEndTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutStartTime && data.startTime) {
        const eventStart = data.startTime.split(':').map(Number);
        const checkOutStart = data.checkOutStartTime.split(':').map(Number);
        const eventStartMinutes = (eventStart[0] || 0) * 60 + (eventStart[1] || 0);
        const checkOutStartMinutes = (checkOutStart[0] || 0) * 60 + (checkOutStart[1] || 0);
        return checkOutStartMinutes >= eventStartMinutes;
      }
      return true;
    },
    {
      message:
        'Check-out start time must be at or after event start time (allows early checkout during event)',
      path: ['checkOutStartTime'],
    }
  )
  .refine(
    data => {
      if (data.checkOutEndTime && data.endTime) {
        const eventEnd = data.endTime.split(':').map(Number);
        const checkOutEnd = data.checkOutEndTime.split(':').map(Number);
        const eventEndMinutes = (eventEnd[0] || 0) * 60 + (eventEnd[1] || 0);
        const checkOutEndMinutes = (checkOutEnd[0] || 0) * 60 + (checkOutEnd[1] || 0);
        return checkOutEndMinutes >= eventEndMinutes;
      }
      return true;
    },
    {
      message: 'Check-out end time must be at or after event end time (allows extended check-out)',
      path: ['checkOutEndTime'],
    }
  );

export const eventQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  organizationId: z.string().optional(),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']).optional(),
  is_mandatory: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeDeleted: z.boolean().default(false).optional(),
});

export const deleteEventSchema = z.object({
  permanently: z.boolean().default(false).optional(),
});

export const restoreEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

// Types derived from schemas
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type DeleteEventInput = z.infer<typeof deleteEventSchema>;
export type RestoreEventInput = z.infer<typeof restoreEventSchema>;
