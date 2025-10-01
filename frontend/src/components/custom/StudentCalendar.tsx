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

  // Get current week dates for mobile view
  const getCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay); // Go to Sunday
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const currentWeek = getCurrentWeek();

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) => event.date.toDateString() === date.toDateString()
    );
  };

  // Get dates that have events for calendar highlighting
  const eventDates = events.map((event) => event.date);

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Calendar - Full calendar on desktop, week view on mobile */}
      <Card className="flex-1 p-0 gap-2">
        <CardHeader className="px-0">
          <CardTitle className="p-0 text-lg flex items-center gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  <span className="lg:hidden">This Week</span>
                  <span className="hidden lg:block">Calendar</span>
                </h2>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Week View */}
          <div className="lg:hidden">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {currentWeek.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const hasEvents = getEventsForDate(date).length > 0;
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative p-2 text-sm rounded-lg transition-colors
                      ${isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : isToday 
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <div className="text-center">
                      {date.getDate()}
                    </div>
                    {hasEvents && (
                      <div className={`
                        absolute bottom-1 left-1/2 transform -translate-x-1/2 
                        w-1 h-1 rounded-full
                        ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}
                      `} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Full Calendar */}
          <div className="hidden lg:block">
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
          </div>
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
