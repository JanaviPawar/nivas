import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshOverdueStatuses } from "@/lib/overdue";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const societies = await prisma.society.findMany({ select: { id: true } });
  for (const society of societies) {
    await refreshOverdueStatuses(society.id);
  }

  return NextResponse.json({ success: true, checked: societies.length });
}