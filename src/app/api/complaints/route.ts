import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { refreshOverdueStatuses } from "@/lib/overdue";
import { getRecurringMap } from "@/lib/recurring";

const CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  CLEANING: "Cleaning",
  SECURITY: "Security",
  PARKING: "Parking",
  LIFT: "Lift",
  OTHER: "Other",
};

function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (auth.role !== "RESIDENT") {
    return NextResponse.json({ error: "Only residents can raise complaints" }, { status: 403 });
  }

  const formData = await req.formData();
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const photo = formData.get("photo") as File | null;

  if (!category || !CATEGORY_LABELS[category]) {
    return NextResponse.json({ error: "Please select a valid category" }, { status: 400 });
  }
  if (!description || description.trim().length < 5) {
    return NextResponse.json({ error: "Please add a description (at least 5 characters)" }, { status: 400 });
  }

  let photoUrl: string | undefined;

  if (photo && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
    }
    if (!photo.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    try {
      photoUrl = await uploadImageBuffer(buffer);
    } catch {
      return NextResponse.json({ error: "Photo upload failed, please try again" }, { status: 500 });
    }
  }

  const complaint = await prisma.complaint.create({
    data: {
      title: `${CATEGORY_LABELS[category]} Issue`,
      description: description.trim(),
      category: category as any,
      photoUrl,
      societyId: auth.societyId,
      raisedById: auth.userId,
      statusHistory: {
        create: {
          status: "OPEN",
          note: "Complaint raised",
          changedById: auth.userId,
        },
      },
    },
    include: { statusHistory: true },
  });

  return NextResponse.json({ complaint });
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (auth.role === "RESIDENT") {
    const complaints = await prisma.complaint.findMany({
      where: { raisedById: auth.userId },
      include: {
        statusHistory: {
          orderBy: { changedAt: "asc" },
          include: { changedBy: { select: { name: true, role: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ complaints });
  }

  // ADMIN: recompute overdue flags live, then apply filters + smart sort
  await refreshOverdueStatuses(auth.societyId);

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = { societyId: auth.societyId };
  if (category) where.category = category;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
  }

    const complaints = await prisma.complaint.findMany({
    where,
    include: {
      raisedBy: { select: { name: true, flatNumber: true, email: true } },
      statusHistory: {
        orderBy: { changedAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
    orderBy: [
      { isOverdue: "desc" },
      { priority: "desc" },
      { status: "asc" },
      { createdAt: "asc" },
    ],
  });

  const recurringMap = await getRecurringMap(auth.societyId);
  const complaintsWithRecurring = complaints.map((c) => ({
    ...c,
    recurring: recurringMap.get(c.id) || { isRecurring: false, count: 1, relatedIds: [] },
  }));

  return NextResponse.json({ complaints: complaintsWithRecurring });

  return NextResponse.json({ complaints });
}