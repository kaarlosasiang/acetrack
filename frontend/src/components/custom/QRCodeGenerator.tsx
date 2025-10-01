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
  logo?: {
    src: string;
    size?: number;
    borderRadius?: number;
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
  logo,
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

        // Add logo if provided
        if (logo && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const logoImage = new Image();
            logoImage.crossOrigin = 'anonymous';
            logoImage.onload = () => {
              const logoSize = logo.size || size * 0.2; // Default to 20% of QR code size
              const logoX = (canvas.width - logoSize) / 2;
              const logoY = (canvas.height - logoSize) / 2;

              // Create a white background for the logo
              ctx.fillStyle = '#FFFFFF';
              const padding = logoSize * 0.1;
              
              // Rounded square background
              const cornerRadius = 6; // Small rounded corners
              const bgX = logoX - padding;
              const bgY = logoY - padding;
              const bgWidth = logoSize + padding * 2;
              const bgHeight = logoSize + padding * 2;
              
              ctx.beginPath();
              ctx.moveTo(bgX + cornerRadius, bgY);
              ctx.lineTo(bgX + bgWidth - cornerRadius, bgY);
              ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + cornerRadius);
              ctx.lineTo(bgX + bgWidth, bgY + bgHeight - cornerRadius);
              ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - cornerRadius, bgY + bgHeight);
              ctx.lineTo(bgX + cornerRadius, bgY + bgHeight);
              ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - cornerRadius);
              ctx.lineTo(bgX, bgY + cornerRadius);
              ctx.quadraticCurveTo(bgX, bgY, bgX + cornerRadius, bgY);
              ctx.closePath();
              ctx.fill();

              // Draw the logo with square clipping if borderRadius is specified
              if (logo.borderRadius) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(logoX, logoY, logoSize, logoSize);
                ctx.clip();
              }

              ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
              
              if (logo.borderRadius) {
                ctx.restore();
              }
            };
            logoImage.src = logo.src;
          }
        }
      } catch (err) {
        setError("Failed to generate QR code");
        console.error("QR Code generation error:", err);
      }
    };

    generateQR();
  }, [value, size, margin, errorCorrectionLevel, color, logo, isClient]);

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
