import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sendStatusChangeEmail } from "@/lib/email";

function getAuthUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, priority, note } = body;

  const complaint = await prisma.complaint.findUnique({ where: { id } });

  // Security: an admin can only ever touch complaints from their own society,
  // even if they somehow guess or are given another society's complaint id.
  if (!complaint || complaint.societyId !== auth.societyId) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const data: any = {};

  if (priority && ["LOW", "MEDIUM", "HIGH"].includes(priority)) {
    data.priority = priority;
  }

  const isStatusChange =
    status && ["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status) && status !== complaint.status;

  if (isStatusChange) {
    data.status = status;
    if (status === "RESOLVED") {
      data.resolvedAt = new Date();
      data.isOverdue = false; // resolved complaints are never "overdue"
    }
  }

    const updated = await prisma.complaint.update({
    where: { id },
    data: {
      ...data,
      ...(isStatusChange
        ? {
            statusHistory: {
              create: {
                status,
                note: note?.trim() || null,
                changedById: auth.userId,
              },
            },
          }
        : {}),
    },
    include: {
      raisedBy: { select: { name: true, flatNumber: true, email: true } },
      statusHistory: {
        orderBy: { changedAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });

  if (isStatusChange) {
    await sendStatusChangeEmail({
      to: updated.raisedBy.email,
      residentName: updated.raisedBy.name,
      complaintTitle: updated.title,
      newStatus: status,
      note: note?.trim() || null,
    });
  }

  return NextResponse.json({ complaint: updated });
}