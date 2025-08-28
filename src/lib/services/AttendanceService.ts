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
   * Get attendance statistics for a student
   */
  static async getStudentAttendanceStats(studentId: string): Promise<{
    success: boolean;
    data?: {
      attendancePercentage: number;
      totalEvents: number;
      attendedEvents: number;
      missedEvents: number;
      upcomingEvents: number;
      recentAttendance: {
        eventName: string;
        date: string;
        status: 'present' | 'absent' | 'late';
        timeIn?: string;
        timeOut?: string;
      }[];
    };
    message?: string;
  }> {
    try {
      console.log('Fetching attendance stats for student:', studentId);

      // Get student's profile to find their course
      const { data: studentProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('course_id')
        .eq('student_id', studentId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Student profile:', studentProfile);

      // Get events for the student's course (if course-specific) or all events
      const eventsQuery = supabase
        .from('events')
        .select('id, name, start_datetime, end_datetime, status')
        .eq('status', 1) // Only active events
        .order('start_datetime', { ascending: false });

      // If we have a course_id, filter by it, otherwise get all events
      if (studentProfile?.course_id) {
        console.log('Filtering events by course_id:', studentProfile.course_id);
        // Note: Only filter if events table has course_id column
        // For now, we'll get all events since the schema might not have course filtering
      }

      const { data: allEvents, error: eventsError } = await eventsQuery;
      if (eventsError) {
        console.error('Events error:', eventsError);
        throw eventsError;
      }

      console.log('All events found:', allEvents?.length || 0);

      // Get student's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('time_in', { ascending: false });

      if (attendanceError) {
        console.error('Attendance error:', attendanceError);
        throw attendanceError;
      }

      console.log('Attendance records found:', attendanceRecords?.length || 0);

      // Calculate stats
      const now = new Date();
      const pastEvents = allEvents?.filter(event => 
        new Date(event.end_datetime) < now
      ) || [];
      
      const totalEvents = pastEvents.length;
      console.log('Past events:', totalEvents);

      const attendedEvents = attendanceRecords?.filter(record => 
        record.time_in && record.time_out
      ).length || 0;

      const partialAttended = attendanceRecords?.filter(record => 
        record.time_in && !record.time_out
      ).length || 0;

      const totalAttended = attendedEvents + partialAttended;
      const missedEvents = Math.max(0, totalEvents - totalAttended);
      
      const upcomingEvents = allEvents?.filter(event => 
        new Date(event.start_datetime) > now
      ).length || 0;

      const attendancePercentage = totalEvents > 0 
        ? Math.round((totalAttended / totalEvents) * 100) 
        : 0;

      console.log('Calculated stats:', {
        attendancePercentage,
        totalEvents,
        attendedEvents: totalAttended,
        missedEvents,
        upcomingEvents
      });

      // Get event details for recent attendance
      const recentAttendanceIds = attendanceRecords?.slice(0, 5).map(r => r.event_id) || [];
      const { data: recentEvents } = recentAttendanceIds.length > 0 
        ? await supabase
            .from('events')
            .select('id, name, start_datetime')
            .in('id', recentAttendanceIds)
        : { data: [] };

      // Format recent attendance
      const recentAttendance = attendanceRecords?.slice(0, 5).map(record => {
        const event = recentEvents?.find(e => e.id === record.event_id);
        return {
          eventName: event?.name || 'Unknown Event',
          date: event?.start_datetime ? 
            new Date(event.start_datetime).toLocaleDateString() : 'Unknown Date',
          status: (record.time_in && record.time_out) ? 'present' : 
                  record.time_in ? 'late' : 'absent' as 'present' | 'absent' | 'late',
          timeIn: record.time_in ? 
            new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            undefined,
          timeOut: record.time_out ? 
            new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
            undefined,
        };
      }) || [];

      const result = {
        attendancePercentage,
        totalEvents,
        attendedEvents: totalAttended,
        missedEvents,
        upcomingEvents,
        recentAttendance,
      };

      console.log('Final result:', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error fetching student attendance stats:', error);
      return {
        success: false,
        message: 'Failed to fetch attendance statistics'
      };
    }
  }

  /**
   * Get current active shift for a student
   */
  static async getCurrentShift(studentId: string): Promise<{
    success: boolean;
    data?: {
      isActive: boolean;
      eventName?: string;
      location?: string;
      startTime?: string;
      hasTimeOut: boolean;
    };
    message?: string;
  }> {
    try {
      // Get current attendance record where time_in exists but time_out is null
      const { data: currentShift, error } = await supabase
        .from('attendance')
        .select(`
          *,
          event:events(name, location, start_datetime)
        `)
        .eq('student_id', studentId)
        .not('time_in', 'is', null)
        .is('time_out', null)
        .order('time_in', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!currentShift) {
        return {
          success: true,
          data: {
            isActive: false,
            hasTimeOut: false
          }
        };
      }

      return {
        success: true,
        data: {
          isActive: true,
          eventName: currentShift.event?.name || 'Unknown Event',
          location: currentShift.event?.location || 'Unknown Location',
          startTime: currentShift.time_in ? 
            new Date(currentShift.time_in).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : undefined,
          hasTimeOut: false
        }
      };
    } catch (error) {
      console.error('Error fetching current shift:', error);
      return {
        success: false,
        message: 'Failed to fetch current shift information'
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
        course_id: typeof parsed.course_id === 'number' ? parsed.course_id : parseInt(parsed.course_id),
        year_level: parsed.year_level,
        avatar: parsed.avatar
      };
    } catch (error) {
      console.error('Error parsing QR code:', error);
      return null;
    }
  }
}