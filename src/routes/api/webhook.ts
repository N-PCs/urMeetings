import { createFileRoute } from "@tanstack/react-router";
import { handleMeetingBaasWebhook } from "@/lib/bot-webhook";

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MEETING_BAAS_API_KEY;
        const received = request.headers.get("x-meeting-baas-api-key");

        if (!secret || received !== secret) {
          return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const payload = await request.json().catch(() => null);
        if (!payload) {
          return Response.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const result = await handleMeetingBaasWebhook(payload);
        return Response.json({
          success: result.ok,
          ...(result.reason ? { reason: result.reason } : {}),
        });
      },
    },
  },
});
