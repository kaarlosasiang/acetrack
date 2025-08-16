"use client";

import { LoginForm } from "@/components/forms/login/form";
import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <Image
            src="/images/acetrack-icon.png"
            alt="AceTrack Icon"
            width={24}
            height={24}
          />
          AceTrack
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
