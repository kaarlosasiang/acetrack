"use client";

import AttendanceChart from "@/components/custom/AttendanceChart";
import StudentCalendar from "@/components/custom/StudentCalendar";
import EventsList from "@/components/custom/EventsList";

export default function StudentDashboard() {
  return (
    <div className="max-w-5xl h-full mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome back, Kaarlo 👋</h1>
        <p className="text-gray-600 dark:text-gray-400">{new Date().toLocaleString()}</p>
      </div>
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left column - Charts and Events */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Stats Chart */}
          <AttendanceChart />
          
          {/* Events List */}
          <div className="rounded-2xl border  p-6  backdrop-blur-sm">
            <EventsList />
          </div>
        </div>
        
        {/* Right column - Calendar */}
        <div className="rounded-2xl border col-span-12 xl:col-span-4 p-5 backdrop-blur-sm">
          <StudentCalendar />
        </div>
      </div>
    </div>
  );
}
