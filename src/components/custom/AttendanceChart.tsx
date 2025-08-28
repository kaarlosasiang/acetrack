"use client";

import { Card } from "@/components/ui/card";
import { Cell, PieChart, Pie, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AttendanceService } from "@/lib/services/AttendanceService";
import { useTheme } from "next-themes";
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
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [currentShift, setCurrentShift] = useState({
    isActive: false,
    startTime: "",
    location: "",
    hasEnded: true,
  });
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

        // Fetch current shift
        const shiftResult = await AttendanceService.getCurrentShift(
          user.student_id
        );
        console.log("Current shift result:", shiftResult);

        if (shiftResult.success && shiftResult.data) {
          setCurrentShift({
            isActive: shiftResult.data.isActive,
            startTime: shiftResult.data.startTime || "",
            location: shiftResult.data.location || "",
            hasEnded: !shiftResult.data.isActive,
          });
          console.log("Successfully loaded current shift:", shiftResult.data);
        } else {
          console.error("Failed to load current shift:", shiftResult.message);
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user]);

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

  const MetricChart = ({ metric }: { metric: (typeof metrics)[0] }) => {
    const data = [
      { name: "Used", value: metric.percentage, fill: metric.color },
      {
        name: "Remaining",
        value: 100 - metric.percentage,
        fill: chartColors.background,
      },
    ];

    return (
      <div className="group flex flex-col items-center space-y-3 p-4 rounded-xl hover:scale-105 transition-all duration-300">
        {/* Chart */}
        <div className="relative w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient
                  id={`gradient-${metric.label}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={metric.color} stopOpacity={1} />
                  <stop
                    offset="100%"
                    stopColor={metric.color}
                    stopOpacity={0.7}
                  />
                </linearGradient>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={38}
                strokeWidth={2}
                stroke="transparent"
                strokeLinecap="round"
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === 0
                        ? `url(#gradient-${metric.label})`
                        : entry.fill
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {metric.count}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(metric.percentage)}%
            </span>
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {metric.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {metric.description}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {metric.count} of {metric.total}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 w-full overflow-hidden border">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Attendance Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your attendance statistics
            </p>
          </div>
        </div>
        <Button className="px-4 py-2 text-sm text-primary hover:text-primary/80 font-semibold bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200">
          View Details
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary/60" />
            </div>
          </div>
          <span className="ml-4 text-gray-600 dark:text-gray-400 font-medium">
            Loading attendance data...
          </span>
        </div>
      ) : !stats ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Attendance Data Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {!user?.student_id
                ? "Please make sure you're logged in with a valid student account."
                : "You haven't attended any events yet. Your attendance statistics will appear here once you start attending events."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 w-full">
          {/* Main Attendance Chart */}
          <div className="xl:col-span-2 flex flex-col items-center space-y-6">
            <div className="relative">
              {/* Main Chart */}
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient
                        id="mainPresentGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor={chartColors.present}
                          stopOpacity={1}
                        />
                        <stop
                          offset="100%"
                          stopColor={chartColors.present}
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                      <linearGradient
                        id="mainAbsentGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor={chartColors.absent}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor={chartColors.absent}
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        {
                          name: "Present",
                          value: displayStats.attendancePercentage,
                          fill: "url(#mainPresentGradient)",
                        },
                        {
                          name: "Absent",
                          value: 100 - displayStats.attendancePercentage,
                          fill: "url(#mainAbsentGradient)",
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      strokeWidth={3}
                      stroke="transparent"
                      strokeLinecap="round"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    ></Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl font-bold bg-gradient-to-r from-primary to-orange-700 bg-clip-text text-transparent">
                      {displayStats.attendancePercentage}%
                    </span>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                      Attendance Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Metrics Grid */}
          <div className="xl:col-span-3 grid grid-cols-2 gap-4">
            {metrics.map((metric, index) => (
              <MetricChart key={index} metric={metric} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AttendanceChart;
