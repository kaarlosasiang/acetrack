import Image from "next/image";
import StudentNavBar from "@/components/custom/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavBar />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-[calc(100vh-80px)] p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Welcome to AceTrack
            </h1>
            <p className="text-muted-foreground">
              The modern attendance tracking system for ACES. Manage events,
              track attendance, and stay organized.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
