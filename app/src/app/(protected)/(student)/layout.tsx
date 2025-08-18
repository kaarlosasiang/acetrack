import StudentNavBar from "@/components/custom/NavBar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StudentNavBar />
      <div className="container mx-auto">{children}</div>
    </>
  );
}
