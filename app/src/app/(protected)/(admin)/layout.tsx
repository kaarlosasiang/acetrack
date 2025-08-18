import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import StudentNavBar from "@/components/custom/NavBar"; // Using the same navbar for now

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProtectedRoute allowedRoles={[0]}>
      {" "}
      {/* Only allow admin (role_id: 0) */}
      <>
        <StudentNavBar /> {/* TODO: Create AdminNavBar component */}
        <div className=" max-w-5xl mx-auto py-5">{children}</div>
      </>
    </RoleProtectedRoute>
  );
}
