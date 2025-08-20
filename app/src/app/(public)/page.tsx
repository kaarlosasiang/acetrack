import Image from "next/image";
import StudentNavBar from "@/components/custom/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavBar />
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-[calc(100vh-80px)] p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <div className="flex items-center gap-4">
            <Image
              src="/images/acetrack-logo.png"
              alt="AceTrack Logo"
              width={200}
              height={28}
              priority
            />
          </div>
          
          <div className="text-center sm:text-left max-w-2xl">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Welcome to AceTrack
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              The modern attendance tracking system for ACES. Manage events, track attendance, and stay organized.
            </p>
          </div>

          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-primary-foreground gap-2 hover:bg-primary/90 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/register"
            >
              Get Started
            </a>
            <a
              className="rounded-full border border-solid border-border transition-colors flex items-center justify-center hover:bg-accent hover:text-accent-foreground font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
              href="/login"
            >
              Sign In
            </a>
          </div>

          <div className="mt-12 p-6 bg-card border border-border rounded-lg max-w-2xl">
            <h2 className="text-xl font-semibold mb-4 text-card-foreground">Features</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Real-time attendance tracking</li>
              <li>• Event management system</li>
              <li>• Student and admin dashboards</li>
              <li>• Dark/Light theme support</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
