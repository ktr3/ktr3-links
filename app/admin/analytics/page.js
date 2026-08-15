import { redirect } from "next/navigation";

import { getCurrentAdmin } from "../../../lib/auth/server.js";
import UndergroundAnalytics from "./UndergroundAnalytics.js";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return <UndergroundAnalytics admin={{ displayName: admin.displayName }} />;
}
