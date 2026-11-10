import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Only admins can open /admin. Every logged-in user can use all other pages.
    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/donor/:path*", "/requester/:path*", "/requests/:path*", "/admin/:path*", "/chat/:path*", "/assistant", "/account", "/dashboard", "/notifications"],
};