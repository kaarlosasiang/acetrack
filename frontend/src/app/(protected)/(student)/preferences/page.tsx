export default function StudentSettingsPreferencesPage() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-3xl font-bold">Student Settings</h1>
        <p className="text-lg text-gray-600">
          Manage your student settings here.
        </p>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-gray-500">
          © 2024 AceTrack. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
