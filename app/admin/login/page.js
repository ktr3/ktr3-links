import { redirect } from "next/navigation";

import { getCurrentAdmin } from "../../../lib/auth/server.js";
import AdminLogin from "../AdminLogin.js";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  return <AdminLogin />;
}
