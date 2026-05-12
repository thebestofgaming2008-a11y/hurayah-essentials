import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const sendTrackingEmail = action({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || "Abu Hurayrah Essentials";
    const siteUrl = process.env.SITE_URL;
    if (!apiKey || !senderEmail) throw new Error("Brevo email is not configured.");

    const order = await ctx.runQuery(api.orders.getAdminOrderForEmail, { id: args.orderId });
    if (!order?.customer_email) throw new Error("Order customer email is missing.");
    if (!order.tracking_number) throw new Error("Add a tracking number before sending email.");

    const orderNumber = order.order_number ?? args.orderId.slice(0, 8);
    const publicTrackUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/track-order` : undefined;
    const carrierLine = order.tracking_carrier ? `<p><strong>Carrier:</strong> ${escapeHtml(order.tracking_carrier)}</p>` : "";
    const externalTracking = order.tracking_url
      ? `<p><a href="${escapeHtml(order.tracking_url)}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px">Track with carrier</a></p>`
      : "";
    const storeTracking = publicTrackUrl
      ? `<p>You can also check your order status here: <a href="${escapeHtml(publicTrackUrl)}">${escapeHtml(publicTrackUrl)}</a></p>`
      : "";

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:620px;margin:0 auto">
        <h2>Your order ${escapeHtml(orderNumber)} has tracking details</h2>
        <p>Assalamu alaikum ${escapeHtml(order.customer_name || "")},</p>
        <p>Your order tracking details are ready.</p>
        ${carrierLine}
        <p><strong>Tracking number:</strong> ${escapeHtml(order.tracking_number)}</p>
        ${externalTracking}
        ${storeTracking}
        <p>If you have any questions, reply to this email.</p>
        <p>Abu Hurayrah Essentials</p>
      </div>
    `;

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email: order.customer_email, name: order.customer_name ?? undefined }],
          replyTo: { email: senderEmail, name: senderName },
          subject: `Tracking for your order ${orderNumber}`,
          htmlContent,
          tags: ["tracking", "manual-admin-send"],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo failed: ${response.status} ${body}`);
      }
      await ctx.runMutation(api.orders.markTrackingEmailResult, { id: args.orderId, status: "sent" });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(api.orders.markTrackingEmailResult, { id: args.orderId, status: "failed", error: message });
      throw error;
    }
  },
});