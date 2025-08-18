"use client";

import Image from "next/image";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Dot, Github, LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import authService from "@/lib/services/AuthService";

export default function StudentNavBar() {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await authService.logout();
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <nav className="w-full p-4 border-b">
      <div className="flex justify-between items-center">
        <Image
          src={"/images/acetrack-logo.png"}
          width={150}
          height={21}
          alt="AceTrack Logo"
        />

        <div className="flex items-center gap-2">
          <Button variant={"ghost"} className="!px-1">
            <Github />
          </Button>
          <Button
            className="bg-primary/60 text-xs border border-orange-400 text-orange-800"
            onClick={() => handleNavigate("/login")}
          >
            Log In
          </Button>
          <Button variant={"outline"} className="text-xs">
            Sign Up
          </Button>
          <Button className="bg-primary/60 text-xs border border-orange-400 text-orange-800">
            Dashboard
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                <User className="size-3" /> sasiang64@gmail.com
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                <Settings className="size-3" /> Account Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-gray-500">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                <Dot /> System
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                <Dot /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                <Dot /> Light
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-xs font-medium"
                onClick={handleLogout}
              >
                <LogOut className="size-3" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
