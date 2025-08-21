"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AttendanceScanner } from '@/components/custom/AttendanceScanner';
import { AttendanceService, type AttendanceRecord } from '@/lib/services/AttendanceService';
import { Clock, Users, Calendar, AlertCircle } from 'lucide-react';

export default function ScanPage() {
  const params = useParams();
  const eventId = parseInt(params.eventId as string);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'time-in' | 'time-out'>('time-in');

  // Fetch existing attendance records
  useEffect(() => {
    const fetchAttendance = async () => {
      setIsLoading(true);
      const result = await AttendanceService.getEventAttendance(eventId);
      if (result.success && result.data) {
        setAttendanceRecords(result.data);
      }
      setIsLoading(false);
    };

    if (eventId) {
      fetchAttendance();
    }
  }, [eventId]);

  // Handle new attendance record
  const handleAttendanceMarked = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => {
      const existingIndex = prev.findIndex(r => r.id === record.id);
      if (existingIndex >= 0) {
        // Update existing record
        const updated = [...prev];
        updated[existingIndex] = record;
        return updated;
      } else {
        // Add new record
        return [record, ...prev];
      }
    });
  };

  // Calculate statistics
  const totalAttendees = attendanceRecords.length;
  const timeInCount = attendanceRecords.filter(r => r.time_in).length;
  const timeOutCount = attendanceRecords.filter(r => r.time_out).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Attendance Scanner</h1>
        <p className="text-muted-foreground">
          Scan student QR codes to mark attendance for Event #{eventId}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalAttendees}</p>
                <p className="text-sm text-muted-foreground">Total Attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{timeInCount}</p>
                <p className="text-sm text-muted-foreground">Time In</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{timeOutCount}</p>
                <p className="text-sm text-muted-foreground">Time Out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Tabs */}
      <Tabs value={selectedMode} onValueChange={(value) => setSelectedMode(value as 'time-in' | 'time-out')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="time-in" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time In
          </TabsTrigger>
          <TabsTrigger value="time-out" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Out
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-in" className="mt-6">
          <AttendanceScanner
            eventId={eventId}
            mode="time-in"
            onAttendanceMarked={handleAttendanceMarked}
          />
        </TabsContent>

        <TabsContent value="time-out" className="mt-6">
          <AttendanceScanner
            eventId={eventId}
            mode="time-out"
            onAttendanceMarked={handleAttendanceMarked}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records yet</p>
              <p className="text-sm">Start scanning QR codes to see attendance records here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {record.firstname} {record.lastname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.student_id} • {record.year_level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {record.time_in && (
                      <Badge variant="default">
                        In: {new Date(record.time_in).toLocaleTimeString()}
                      </Badge>
                    )}
                    {record.time_out && (
                      <Badge variant="secondary">
                        Out: {new Date(record.time_out).toLocaleTimeString()}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {attendanceRecords.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  And {attendanceRecords.length - 10} more records...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
