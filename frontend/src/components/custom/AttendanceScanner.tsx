"use client";

import { useState, useCallback } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AttendanceService,
  type StudentInfo,
  type AttendanceRecord,
} from "@/lib/services/AttendanceService";
import {
  CheckCircle,
  XCircle,
  Camera,
  CameraOff,
  User,
  Clock,
} from "lucide-react";

interface AttendanceScannerProps {
  eventId: number;
  mode: "time-in" | "time-out";
  onAttendanceMarked?: (record: AttendanceRecord) => void;
}

export function AttendanceScanner({
  eventId,
  mode,
  onAttendanceMarked,
}: AttendanceScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "error";
    message: string;
    student?: StudentInfo;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (detectedCodes.length === 0 || isProcessing) return;

      setIsProcessing(true);
      const qrData = detectedCodes[0].rawValue;

      console.log(qrData);

      try {
        // Parse QR code data
        const studentInfo = AttendanceService.parseQRCode(qrData);

        if (!studentInfo) {
          setScanResult({
            type: "error",
            message:
              "Invalid QR code format. Please scan a valid student QR code.",
          });
          setIsProcessing(false);
          return;
        }

        let result;
        if (mode === "time-in") {
          result = await AttendanceService.markTimeIn(eventId, studentInfo);
        } else {
          result = await AttendanceService.markTimeOut(
            eventId,
            studentInfo.student_id
          );
        }

        if (result.success && result.data) {
          setScanResult({
            type: "success",
            message: result.message,
            student: studentInfo,
          });
          onAttendanceMarked?.(result.data);
        } else {
          setScanResult({
            type: "error",
            message: result.message,
          });
        }
      } catch (error) {
        setScanResult({
          type: "error",
          message: "Failed to process attendance. Please try again.",
        });
      }

      setIsProcessing(false);

      // Auto-hide result after 3 seconds
      setTimeout(() => {
        setScanResult(null);
      }, 10000);
    },
    [eventId, mode, isProcessing, onAttendanceMarked]
  );

  const handleError = useCallback((error: unknown) => {
    console.error("Scanner error:", error);
    setScanResult({
      type: "error",
      message:
        "Camera access failed. Please ensure camera permissions are granted.",
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-center justify-center gap-2 text-lg sm:text-xl">
            <Camera className="h-5 w-5" />
            <span>Attendance Scanner</span>
            <Badge variant={mode === "time-in" ? "default" : "secondary"} className="text-xs">
              {mode === "time-in" ? "Time In" : "Time Out"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 p-4 sm:p-6">
          {/* Scanner Component */}
          {isScanning && (
            <div className="relative">
              <div className="rounded-lg overflow-hidden border w-[280px] sm:w-[320px]">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  formats={["qr_code"]}
                  constraints={{
                    facingMode: "environment", // Use back camera on mobile
                  }}
                  styles={{
                    container: {
                      width: "100%",
                      height: "280px",
                    },
                    video: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  }}
                  components={{
                    finder: true,
                    torch: true,
                  }}
                />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-xs sm:text-sm mt-2">Processing...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scanner Toggle */}
          <div className="flex justify-center">
            <Button
              onClick={() => setIsScanning(!isScanning)}
              variant={isScanning ? "destructive" : "default"}
              className="flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6"
            >
              {isScanning ? (
                <>
                  <CameraOff className="h-4 w-4" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Start Scanner
                </>
              )}
            </Button>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <Alert
              className={`border-2 transition-all duration-300 ${
                scanResult.type === "success"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20"
              }`}
            >
              <AlertDescription>
                <div className="space-y-3">
                  {/* Main Alert Content */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      scanResult.type === "success" 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      {scanResult.type === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        scanResult.type === "success" 
                          ? "text-green-800 dark:text-green-200" 
                          : "text-red-800 dark:text-red-200"
                      }`}>
                        {scanResult.type === "success" ? "Success!" : "Error"}
                      </p>
                      <p className={`text-sm ${
                        scanResult.type === "success" 
                          ? "text-green-700 dark:text-green-300" 
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Student Information - Only for successful scans */}
                  {scanResult.student && scanResult.type === "success" && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {scanResult.student.firstname}{" "}
                              {scanResult.student.lastname}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {scanResult.student.student_id} • {scanResult.student.year_level}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span className="font-mono">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceScanner;
