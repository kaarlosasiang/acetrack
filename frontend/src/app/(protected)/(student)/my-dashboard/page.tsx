"use client";

import Container from "@/components/common/container";
import IconsBackground from "@/components/common/icons-bg";
import { useAuth } from "@/lib/contexts/authContext";
import { getDashboardUrl } from "@/lib/utils/dashboardRouter";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// StatCard component
interface StatCardProps {
  value: string;
  total: string;
  label: string;
  variant: "success" | "warning" | "info" | "danger";
}

function StatCard({ value, total, label, variant }: StatCardProps) {
  const styles = {
    success: {
      bg: "bg-green-50",
      ring: "ring-1 ring-green-200",
      glow: "shadow-green-100",
      text: "text-green-600",
    },
    warning: {
      bg: "bg-yellow-50",
      ring: "ring-1 ring-yellow-200",
      glow: "shadow-yellow-100",
      text: "text-yellow-600",
    },
    info: {
      bg: "bg-blue-50",
      ring: "ring-1 ring-blue-200",
      glow: "shadow-blue-100",
      text: "text-blue-600",
    },
    danger: {
      bg: "bg-red-50",
      ring: "ring-1 ring-red-200",
      glow: "shadow-red-100",
      text: "text-red-600",
    },
  };

  const currentStyle = styles[variant];

  return (
    <div
      className={`flex items-center gap-3 rounded-xl ${currentStyle.bg} ${currentStyle.ring} ${currentStyle.glow} p-4 backdrop-blur-sm transition-all hover:scale-105`}
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        {/* Circular progress ring */}
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={`${currentStyle.text} opacity-30`}
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(Number.parseInt(value) / Number.parseInt(total.split(" ")[0])) * 125} 125`}
            className={currentStyle.text}
          />
        </svg>
        <span className="text-2xl">{value}</span>
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${currentStyle.text}`}>{label}</p>
        <p className="text-xs text-muted-foreground">of {total}</p>
      </div>
    </div>
  );
}

// AttendanceChart component
interface AttendanceChartProps {
  percentage: number;
}

function AttendanceChart({ percentage }: AttendanceChartProps) {
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative h-48 w-48">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-muted opacity-10"
        />

        {/* Multi-segment gradient progress */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="url(#gradient-main)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
        />

        <defs>
          {/* Main gradient with vibrant colors */}
          <linearGradient
            id="gradient-main"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="25%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="75%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="bg-gradient-to-br from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-5xl font-bold text-transparent">
          {percentage}%
        </span>
        <span className="text-sm text-muted-foreground">Attendance</span>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update date time every second
  useEffect(() => {
    // Set initial time immediately
    setCurrentDateTime(new Date());

    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Role-based access control
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check if user should be on this dashboard
      const expectedDashboard = getDashboardUrl(user);

      // If user is super admin or org admin, redirect to their appropriate dashboard
      if (expectedDashboard !== "/my-dashboard") {
        router.push(expectedDashboard);
        return;
      }

      // Check if user has any active organization membership
      const hasActiveMembership = user.organizations?.some(
        org => org.membership_status === "active"
      );

      if (!hasActiveMembership) {
        router.push("/no-access");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing if not authorized (will be redirected)
  if (!user || getDashboardUrl(user) !== "/my-dashboard") {
    return null;
  }

  const primaryOrg = user.organizations?.find(
    org => org.membership_status === "active"
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Subtle Background Icons */}
      <IconsBackground />
      {/* Content */}
      <Container className="relative z-10 py-8">
        <div className="bg-white border border-slate-100 p-5 rounded-xl flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground">
              Welcome back, {user.first_name} {user.last_name}!
            </p>
            {primaryOrg && (
              <p className="text-sm text-gray-500">
                {primaryOrg.name} | {user.course}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {currentDateTime.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-sm text-gray-500">
              {currentDateTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard
            value="15"
            total="20 events"
            label="Events Attended"
            variant="success"
          />
          <StatCard
            value="8"
            total="10 assignments"
            label="Assignments"
            variant="warning"
          />
          <StatCard
            value="95"
            total="100 points"
            label="Attendance Score"
            variant="success"
          />
          <StatCard
            value="3"
            total="5 certificates"
            label="Certificates"
            variant="info"
          />
        </div>

        {/* Attendance Chart Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Overall Attendance
            </h3>
            <div className="flex items-center justify-center">
              <AttendanceChart percentage={87} />
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  Web Development Workshop
                </span>
                <span className="text-xs text-green-600 font-medium">
                  Present
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  Python Programming
                </span>
                <span className="text-xs text-green-600 font-medium">
                  Present
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Database Design</span>
                <span className="text-xs text-red-600 font-medium">Absent</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  Mobile App Development
                </span>
                <span className="text-xs text-green-600 font-medium">
                  Present
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

{
  /* <p className="text-lg text-gray-600">
  Welcome back, {user.first_name} {user.last_name}!
</p>;
{
  primaryOrg && (
    <p className="text-sm text-gray-500">
      {primaryOrg.name} • {primaryOrg.role}
    </p>
  );
} */
}
