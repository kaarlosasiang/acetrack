"use client";

import { useState, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AttendanceService, type StudentInfo, type AttendanceRecord } from '@/lib/services/AttendanceService';
import { CheckCircle, XCircle, Camera, CameraOff, User, Clock } from 'lucide-react';

interface AttendanceScannerProps {
  eventId: number;
  mode: 'time-in' | 'time-out';
  onAttendanceMarked?: (record: AttendanceRecord) => void;
}

export function AttendanceScanner({ eventId, mode, onAttendanceMarked }: AttendanceScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    student?: StudentInfo;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScan = useCallback(async (detectedCodes: any[]) => {
    if (detectedCodes.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const qrData = detectedCodes[0].rawValue;

    try {
      // Parse QR code data
      const studentInfo = AttendanceService.parseQRCode(qrData);
      
      if (!studentInfo) {
        setScanResult({
          type: 'error',
          message: 'Invalid QR code format. Please scan a valid student QR code.'
        });
        setIsProcessing(false);
        return;
      }

      let result;
      if (mode === 'time-in') {
        result = await AttendanceService.markTimeIn(eventId, studentInfo);
      } else {
        result = await AttendanceService.markTimeOut(eventId, studentInfo.student_id);
      }

      if (result.success && result.data) {
        setScanResult({
          type: 'success',
          message: result.message,
          student: studentInfo
        });
        onAttendanceMarked?.(result.data);
      } else {
        setScanResult({
          type: 'error',
          message: result.message
        });
      }
    } catch (error) {
      setScanResult({
        type: 'error',
        message: 'Failed to process attendance. Please try again.'
      });
    }

    setIsProcessing(false);
    
    // Auto-hide result after 3 seconds
    setTimeout(() => {
      setScanResult(null);
    }, 3000);
  }, [eventId, mode, isProcessing, onAttendanceMarked]);

  const handleError = useCallback((error: any) => {
    console.error('Scanner error:', error);
    setScanResult({
      type: 'error',
      message: 'Camera access failed. Please ensure camera permissions are granted.'
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Attendance Scanner
            <Badge variant={mode === 'time-in' ? 'default' : 'secondary'}>
              {mode === 'time-in' ? 'Time In' : 'Time Out'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scanner Toggle */}
          <div className="flex justify-center">
            <Button
              onClick={() => setIsScanning(!isScanning)}
              variant={isScanning ? 'destructive' : 'default'}
              className="flex items-center gap-2"
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

          {/* Scanner Component */}
          {isScanning && (
            <div className="relative">
              <div className="rounded-lg overflow-hidden border">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  formats={['qr_code']}
                  constraints={{
                    facingMode: 'environment' // Use back camera on mobile
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '300px'
                    },
                    video: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }
                  }}
                  components={{
                    finder: true,
                    torch: true
                  }}
                />
              </div>
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm mt-2">Processing...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <Alert className={scanResult.type === 'success' ? 'border-green-500' : 'border-red-500'}>
              <div className="flex items-center gap-2">
                {scanResult.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{scanResult.message}</p>
                    {scanResult.student && scanResult.type === 'success' && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3" />
                        <span>
                          {scanResult.student.firstname} {scanResult.student.lastname}
                        </span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>📱 <strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Click "Start Scanner" to activate the camera</li>
              <li>Point the camera at a student QR code</li>
              <li>The scanner will automatically detect and process the code</li>
              <li>Ensure good lighting for better scanning accuracy</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceScanner;
