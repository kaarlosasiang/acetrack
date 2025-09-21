"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AttendanceChart from "@/components/custom/AttendanceChart";
import StudentCalendar from "@/components/custom/StudentCalendar";
import EventsList from "@/components/custom/EventsList";

export default function StudentDashboard() {
  const pathname = usePathname();
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh when navigating to this page
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [pathname]);

  return (
    <div className="w-full h-full mx-auto space-y-4 sm:space-y-6 px-4 sm:px-5 lg:px-0 max-w-5xl">
      {/* Header Section */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, Kaarlo 👋
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {new Date().toLocaleString()}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left column - Charts and Events */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {/* Stats Chart */}
          <div className="w-full">
            <AttendanceChart key={`attendance-${refreshKey}`} />
          </div>
          
          {/* Events List */}
          <div className="rounded-xl sm:rounded-2xl border p-4 sm:p-6 backdrop-blur-sm">
            <EventsList key={`events-${refreshKey}`} />
          </div>
        </div>
        
        {/* Right column - Calendar (Full calendar on desktop, week view on mobile) */}
        <div className="lg:col-span-4 order-1 lg:order-2">
          <div className="rounded-xl sm:rounded-2xl border p-4 sm:p-5 backdrop-blur-sm">
            <StudentCalendar key={`calendar-${refreshKey}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
