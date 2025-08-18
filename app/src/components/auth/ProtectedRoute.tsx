"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={50} height={50} />
//         <Image src={"/images/acetrack-icon.png"} alt="Loading..." width={40} height={40} className="absolute animate-ping"/>
//       </div>
//     );
//   }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
