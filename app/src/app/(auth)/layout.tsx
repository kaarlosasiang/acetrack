import type { Metadata } from "next";
import { AuthRedirect } from "@/components/auth/AuthRedirect";

export const metadata: Metadata = {
  title: "Login", 
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect>
      {children}
    </AuthRedirect>
  );
}
