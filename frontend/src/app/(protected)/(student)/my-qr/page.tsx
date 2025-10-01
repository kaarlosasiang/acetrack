"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Expand } from "lucide-react";
import QRCodeGenerator from "@/components/custom/QRCodeGenerator";
import { useAuth } from "@/context/AuthContext";

export default function MyQRPage() {
  const { user } = useAuth();

  console.log(user);

  // Prepare QR code data with user information
  const qrCodeData = JSON.stringify({
    student_id: user?.student_id,
    first_name: user?.first_name,
    last_name: user?.last_name,
    username: user?.username,
    course_id: user?.course_id,
    year_level: user?.year_level,
    avatar: user?.avatar,
  });

  // Function to download QR code as image
  const handleDownloadQR = () => {
    const canvas = document.querySelector('#qr-code-canvas canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `qr-code-${user?.username || 'student'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div>
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <Avatar className="size-16">
          <AvatarImage src={user?.avatar || ""} />
          <AvatarFallback className="text-2xl">
            {user?.first_name?.[0]}
            {user?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0 text-center">
          <p className="text-xl">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="flex flex-col items-center space-y-4 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your QR Code</h2>
          <p className="text-muted-foreground">
            Use this QR code for attendance and verification
          </p>
        </div>

        {/* QR Code Display */}
        <div id="qr-code-canvas" className="bg-white p-4 rounded-lg shadow-sm">
          <QRCodeGenerator
            value={qrCodeData}
            size={200}
            className="rounded-sm"
            errorCorrectionLevel="H"
            logo={{
              src: "/images/acetrack-icon.png",
              size: 40,
              borderRadius: 8,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Enlarge QR Code Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Expand className="mr-2 h-4 w-4" />
                Enlarge QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>QR Code - {user?.first_name} {user?.last_name}</DialogTitle>
                <DialogDescription>
                  Scan this QR code to verify student information
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeGenerator
                    value={qrCodeData}
                    size={300}
                    className="rounded-sm"
                    errorCorrectionLevel="H"
                    logo={{
                      src: "/images/acetrack-icon.png",
                      size: 60,
                      borderRadius: 12,
                    }}
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                  <p>@{user?.username} | ID: {user?.student_id}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Download QR Code Button */}
          <Button onClick={handleDownloadQR} className="bg-primary">
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            Present this QR code for attendance verification. Click &ldquo;Enlarge QR Code&rdquo; 
            for better scanning or &ldquo;Download QR Code&rdquo; to save it to your device.
          </p>
        </div>
      </div>
    </div>
  );
}
