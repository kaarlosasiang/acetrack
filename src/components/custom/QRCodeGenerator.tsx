"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export function QRCodeGenerator({
  value,
  size = 128,
  className = "",
  errorCorrectionLevel = "M",
  margin = 1,
  color = {
    dark: "#000000",
    light: "#FFFFFF",
  },
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current || !value || !isClient) return;

      try {
        setError(null);
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin,
          errorCorrectionLevel,
          color,
        });
      } catch (err) {
        setError("Failed to generate QR code");
        console.error("QR Code generation error:", err);
      }
    };

    generateQR();
  }, [value, size, margin, errorCorrectionLevel, color, isClient]);

  if (!isClient) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 ${className}`} 
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 text-sm">Loading QR...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <span className="text-red-500 text-sm">Error generating QR code</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
}

export default QRCodeGenerator;
