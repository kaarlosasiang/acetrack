"use client";

import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AttendanceService } from "@/lib/services/AttendanceService";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { TrendingUp, Calendar, Users } from "lucide-react";
import { Button } from "../ui/button";

interface AttendanceStats {
  attendancePercentage: number;
  totalEvents: number;
  attendedEvents: number;
  missedEvents: number;
  upcomingEvents: number;
  recentAttendance: {
    eventName: string;
    date: string;
    status: "present" | "absent" | "late";
    timeIn?: string;
    timeOut?: string;
  }[];
}

const AttendanceChart = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const pathname = usePathname();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme-aware colors using modern gradient system
  const isDark = theme === "dark";
  const chartColors = {
    present: isDark ? "#10b981" : "#059669", // Emerald gradient
    presentGradient: isDark
      ? "url(#presentGradient)"
      : "url(#presentGradientLight)",
    absent: isDark ? "#FB2B36" : "#FB2B36", // destructive
    absentGradient: isDark
      ? "url(#absentGradient)"
      : "url(#absentGradientLight)",
    upcoming: isDark ? "#3b82f6" : "#2563eb", // Blue gradient
    upcomingGradient: isDark
      ? "url(#upcomingGradient)"
      : "url(#upcomingGradientLight)",
    total: isDark ? "#8b5cf6" : "#7c3aed", // Purple gradient
    totalGradient: isDark ? "url(#totalGradient)" : "url(#totalGradientLight)",
    background: isDark ? "#1f2937" : "#f8fafc", // Subtle background
  };

  // Fetch real attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user?.student_id) {
        console.log("No student_id found in user:", user?.student_id);
        setLoading(false);
        return;
      }

      console.log("Fetching attendance data for student:", user.student_id);

      try {
        // Fetch attendance stats
        const statsResult = await AttendanceService.getStudentAttendanceStats(
          user.student_id
        );
        console.log("Attendance stats result:", statsResult);

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
          console.log(
            "Successfully loaded attendance stats:",
            statsResult.data
          );
        } else {
          console.error(
            "Failed to load attendance stats:",
            statsResult.message
          );
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user, pathname]); // Added pathname as dependency

  // Use real stats if available, otherwise show empty state
  const displayStats = stats || {
    attendancePercentage: 0,
    totalEvents: 0,
    attendedEvents: 0,
    missedEvents: 0,
    upcomingEvents: 0,
    recentAttendance: [],
  };

  // Individual metric data - student-focused metrics with icons
  const metrics = [
    {
      label: "Present",
      count: displayStats.attendedEvents,
      total: displayStats.totalEvents,
      percentage:
        displayStats.totalEvents > 0
          ? (displayStats.attendedEvents / displayStats.totalEvents) * 100
          : 0,
      color: chartColors.present,
      gradient: chartColors.presentGradient,
      status: "Events",
      icon: TrendingUp,
      description: "Successfully attended",
    },
    {
      label: "Absent",
      count: displayStats.missedEvents,
      total: displayStats.totalEvents,
      percentage:
        displayStats.totalEvents > 0
          ? (displayStats.missedEvents / displayStats.totalEvents) * 100
          : 0,
      color: chartColors.absent,
      gradient: chartColors.absentGradient,
      status: "Events",
      icon: Users,
      description: "Missed events",
    },
    {
      label: "Upcoming",
      count: displayStats.upcomingEvents,
      total: displayStats.upcomingEvents || 1,
      percentage: 100, // Show full circle for upcoming events
      color: chartColors.upcoming,
      gradient: chartColors.upcomingGradient,
      status: "Events",
      icon: Calendar,
      description: "Scheduled events",
    },
    {
      label: "Total Events",
      count: displayStats.totalEvents,
      total: displayStats.totalEvents + displayStats.upcomingEvents || 1,
      percentage:
        displayStats.totalEvents > 0
          ? (displayStats.totalEvents /
              (displayStats.totalEvents + displayStats.upcomingEvents || 1)) *
            100
          : 0,
      color: chartColors.total,
      gradient: chartColors.totalGradient,
      status: "Events",
      icon: Calendar,
      description: "All events",
    },
  ];

  const MetricCard = ({ metric }: { metric: (typeof metrics)[0] }) => {
    // Define background colors for each metric
    const getCardStyle = (label: string) => {
      switch (label) {
        case "Present":
          return "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1f2126] dark:to-[#252a30] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
        case "Absent":
          return "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1f2126] dark:to-[#252a30] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
        case "Upcoming":
          return "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1f2126] dark:to-[#252a30] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
        case "Total Events":
          return "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1f2126] dark:to-[#252a30] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
        default:
          return "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#1f2126] dark:to-[#252a30] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
      }
    };

    return (
      <div className={`${getCardStyle(metric.label)} rounded-lg p-3 relative overflow-hidden group hover:scale-105 transition-all duration-300`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-16 h-16 opacity-5 dark:opacity-10">
          <metric.icon className="w-full h-full" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <metric.icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs opacity-70 dark:opacity-80 font-medium">
                {metric.label}
              </span>
            </div>
            
            <div className="text-xl sm:text-2xl font-bold">
              {metric.count.toLocaleString()}
            </div>
            
            <div className="text-xs opacity-60 dark:opacity-70 mt-1">
              {metric.description}
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-xs text-orange-500/90 dark:text-white font-medium">
              {metric.percentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 bg-slate-300/20 dark:bg-slate-600/20 rounded-full h-1">
          <div 
            className={`rounded-full h-1 transition-all duration-1000 ease-out ${
              metric.label === "Present" ? "bg-green-500/80 dark:bg-green-400/80" :
              metric.label === "Absent" ? "bg-red-500/80 dark:bg-red-400/80" :
              metric.label === "Upcoming" ? "bg-blue-500/80 dark:bg-blue-400/80" :
              "bg-purple-500/80 dark:bg-purple-400/80"
            }`}
            style={{ width: `${metric.percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="!p-0 gap-0 sm:p-5 w-full overflow-hidden">
      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              Attendance Overview
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Your attendance statistics
            </p>
          </div>
        </div>
        <Button className="px-3 py-2 sm:px-4 text-xs sm:text-sm text-primary hover:text-primary/80 font-semibold bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200">
          View Details
        </Button>
      </div> */}

      {loading ? (
        <div className="flex flex-col sm:flex-row items-center justify-center py-12 sm:py-16 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary/60" />
            </div>
          </div>
          <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium text-center">
            Loading attendance data...
          </span>
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-4 px-4">
          <div className="p-3 sm:p-4 rounded-full bg-gray-100 dark:bg-gray-800">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Attendance Data Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">
              {!user?.student_id
                ? "Please make sure you're logged in with a valid student account."
                : "You haven't attended any events yet. Your attendance statistics will appear here once you start attending events."}
            </p>
          </div>
        </div>
      ) : (
        // Metrics Grid - Single Row Layout
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
