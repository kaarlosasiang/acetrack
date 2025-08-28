"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Image from "next/image";

interface EventWithAttendance extends Event {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  attendanceStatus?: "attended" | "partial" | "absent";
}

const EventsList = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch events and attendance data
  useEffect(() => {
    const fetchEventsAndAttendance = async () => {
      setLoading(true);
      try {
        // Get all events (active status = 1)
        const eventsData = await eventService.getEvents({ status: 1 });

        if (eventsData && eventsData.length > 0) {
          // Process events to add date info
          const processedEvents: EventWithAttendance[] = eventsData.map(
            (event) => {
              const eventDate = new Date(event.start_datetime);
              const today = new Date();
              const todayStart = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              );
              const todayEnd = new Date(
                todayStart.getTime() + 24 * 60 * 60 * 1000
              );

              const isToday = eventDate >= todayStart && eventDate < todayEnd;
              const isPast = eventDate < todayStart;
              const isUpcoming = eventDate >= todayEnd;

              return {
                ...event,
                date: eventDate,
                isToday,
                isPast,
                isUpcoming,
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

    fetchEventsAndAttendance();
  }, [user?.student_id]);

  // Helper function to get attendance icon and text
  const getAttendanceDisplay = (attendanceStatus?: string) => {
    switch (attendanceStatus) {
      case "attended":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: "Present",
          color: "text-green-600",
        };
      case "partial":
        return {
          icon: <AlertCircle className="h-4 w-4 text-yellow-600" />,
          text: "Late/Partial",
          color: "text-yellow-600",
        };
      case "absent":
        return {
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          text: "Absent",
          color: "text-red-600",
        };
      default:
        return { icon: null, text: null, color: "" };
    }
  };

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
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Filter events by type
  const upcomingEvents = events
    .filter((event) => event.isUpcoming)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const todayEvents = events.filter((event) => event.isToday);

  const pastEvents = events
    .filter((event) => event.isPast)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10); // Show last 10 past events

  // Event card component
  const EventCard = ({ event }: { event: EventWithAttendance }) => {
    const attendance = getAttendanceDisplay(event.attendanceStatus);

    return (
      <Card className="hover:shadow-md transition-shadow max-w-xs p-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{event.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description || "No description available"}
              </p>
              {event.banner && (
                <Image 
                  src={event.banner} 
                  alt={event.name} 
                  width={300}
                  height={200}
                  className="rounded-md object-cover"
                />
              )}
            </div>
            <div className="flex flex-col items-end gap-1 ml-4">
              <Badge
                variant={
                  event.isToday
                    ? "default"
                    : event.isPast
                    ? "secondary"
                    : "outline"
                }
                className="whitespace-nowrap"
              >
                {formatDate(event.date)}
              </Badge>
              {attendance.icon && (
                <div
                  className={`flex items-center gap-1 text-xs ${attendance.color}`}
                >
                  {attendance.icon}
                  <span>{attendance.text}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(event.start_datetime)} -{" "}
                {formatTime(event.end_datetime)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Attendance Overview
                </h2>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 gap-2">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <CardHeader className="px-0">
          <CardTitle className="flex justify-between items-center gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Events
                </h2>
              </div>
            </div>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                Upcoming
                {upcomingEvents.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {upcomingEvents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="today" className="flex items-center gap-2">
                Today
                {todayEvents.length > 0 && (
                  <Badge
                    variant="default"
                    className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {todayEvents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-2">
                Past
                {pastEvents.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                  >
                    {pastEvents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardTitle>
        </CardHeader>
        <CardContent className="!p-0">
          <TabsContent value="upcoming">
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
                  <Image
                    src="/images/characters/not-found.png"
                    alt="Not Found"
                    width={48}
                    height={48}
                  />
                  <h3 className="font-medium mt-2">No upcoming events</h3>
                  <p className="text-sm">Duhh 🙄</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="today" className="mt-4">
            <div className="space-y-4">
              {todayEvents.length > 0 ? (
                todayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
                  <Image
                    src="/images/characters/not-found.png"
                    alt="Not Found"
                    width={48}
                    height={48}
                  />
                  <h3 className="font-medium mt-2">No events today</h3>
                  <p className="text-sm">Whatever 🙄</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            <div className="space-y-4">
              {pastEvents.length > 0 ? (
                pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
                  <Image
                    src="/images/characters/not-found.png"
                    alt="Not Found"
                    width={48}
                    height={48}
                  />
                  <h3 className="font-medium mb-2">No past events</h3>
                  <p className="text-sm">Enjoy your free time 🙄</p>
                </div>
              )}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default EventsList;
