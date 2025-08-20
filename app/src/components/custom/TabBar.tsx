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
import { useRouter } from "next/navigation";

export default function TabBar() {
  const router = useRouter();

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 max-w-2xl bg-white dark:bg-background border flex space-x-6 p-4 rounded-3xl">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => router.push("/dashboard")}
            variant={"ghost"}
            className="flex flex-col items-center gap-1 text-sm font-medium bg-gray-700 p-2 py-3 rounded-full text-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
            className="flex flex-col items-center gap-1 text-sm font-medium bg-gray-700 p-2 py-3 rounded-full text-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
            className="flex flex-col items-center gap-1 text-sm font-medium bg-gray-700 p-2 py-3 rounded-full text-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
            className="flex flex-col items-center gap-1 text-sm font-medium bg-gray-700 p-2 py-3 rounded-full text-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
