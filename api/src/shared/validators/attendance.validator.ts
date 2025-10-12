import { z } from 'zod';

// Attendance validation schemas
export const checkInSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  checkInMethod: z.enum(['qr_code', 'manual', 'facial_recognition']).default('manual'),
  locationData: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      accuracy: z.number().min(0).optional(),
      address: z.string().max(200).optional(),
    })
    .optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const checkOutSchema = z.object({
  attendanceId: z.string().min(1, 'Attendance ID is required'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export const updateAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
  checkInTime: z.string().datetime().or(z.date()).optional(),
  checkOutTime: z.string().datetime().or(z.date()).optional(),
  notes: z.string().max(500).optional(),
});

export const attendanceQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  eventId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
  checkInMethod: z.enum(['qr_code', 'manual', 'facial_recognition']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const bulkUpdateAttendanceSchema = z.object({
  attendanceIds: z.array(z.string().min(1)).min(1, 'At least one attendance ID is required'),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().max(500).optional(),
});

// Types derived from schemas
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
export type BulkUpdateAttendanceInput = z.infer<typeof bulkUpdateAttendanceSchema>;
