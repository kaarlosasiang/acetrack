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
    avatar: user.avatar ?? undefined,
    qrCodeData: JSON.stringify({
      student_id: user.student_id,
      firstname: user.first_name,
      middlename: user.middle_initial || undefined,
      lastname: user.last_name,
      course_id: user.course_id,
      year_level: user.year_level,
      avatar: user.avatar
    }),
  };

  console.log("Course name from user:", courseName);
  console.log("Generated acronym:", courseName || "No course name");
  console.log("User:", user);

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
        // Preload background image used by the ID card
        new Promise((resolve) => {
          const bg = new Image();
          bg.crossOrigin = "anonymous";
          bg.onload = resolve;
          bg.onerror = resolve;
          bg.src = new URL("/images/id-bg.png", window.location.origin).toString();
        }),
        // Preload all static images used in the ID card
        new Promise((resolve) => {
          const acetrackLogo = new Image();
          acetrackLogo.crossOrigin = "anonymous";
          acetrackLogo.onload = resolve;
          acetrackLogo.onerror = resolve;
          acetrackLogo.src = new URL("/images/acetrack-logo-v2.png", window.location.origin).toString();
        }),
        new Promise((resolve) => {
          const acesLogo = new Image();
          acesLogo.crossOrigin = "anonymous";
          acesLogo.onload = resolve;
          acesLogo.onerror = resolve;
          acesLogo.src = new URL("/images/aces-logo.jpg", window.location.origin).toString();
        }),
      ]);

      const rect = idCardRef.current.getBoundingClientRect();

      const canvas = await html2canvas(idCardRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2,
        backgroundColor: "#ffffff",
        foreignObjectRendering: false,
        imageTimeout: 0,
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
        onclone: (clonedDoc: Document) => {
          // Remove dark mode to avoid OKLCH variables coming from .dark scope
          clonedDoc.documentElement.classList.remove("dark");

          // Force safe backgrounds on html and body
          const htmlEl = clonedDoc.documentElement as HTMLElement;
          const bodyEl = clonedDoc.body as HTMLElement;
          [htmlEl, bodyEl].forEach((el) => {
            el.style.background = "transparent";
            el.style.backgroundColor = "transparent";
          });

          // Apply safe CSS variable fallbacks to avoid OKLCH parsing
          const applySafeVars = (el: HTMLElement) => {
            const safeVars: Record<string, string> = {
              "--background": "#ffffff",
              "--foreground": "#111827",
              "--card": "#ffffff",
              "--card-foreground": "#111827",
              "--popover": "#ffffff",
              "--popover-foreground": "#111827",
              "--primary": "#ea580c",
              "--primary-foreground": "#ffffff",
              "--secondary": "#f3f4f6",
              "--secondary-foreground": "#111827",
              "--muted": "#f3f4f6",
              "--muted-foreground": "#6b7280",
              "--accent": "#f3f4f6",
              "--accent-foreground": "#111827",
              "--destructive": "#dc2626",
              "--border": "#e5e7eb",
              "--input": "#e5e7eb",
              "--ring": "#9ca3af",
              "--sidebar": "#ffffff",
              "--sidebar-foreground": "#111827",
              "--sidebar-primary": "#ea580c",
              "--sidebar-primary-foreground": "#ffffff",
              "--sidebar-accent": "#f3f4f6",
              "--sidebar-accent-foreground": "#111827",
              "--sidebar-border": "#e5e7eb",
              "--sidebar-ring": "#9ca3af",
            };
            Object.entries(safeVars).forEach(([k, v]) => el.style.setProperty(k, v));
          };

          applySafeVars(htmlEl);
          applySafeVars(bodyEl);

          // Ensure the cloned card has explicit dimensions (aspect-ratio can be unreliable)
          const clonedCard = clonedDoc.querySelector('[data-idcard-root]') as HTMLElement | null;
          if (clonedCard) {
            clonedCard.style.width = `${Math.ceil(rect.width)}px`;
            clonedCard.style.height = `${Math.ceil(rect.height)}px`;
            clonedCard.style.maxWidth = `${Math.ceil(rect.width)}px`;
            clonedCard.style.maxHeight = `${Math.ceil(rect.height)}px`;
            clonedCard.style.transform = "none";
            // Force absolute background image URL so the renderer can fetch it
            clonedCard.style.backgroundImage = `url(${new URL("/images/id-bg.png", (clonedDoc.defaultView?.location?.origin ?? window.location.origin)).toString()})`;
            clonedCard.style.backgroundSize = "cover";
            clonedCard.style.backgroundPosition = "center";
            clonedCard.style.backgroundRepeat = "no-repeat";

            // Sanitize descendant colors to avoid unsupported OKLCH values rendering as transparent
            const win = clonedDoc.defaultView;
            const elements = clonedCard.querySelectorAll("*");
            elements.forEach((el) => {
              const element = el as HTMLElement;
              if (!win) return;
              const cs = win.getComputedStyle(element);
              const fixColor = (v: string | null, fallback: string) => {
                if (!v) return fallback;
                return v.includes("oklch") ? fallback : v;
              };
              const safeText = fixColor(cs.color, "#111827");
              const safeBg = fixColor(cs.backgroundColor, "transparent");
              const safeBorder = fixColor(cs.borderColor, "#e5e7eb");
              element.style.color = safeText;
              if (safeBg !== "rgba(0, 0, 0, 0)" && safeBg !== "transparent") {
                element.style.backgroundColor = safeBg;
              }
              element.style.borderColor = safeBorder;
            });
          }

          // Fix image rendering in cloned document
          const clonedImages = clonedDoc.querySelectorAll("img");
          clonedImages.forEach((img) => {
            const imgElement = img as HTMLImageElement;
            imgElement.style.maxWidth = "100%";
            imgElement.style.height = "auto";
            imgElement.style.display = "block";
            imgElement.style.visibility = "visible";
            imgElement.style.opacity = "1";
            // Force crossOrigin for better compatibility
            imgElement.crossOrigin = "anonymous";
            
            // Force absolute URLs for images to ensure they load in the clone
            if (imgElement.src.includes("/images/acetrack-logo-v2.png")) {
              imgElement.src = new URL("/images/acetrack-logo-v2.png", (clonedDoc.defaultView?.location?.origin ?? window.location.origin)).toString();
            } else if (imgElement.src.includes("/images/aces-logo.jpg")) {
              imgElement.src = new URL("/images/aces-logo.jpg", (clonedDoc.defaultView?.location?.origin ?? window.location.origin)).toString();
            } else if (imgElement.src.includes("data:") || imgElement.src.includes("blob:")) {
              // Keep data URLs and blob URLs as is
            } else {
              // For user avatar, ensure it's loaded
              if (imgElement.alt === "Student Photo" && studentData.avatar) {
                imgElement.src = studentData.avatar;
              }
            }
          });

          // Fix canvas (QR code) rendering
          const clonedCanvases = clonedDoc.querySelectorAll("canvas");
          clonedCanvases.forEach((canvas) => {
            (canvas as HTMLCanvasElement).style.maxWidth = "100%";
            (canvas as HTMLCanvasElement).style.height = "auto";
            (canvas as HTMLCanvasElement).style.display = "block";
          });
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Give images in the cloned document time to load
      await new Promise(resolve => setTimeout(resolve, 100));

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
