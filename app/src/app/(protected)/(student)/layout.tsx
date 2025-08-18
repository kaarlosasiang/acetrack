import StudentNavBar from "@/components/custom/NavBar";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedRoute allowedRoles={[1]}> {/* Only allow students (role_id: 1) */}
      <>
        <StudentNavBar />
        <div className="container mx-auto">{children}</div>
      </>
    </RoleProtectedRoute>
  );
}
