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
    return pathname === path || pathname.startsWith(path + "/");
  };

  const tabItems = [
    {
      path: "/student-dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      path: "/events",
      icon: CalendarDays,
      label: "Events",
    },
    {
      path: "/my-qr",
      icon: QrCode,
      label: "My QR",
    },
    {
      path: "/settings",
      icon: AlignRight,
      label: "Settings",
    },
  ];

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 max-w-2xl bg-white dark:bg-background border flex space-x-6 p-2 rounded-4xl shadow-lg">
      {tabItems.map((item) => {
        const IconComponent = item.icon;
        const active = isActive(item.path);

        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => router.push(item.path)}
                variant={"ghost"}
                className={`flex flex-col items-center gap-1 text-sm font-medium p-2 py-3 rounded-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  active
                    ? "bg-primary text-white dark:bg-primary dark:text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <IconComponent className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
