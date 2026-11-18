
import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await getAdminDatabase();

  if ("error" in auth) {
    return json({ error: auth.error }, auth.status);
  }

  const db = auth.database;
  const section = request.nextUrl.searchParams.get("section") || "overview";

  try {
    if (section === "overview") {
      const since = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const [
        inboxes,
        messages,
        activeInboxes,
        expiredInboxes,
        recentMessages,
      ] = await Promise.all([
        db.from("inboxes").select("*", { count: "exact", head: true }),
        db.from("messages").select("*", { count: "exact", head: true }),
        db
          .from("inboxes")
          .select("*", { count: "exact", head: true })
          .gt("expires_at", new Date().toISOString()),
        db
          .from("inboxes")
          .select("*", { count: "exact", head: true })
          .lte("expires_at", new Date().toISOString()),
        db
          .from("messages")
          .select("id, inbox_id, sender, subject, received_at")
          .gte("received_at", since)
          .order("received_at", { ascending: false })
          .limit(8),
      ]);

      const queryErrors = [
        inboxes.error,
        messages.error,
        activeInboxes.error,
        expiredInboxes.error,
        recentMessages.error,
      ].filter(Boolean);

      if (queryErrors.length) {
        throw queryErrors[0];
      }

      return json({
        success: true,
        stats: {
          totalInboxes: inboxes.count ?? 0,
          totalMessages: messages.count ?? 0,
          activeInboxes: activeInboxes.count ?? 0,
          expiredInboxes: expiredInboxes.count ?? 0,
          messagesLast24Hours: recentMessages.data?.length ?? 0,
        },
        recentMessages: recentMessages.data ?? [],
        system: {
          database: "Connected",
          authentication: "Active",
          activityLogs: "Unavailable",
        },
      });
    }

    if (section === "inboxes") {
      const { data, error, count } = await db
        .from("inboxes")
        .select("id, email_address, created_at, expires_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return json({
        success: true,
        total: count ?? 0,
        inboxes: data ?? [],
      });
    }

    if (section === "messages") {
      const { data, error, count } = await db
        .from("messages")
        .select("id, inbox_id, sender, subject, received_at", {
          count: "exact",
        })
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const inboxIds = [
        ...new Set((data ?? []).map((message) => message.inbox_id)),
      ];

      let inboxMap: Record<string, string> = {};

      if (inboxIds.length > 0) {
        const { data: inboxRows, error: inboxError } = await db
          .from("inboxes")
          .select("id, email_address")
          .in("id", inboxIds);

        if (inboxError) throw inboxError;

        inboxMap = Object.fromEntries(
          (inboxRows ?? []).map((inbox) => [
            String(inbox.id),
            inbox.email_address,
          ])
        );
      }

      const messages = (data ?? []).map((message) => ({
        ...message,
        inboxAddress: inboxMap[String(message.inbox_id)] ?? "Unknown inbox",
      }));

      return json({
        success: true,
        total: count ?? 0,
        messages,
      });
    }

    if (section === "security") {
      const { count, error } = await db
        .from("inbox_creation_limits")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return json({
        success: true,
        adminAuthentication: "Active",
        rateLimitRecords: count ?? 0,
        rateLimit: "10 inbox creations per IP per hour",
        activityLogs: "Not configured",
        activeSessions: "Not available in current database schema",
      });
    }

    return json({ error: "Unknown dashboard section" }, 400);
  } catch (error) {
    console.error("Admin dashboard data error:", error);

    return json(
      { error: "Unable to load dashboard data. Check server logs." },
      500
    );
  }
}
