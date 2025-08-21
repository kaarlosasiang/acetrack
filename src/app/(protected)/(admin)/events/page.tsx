"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import eventService from "@/lib/services/Eventservice";
import type { Event } from "@/lib/types/Database";

const STATUS_LABELS = {
  0: { label: "Draft", variant: "secondary" as const },
  1: { label: "Active", variant: "default" as const },
  2: { label: "Completed", variant: "outline" as const },
  3: { label: "Cancelled", variant: "destructive" as const },
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await eventService.getEvents();
        setEvents(eventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-zinc-800">Events</h1>
          <Button asChild>
            <Link href="/events/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Link>
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-zinc-800">Events</h1>
          <Button asChild>
            <Link href="/events/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-800">Events</h1>
        <Button asChild>
          <Link href="/events/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first event.</p>
            <Button asChild>
              <Link href="/events/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex">
                {event.banner && (
                  <div className="relative w-48 h-32 flex-shrink-0">
                    <Image
                      src={event.banner}
                      alt={event.name}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-2">{event.name}</CardTitle>
                        <Badge variant={STATUS_LABELS[event.status as keyof typeof STATUS_LABELS]?.variant || "secondary"}>
                          {STATUS_LABELS[event.status as keyof typeof STATUS_LABELS]?.label || "Unknown"}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${event.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Starts: {formatDate(event.start_datetime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Ends: {formatDate(event.end_datetime)}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
