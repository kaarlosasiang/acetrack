"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeCheck, BadgeX, Bell, Search } from "lucide-react";
import Image from "next/image";
import Container from "../common/container";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function StudentNavBar() {
  return (
    <div className="py-2 border-b border-gray-200">
      <Container className="flex justify-between items-center">
        <Image
          src="/images/acetrack-logo.png"
          alt="Student Portal Logo"
          width={130}
          height={30}
        />
        <div className="flex items-center gap-2">
          <div className="hidden md:block relative bg-accent py-0.5 rounded-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-4" />
            <Input
              className="pl-10 py-2 w-64 mb-0.5 border-none rounded-lg focus:outline-none shadow-none focus:border-transparent focus:!ring-0 focus:!ring-offset-0"
              placeholder="Search events, organizations..."
              type="search"
            />
          </div>
          <Button
            variant="secondary"
            className="py-5 text-gray-500 hover:text-gray-800 rounded-lg"
          >
            <Bell className="size-5" />
          </Button>
          <div className="relative flex items-center gap-4 py-1 pl-2 pr-1 bg-accent rounded-lg">
            <Tooltip>
              <TooltipTrigger>
                <div className="text-red-600 flex items-center">
                  <BadgeX className="size-4 inline-block mr-2" />
                  <span className="font-bold text-sm">10</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Absent(s)</p>
                <span className="font-bold text-sm">10</span>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div className="text-green-500 flex items-center">
                  <BadgeCheck className="size-4 inline-block mr-2" />
                  <span className="font-bold text-sm">10</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Present</p>
                <span className="font-bold text-sm">10</span>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar>
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="User Avatar"
                  />
                  <AvatarFallback>UA</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 absolute -right-10 top-4 !rounded-lg bg-accent border-none"
                align="start"
              >
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    Profile
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Billing
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Settings
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Keyboard shortcuts
                    <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      Invite users
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Email</DropdownMenuItem>
                        <DropdownMenuItem>Message</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>More...</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    New Team
                    <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>GitHub</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuItem disabled>API</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => alert("Logging out...")}>
                  Log out
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Container>
    </div>
  );
}
