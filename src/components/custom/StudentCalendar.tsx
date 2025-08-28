"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import eventService from "@/lib/services/Eventservice";
import { AttendanceService } from "@/lib/services/AttendanceService";
import type { Event } from "@/lib/types/Database";

interface EventWithCalendarData extends Event {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  attendanceStatus?: "attended" | "partial" | "absent";
}

const StudentCalendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventWithCalendarData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Get all events (active status = 1)
        const eventsData = await eventService.getEvents({ status: 1 });

        if (eventsData && eventsData.length > 0) {
          // Process events to add date info
          const processedEvents: EventWithCalendarData[] = eventsData.map(
            (event) => {
              const eventDate = new Date(event.start_datetime);
              const today = new Date();
              const todayStart = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              );

              const isToday =
                eventDate >= todayStart &&
                eventDate <
                  new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
              const isPast = eventDate < todayStart;

              return {
                ...event,
                date: eventDate,
                isToday,
                isPast,
              };
            }
          );

          // Fetch attendance status for past and today's events if user is available
          if (user?.student_id) {
            const pastAndTodayEvents = processedEvents.filter(
              (event) => event.isPast || event.isToday
            );

            for (const event of pastAndTodayEvents) {
              try {
                const attendanceResult =
                  await AttendanceService.getEventAttendance(event.id);
                if (attendanceResult.success && attendanceResult.data) {
                  // Find this student's attendance record
                  const studentRecord = attendanceResult.data.find(
                    (record) => record.student_id === user.student_id
                  );

                  if (studentRecord) {
                    if (studentRecord.time_in && studentRecord.time_out) {
                      event.attendanceStatus = "attended";
                    } else if (studentRecord.time_in) {
                      event.attendanceStatus = "partial";
                    } else {
                      event.attendanceStatus = "absent";
                    }
                  } else {
                    event.attendanceStatus = "absent";
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching attendance for event ${event.id}:`,
                  error
                );
              }
            }
          }

          setEvents(processedEvents);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user?.student_id]);

  // Helper function to get attendance icon
  const getAttendanceIcon = (event: EventWithCalendarData) => {
    if (!event.isPast && !event.isToday) return null;

    const status = event.attendanceStatus;
    switch (status) {
      case "attended":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-3 w-3 text-yellow-600" />;
      case "absent":
        return <XCircle className="h-3 w-3 text-red-600" />;
      default:
        return event.isPast ? (
          <XCircle className="h-3 w-3 text-gray-400" />
        ) : null;
    }
  };

  // Get events for selected date
  const selectedDateEvents = events.filter(
    (event) => event.date.toDateString() === selectedDate.toDateString()
  );

  // Get upcoming events (next 3 events)
  const upcomingEvents = events
    .filter((event) => !event.isPast)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  // Helper function to format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Get dates that have events for calendar highlighting
  const eventDates = events.map((event) => event.date);

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Calendar */}
      <Card className="flex-1 p-0 gap-2">
        <CardHeader className="px-0">
          <CardTitle className="p-0 text-lg flex items-center gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Calendar
                </h2>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full"
            modifiers={{
              hasEvent: eventDates,
            }}
            modifiersClassNames={{
              hasEvent: "bg-primary/10 text-primary font-semibold",
            }}
          />
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card className="p-0">
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium">
            {selectedDateEvents.length > 0
              ? `Events on ${formatDate(selectedDate)}`
              : "Upcoming Events"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {selectedDateEvents.length > 0
                ? selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="space-y-2 p-3 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          {getAttendanceIcon(event)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {event.isToday ? "Today" : formatDate(event.date)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start_datetime)} -{" "}
                          {formatTime(event.end_datetime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  ))
                : upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="space-y-2 p-3 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          {getAttendanceIcon(event)}
                        </div>
                        <Badge
                          variant={event.isToday ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {formatDate(event.date)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start_datetime)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  ))}

              {selectedDateEvents.length === 0 &&
                upcomingEvents.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentCalendar;
