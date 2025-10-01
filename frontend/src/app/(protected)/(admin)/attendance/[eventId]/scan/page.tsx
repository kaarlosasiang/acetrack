"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AttendanceScanner } from "@/components/custom/AttendanceScanner";
import {
  AttendanceService,
  type AttendanceRecord,
} from "@/lib/services/AttendanceService";
import { Clock, Users, Calendar, AlertCircle } from "lucide-react";

export default function ScanPage() {
  const params = useParams();
  const eventId = parseInt(params.eventId as string);

  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"time-in" | "time-out">(
    "time-in"
  );

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
    setAttendanceRecords((prev) => {
      const existingIndex = prev.findIndex((r) => r.id === record.id);
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
  const timeInCount = attendanceRecords.filter((r) => r.time_in).length;
  const timeOutCount = attendanceRecords.filter((r) => r.time_out).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Attendance Scanner</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Scan student QR codes to mark attendance
          </p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-2 space-y-1 sm:space-y-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-bold">{totalAttendees}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-2 space-y-1 sm:space-y-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-bold">{timeInCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Time In</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-2 space-y-1 sm:space-y-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                <div className="text-center sm:text-left">
                  <p className="text-lg sm:text-2xl font-bold">{timeOutCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Time Out</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scanner Tabs */}
      <Tabs
        value={selectedMode}
        onValueChange={(value) =>
          setSelectedMode(value as "time-in" | "time-out")
        }
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="time-in" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Time In
          </TabsTrigger>
          <TabsTrigger value="time-out" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Time Out
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-in" className="mt-4 sm:mt-6">
          <AttendanceScanner
            eventId={eventId}
            mode="time-in"
            onAttendanceMarked={handleAttendanceMarked}
          />
        </TabsContent>

        <TabsContent value="time-out" className="mt-4 sm:mt-6">
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
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No attendance records yet</p>
              <p className="text-xs sm:text-sm">
                Start scanning QR codes to see attendance records here
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-2 sm:space-y-0"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {record.firstname} {record.lastname}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {record.student_id} • {record.year_level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    {record.time_in && (
                      <Badge variant="default" className="text-xs">
                        In: {new Date(record.time_in).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Badge>
                    )}
                    {record.time_out && (
                      <Badge variant="secondary" className="text-xs">
                        Out: {new Date(record.time_out).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {attendanceRecords.length > 10 && (
                <p className="text-center text-xs sm:text-sm text-muted-foreground">
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
