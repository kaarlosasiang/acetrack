import { supabase } from '../config/supabase';
import type { AttendanceInsert } from '../types/Database';

export interface StudentInfo {
  student_id: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  course_id: number;
  year_level: string;
  avatar?: string;
}

export interface AttendanceRecord {
  id: number;
  event_id: number;
  student_id: string;
  firstname: string;
  middlename: string | null;
  lastname: string;
  course_id: number;
  year_level: string;
  avatar: string | null;
  time_in: string | null;
  time_out: string | null;
}

export class AttendanceService {
  /**
   * Mark student attendance (time in)
   */
  static async markTimeIn(eventId: number, studentInfo: StudentInfo): Promise<{ success: boolean; message: string; data?: AttendanceRecord }> {
    try {
      // Check if student already has attendance record for this event
      const { data: existingRecord, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', studentInfo.student_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRecord) {
        if (existingRecord.time_in) {
          return {
            success: false,
            message: 'Student has already marked time in for this event'
          };
        }
      }

      const attendanceData: AttendanceInsert = {
        event_id: eventId,
        student_id: studentInfo.student_id,
        firstname: studentInfo.firstname,
        middlename: studentInfo.middlename || null,
        lastname: studentInfo.lastname,
        course_id: studentInfo.course_id,
        year_level: studentInfo.year_level,
        avatar: studentInfo.avatar || null,
        time_in: new Date().toISOString(),
        time_out: null
      };

      let result;
      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('attendance')
          .update({ time_in: attendanceData.time_in })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('attendance')
          .insert(attendanceData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return {
        success: true,
        message: 'Time in marked successfully',
        data: result
      };
    } catch (error) {
      console.error('Error marking time in:', error);
      return {
        success: false,
        message: 'Failed to mark time in'
      };
    }
  }

  /**
   * Mark student time out
   */
  static async markTimeOut(eventId: number, studentId: string): Promise<{ success: boolean; message: string; data?: AttendanceRecord }> {
    try {
      const { data: existingRecord, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', studentId)
        .single();

      if (checkError) {
        return {
          success: false,
          message: 'No attendance record found for this student'
        };
      }

      if (!existingRecord.time_in) {
        return {
          success: false,
          message: 'Student has not marked time in yet'
        };
      }

      if (existingRecord.time_out) {
        return {
          success: false,
          message: 'Student has already marked time out'
        };
      }

      const { data, error } = await supabase
        .from('attendance')
        .update({ time_out: new Date().toISOString() })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Time out marked successfully',
        data: data
      };
    } catch (error) {
      console.error('Error marking time out:', error);
      return {
        success: false,
        message: 'Failed to mark time out'
      };
    }
  }

  /**
   * Get attendance records for an event
   */
  static async getEventAttendance(eventId: number): Promise<{ success: boolean; data?: AttendanceRecord[]; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('event_id', eventId)
        .order('time_in', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return {
        success: false,
        message: 'Failed to fetch attendance records'
      };
    }
  }

  /**
   * Parse QR code data to extract student information
   */
  static parseQRCode(qrData: string): StudentInfo | null {
    try {
      // Assuming QR code contains JSON with student info
      // Format: {"student_id":"123","firstname":"John","lastname":"Doe","course_id":1,"year_level":"1st"}
      const parsed = JSON.parse(qrData);
      
      if (!parsed.student_id || !parsed.firstname || !parsed.lastname || !parsed.course_id || !parsed.year_level) {
        return null;
      }

      return {
        student_id: parsed.student_id,
        firstname: parsed.firstname,
        middlename: parsed.middlename,
        lastname: parsed.lastname,
        course_id: parseInt(parsed.course_id),
        year_level: parsed.year_level,
        avatar: parsed.avatar
      };
    } catch (error) {
      console.error('Error parsing QR code:', error);
      return null;
    }
  }
}