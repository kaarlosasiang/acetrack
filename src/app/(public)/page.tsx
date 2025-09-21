import StudentNavBar from "@/components/custom/NavBar";
import DorsuNewsDisplay from "@/components/custom/DorsuNewsDisplay";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavBar />
      <div className="font-sans p-8 pb-20 sm:p-20">
        <main className="max-w-7xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Welcome to AceTrack
            </h1>
            <p className="text-muted-foreground text-lg">
              The modern attendance tracking system for ACES. Manage events,
              track attendance, and stay organized.
            </p>
          </div>

          {/* DOrSU News Section */}
          <section>
            <DorsuNewsDisplay limit={6} showRefreshButton={true} />
          </section>
        </main>
      </div>
    </div>
  );
}
