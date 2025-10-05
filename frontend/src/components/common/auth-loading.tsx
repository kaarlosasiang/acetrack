"use client";

import { Loader2 } from "lucide-react";

interface AuthLoadingProps {
  message?: string;
  className?: string;
}

export function AuthLoading({
  message = "Checking authentication...",
  className,
}: AuthLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function AuthPageLoading({
  message,
  children,
}: {
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {children || <AuthLoading message={message} />}
    </div>
  );
}
