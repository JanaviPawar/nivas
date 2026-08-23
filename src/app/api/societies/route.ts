import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const societies = await prisma.society.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ societies });
}