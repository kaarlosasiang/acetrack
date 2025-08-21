"use client";

import Image from "next/image";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Check,
  Github,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import Container from "./Container";

export default function StudentNavBar() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem("user");
    router.push("/login");
  };

  const themeOptions = [
    { value: "system", label: "System", icon: Monitor },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
  ];

  return (
    <nav className="w-full py-3 border-b">
      <Container className="px-5 sm:px-0">
        <div className="flex justify-between items-center">
          <Image
            src={"/images/acetrack-logo.png"}
            width={120}
            height={14}
            alt="AceTrack Logo"
          />

          <div className="flex items-center gap-2">
            <Button variant={"ghost"} className="!px-1">
              <Github />
            </Button>

            {!isAuthenticated ? (
              // Show login/signup buttons when user is not authenticated
              <>
                <Button
                  className="bg-primary/60 text-xs border border-orange-400 text-orange-800 dark:text-white"
                  onClick={() => handleNavigate("/login")}
                >
                  Log In
                </Button>
                <Button
                  variant={"outline"}
                  className="text-xs"
                  onClick={() => handleNavigate("/register")}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              // Show dashboard button when user is authenticated
              <Button
                className="bg-primary/60 text-xs dark:text-white border border-orange-400 text-orange-800"
                onClick={() => handleNavigate("/dashboard")}
              >
                Dashboard
              </Button>
            )}

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Avatar>
                    <AvatarImage
                      src={user?.avatar || "https://github.com/shadcn.png"}
                    />
                    <AvatarFallback>
                      {user?.first_name?.charAt(0)}
                      {user?.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                    <User className="size-3" /> {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 text-xs font-medium">
                    <Settings className="size-3" /> Account Preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] text-gray-500">
                    Theme
                  </DropdownMenuLabel>
                  {themeOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = theme === option.value;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        onClick={() => setTheme(option.value)}
                      >
                        <IconComponent className="size-3" />
                        {option.label}
                        {isSelected && <Check className="size-3 ml-auto" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-xs font-medium"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-3" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Container>
    </nav>
  );
}
