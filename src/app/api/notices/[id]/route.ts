import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const notice = await prisma.notice.findUnique({ where: { id } });

  if (!notice || notice.societyId !== auth.societyId) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }

  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}