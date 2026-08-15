import { redirect } from "next/navigation";

import { getCurrentAdmin } from "../../lib/auth/server.js";
import AdminDashboard from "./AdminDashboard.js";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <AdminDashboard
      admin={{ id: admin.id, email: admin.email, displayName: admin.displayName }}
    />
  );
}
