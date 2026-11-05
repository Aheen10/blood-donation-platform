import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// Sends each user to the right home page for their role.
export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  switch (session.user.role) {
    case "admin":
      redirect("/admin");
    case "donor":
      redirect("/donor");
    default:
      redirect("/requester");
  }
}