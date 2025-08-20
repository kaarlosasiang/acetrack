"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlignRight,
  CalendarDays,
  LayoutDashboard,
  QrCode,
} from "lucide-react";
import { Button } from "../ui/button";
import { useRouter, usePathname } from "next/navigation";

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 max-w-2xl bg-white dark:bg-background border flex space-x-6 p-2 rounded-4xl shadow-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/student-dashboard")}
            variant={"ghost"}
            className={`flex flex-col items-center gap-1 text-sm font-medium p-2 py-3 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isActive("/student-dashboard") 
                ? "bg-primary text-white dark:bg-primary dark:text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <LayoutDashboard className="size-5" />
            {/* <span className="text-xs">Dashboard</span> */}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Dashboard</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/events")}
            variant={"ghost"}
            className={`flex flex-col items-center gap-1 text-sm font-medium p-2 py-3 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isActive("/events") 
                ? "bg-primary text-white dark:bg-primary dark:text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <CalendarDays className="size-5" />
            {/* <span className="text-xs">Calendar</span> */}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Events</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/my-qr")}
            variant={"ghost"}
            className={`flex flex-col items-center gap-1 text-sm font-medium p-2 py-3 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isActive("/my-qr") 
                ? "bg-primary text-white dark:bg-primary dark:text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <QrCode className="size-5" />
            {/* <span className="text-xs">My QR</span> */}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>My QR</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/settings")}
            variant={"ghost"}
            className={`flex flex-col items-center gap-1 text-sm font-medium p-2 py-3 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isActive("/settings") 
                ? "bg-primary text-white dark:bg-primary dark:text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <AlignRight className="size-5" />
            {/* <span className="text-xs">Settings</span> */}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
