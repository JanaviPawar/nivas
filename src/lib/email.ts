import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Nivas <onboarding@resend.dev>"; // Resend's shared test sender

export async function sendStatusChangeEmail(params: {
  to: string;
  residentName: string;
  complaintTitle: string;
  newStatus: string;
  note?: string | null;
}) {
  const { to, residentName, complaintTitle, newStatus, note } = params;
  const statusLabel = newStatus.replace("_", " ");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your complaint is now ${statusLabel} — Nivas`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0f172a;">Complaint Status Updated</h2>
          <p>Hi ${residentName},</p>
          <p>Your complaint <strong>${complaintTitle}</strong> has been updated to:</p>
          <p style="font-size:18px; font-weight:600; color:#0f172a;">${statusLabel}</p>
          ${note ? `<p style="color:#475569;">Note from admin: "${note}"</p>` : ""}
          <p style="color:#94a3b8; font-size:12px; margin-top:24px;">— Nivas Society Management</p>
        </div>
      `,
    });
  } catch (error) {
    // Never let a failed email break the actual status update
    console.error("Failed to send status change email:", error);
  }
}

export async function sendImportantNoticeEmail(params: {
  to: string;
  residentName: string;
  noticeTitle: string;
  noticeContent: string;
}) {
  const { to, residentName, noticeTitle, noticeContent } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Important Notice: ${noticeTitle} — Nivas`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#92400e;">📌 Important Notice</h2>
          <p>Hi ${residentName},</p>
          <h3 style="color:#0f172a;">${noticeTitle}</h3>
          <p style="color:#475569;">${noticeContent}</p>
          <p style="color:#94a3b8; font-size:12px; margin-top:24px;">— Nivas Society Management</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send notice email:", error);
  }
}