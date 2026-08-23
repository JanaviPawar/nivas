import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "RESIDENT"]),
  flatNumber: z.string().optional(),
  societyName: z.string().optional(),
  societyId: z.string().optional(),
  adminCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
  if (!rateLimit(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a minute." }, { status: 429 });
  }
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

    const { name, email, password, role, flatNumber, societyName, societyId, adminCode } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return NextResponse.json({ error: "Unable to create account with these details" }, { status: 409 });
    }

  let finalSocietyId = societyId;

  if (role === "ADMIN") {
    if (adminCode !== process.env.ADMIN_SIGNUP_CODE) {
      return NextResponse.json({ error: "Invalid admin signup code" }, { status: 403 });
    }
    if (!societyName) {
      return NextResponse.json({ error: "Society name is required" }, { status: 400 });
    }
    const society = await prisma.society.create({ data: { name: societyName } });
    finalSocietyId = society.id;
  } else {
    if (!societyId) {
      return NextResponse.json({ error: "Please select your society" }, { status: 400 });
    }
    const society = await prisma.society.findUnique({ where: { id: societyId } });
    if (!society) {
      return NextResponse.json({ error: "Selected society does not exist" }, { status: 400 });
    }
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      flatNumber: role === "RESIDENT" ? flatNumber : null,
      societyId: finalSocietyId as string,
    },
  });

  const token = signToken({ userId: user.id, role: user.role, societyId: user.societyId });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}