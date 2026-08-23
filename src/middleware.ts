import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const isAdminPath = pathname.startsWith("/admin");
  const isResidentPath = pathname.startsWith("/dashboard");
  const isSharedProtectedPath = pathname.startsWith("/notices");

  if (!isAdminPath && !isResidentPath && !isSharedProtectedPath) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdminPath && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/admin/:path*", "/dashboard/:path*", "/notices/:path*"],
};