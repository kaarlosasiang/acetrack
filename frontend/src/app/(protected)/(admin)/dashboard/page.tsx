"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleAddEvent = () => {
    router.push("/events/add");
  };

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-zinc-800">Admin Dashboard</h1>
      <Button onClick={handleAddEvent}>Add Event</Button>
    </div>
  );
}
