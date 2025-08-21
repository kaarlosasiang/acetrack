"use client";

import { useRef, useEffect, useState } from "react";
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
import html2canvas from "html2canvas";
import IDCard from "./IDCard";
import QRCodeGenerator from "@/components/custom/QRCodeGenerator";
import { useAuth } from "@/context/AuthContext";
import userService from "@/lib/services/UserService";
import courseService from "@/lib/services/CourseService";

export default function MyQRPage() {
  const { user, loading } = useAuth();
  const idCardRef = useRef<HTMLDivElement>(null);
  const [courseName, setCourseName] = useState<string>("");

  // Fetch course name when user data is available
  useEffect(() => {
    const fetchCourseData = async () => {
      if (user?.course_id) {
        try {
          const course = await courseService.getCourse(user.course_id);
          if (course) {
            setCourseName(course.short);
          }
        } catch (error) {
          console.error("Failed to fetch course data:", error);
        }
      }
    };

    fetchCourseData();
  }, [user]);

  // Don't render if loading or no user
  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[50vh]">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Loading...</h1>
          <p className="text-muted-foreground">
            Loading your student information
          </p>
        </div>
      </div>
    );
  }

  // Prepare student data from user context
  const studentData = {
    studentName: `${user.first_name}${
      user.middle_initial ? ` ${user.middle_initial}.` : ""
    } ${user.last_name}`,
    studentId: user.student_id,
    course: courseName || "Loading...",
    profileImage: userService.getAvatarUrl(user),
    qrCodeData: `https://acetrack.app/verify/${user.student_id}`,
  };

  console.log("Course name from user:", courseName);
  console.log("Generated acronym:", courseName || "No course name");

  const handleDownloadIDCard = async () => {
    if (!idCardRef.current) return;

    try {
      // Wait for all images and QR code to fully load
      const images = idCardRef.current.querySelectorAll("img");

      // Wait for all images to load
      await Promise.all([
        ...Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }),
        // Wait a bit for QR code canvas to render
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);

      const canvas = await html2canvas(idCardRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2,
        backgroundColor: null, // Keep transparent to preserve background
        foreignObjectRendering: true,
        imageTimeout: 0,
        onclone: (clonedDoc: Document) => {
          // Fix image rendering in cloned document
          const clonedImages = clonedDoc.querySelectorAll("img");
          clonedImages.forEach((img) => {
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.display = "block";
            // Force crossOrigin for better compatibility
            img.crossOrigin = "anonymous";
          });

          // Fix canvas (QR code) rendering
          const clonedCanvases = clonedDoc.querySelectorAll("canvas");
          clonedCanvases.forEach((canvas) => {
            canvas.style.maxWidth = "100%";
            canvas.style.height = "auto";
            canvas.style.display = "block";
          });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const link = document.createElement("a");
      link.download = `student-id-card-${studentData.studentId}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (error) {
      console.error("Failed to download ID card:", error);

      // Fallback method with simpler options
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const canvas = await html2canvas(idCardRef.current, {
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          backgroundColor: "#ffffff",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const link = document.createElement("a");
        link.download = `student-id-card-${studentData.studentId}-fallback.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (fallbackError) {
        alert(
          "Failed to download ID card. Please try again or contact support."
        );
        console.error("Fallback also failed:", fallbackError);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">My QR Code</h1>
        <p className="text-muted-foreground">
          Your student ID card and QR code for attendance verification
        </p>
      </div>

      <IDCard ref={idCardRef} {...studentData} />

      <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Expand className="mr-2 h-4 w-4" />
              Enlarge QR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code - {studentData.studentName}</DialogTitle>
              <DialogDescription>
                Scan this QR code to verify student information
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              <QRCodeGenerator
                value={studentData.qrCodeData}
                size={300}
                className="rounded-sm"
                errorCorrectionLevel="H"
              />
              <div className="text-center text-sm text-muted-foreground">
                <p className="font-medium">{studentData.studentName}</p>
                <p>
                  {studentData.course} | {studentData.studentId}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          className="bg-primary/60 dark:text-white border border-orange-400 text-orange-800"
          onClick={handleDownloadIDCard}
        >
          <Download className="mr-2 h-4 w-4" />
          <span className="font-medium">Download QR</span>
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-md">
        <p>
          Use the QR code for attendance verification. Click &ldquo;Enlarge QR Code&rdquo;
          for better scanning or &ldquo;Download ID Card&rdquo; to save your complete
          student ID.
        </p>
      </div>
    </div>
  );
}
