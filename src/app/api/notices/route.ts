import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";
import { sendImportantNoticeEmail } from "@/lib/email";

function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

const noticeSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(2),
  isImportant: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const notices = await prisma.notice.findMany({
    where: { societyId: auth.societyId },
    include: { postedBy: { select: { name: true } } },
    orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ notices });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can post notices" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = noticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

    const notice = await prisma.notice.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isImportant: parsed.data.isImportant || false,
      societyId: auth.societyId,
      postedById: auth.userId,
    },
    include: { postedBy: { select: { name: true } } },
  });

  if (notice.isImportant) {
    const residents = await prisma.user.findMany({
      where: { societyId: auth.societyId, role: "RESIDENT" },
      select: { name: true, email: true },
    });

    await Promise.all(
      residents.map((resident) =>
        sendImportantNoticeEmail({
          to: resident.email,
          residentName: resident.name,
          noticeTitle: notice.title,
          noticeContent: notice.content,
        })
      )
    );
  }

  return NextResponse.json({ notice });
}