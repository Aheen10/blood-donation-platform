import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Admins go to the admin panel. Everyone else lands on the main member page.
export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (session.user.role === "admin") {
    redirect("/admin");
  }
  redirect("/donor");
}