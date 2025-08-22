"use client";

import { forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import QRCodeGenerator from "@/components/custom/QRCodeGenerator";
import { Building2 } from "lucide-react";
import Image from "next/image";

interface IDCardProps {
  studentName?: string;
  studentId?: string;
  course?: string;
  avatar?: string;
  qrCodeData?: string;
}

const IDCard = forwardRef<HTMLDivElement, IDCardProps>(
  (
    {
      studentName = "",
      studentId = "",
      course = "",
      avatar = "",
      qrCodeData = "",
    },
    ref
  ) => {
    console.log(avatar);
    
    return (
      <div
        ref={ref}
        data-idcard-root
        className="aspect-[7/10] max-w-[350px] w-full h-full p-4 space-y-3 print-safe"
        style={{
          background: "url('/images/id-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex items-center justify-between">
          <Avatar className="w-[100px] h-[40px] rounded-md">
            <AvatarImage
              src="/images/acetrack-logo-v2.png"
              alt="AceTrack Logo"
              className="object-contain"
            />
            <AvatarFallback className="print-safe-text bg-orange-100 text-orange-800 font-bold text-lg rounded-md">
              AT
            </AvatarFallback>
          </Avatar>
          <Image
            src="/images/aces-logo.jpg"
            alt="ACES Logo"
            width={35}
            height={35}
            className="object-contain rounded-full"
          />
        </div>
        <div className="flex flex-col gap-2 items-center">
          <Avatar className="size-32 border-3">
            <AvatarImage
              src={avatar || ""}
              alt="Student Photo"
              className="object-cover"
            />
            <AvatarFallback className="print-safe-text !text-white text-5xl">
              {studentName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center">
            <span className="text-lg text-orange-950 font-semibold print-safe-text">
              {studentName}
            </span>
            <span className="text-sm flex items-center gap-2 text-orange-950 font-medium print-safe-text">
              <Building2 size={18} /> {course} | {studentId}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white p-2 rounded-sm shadow-sm">
            <QRCodeGenerator
              value={qrCodeData}
              size={180}
              className="rounded-sm"
              errorCorrectionLevel="M"
            />
          </div>
          <span className="text-xs text-orange-950 font-medium mt-2 print-safe-text">
            Scan to verify
          </span>
        </div>
      </div>
    );
  }
);

IDCard.displayName = "IDCard";

export default IDCard;
