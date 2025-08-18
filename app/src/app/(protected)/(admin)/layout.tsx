import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import StudentNavBar from "@/components/custom/NavBar"; // Using the same navbar for now

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedRoute allowedRoles={[0]}> {/* Only allow admin (role_id: 0) */}
      <>
        <StudentNavBar /> {/* TODO: Create AdminNavBar component */}
        <div className="container mx-auto">{children}</div>
      </>
    </RoleProtectedRoute>
  );
}
