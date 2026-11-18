
import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 20;

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
  const params = request.nextUrl.searchParams;
  const section = params.get("section") || "overview";

  try {
    // OVERVIEW — aggregate counts only; no message content
    if (section === "overview") {
      const now = new Date().toISOString();
      const since = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const [
        inboxes,
        messages,
        activeInboxes,
        expiredInboxes,
        recentMessageCount,
      ] = await Promise.all([
        db.from("inboxes").select("id", {
          count: "exact",
          head: true,
        }),

        db.from("messages").select("id", {
          count: "exact",
          head: true,
        }),

        db.from("inboxes")
          .select("id", { count: "exact", head: true })
          .gt("expires_at", now),

        db.from("inboxes")
          .select("id", { count: "exact", head: true })
          .lte("expires_at", now),

        db.from("messages")
          .select("id", { count: "exact", head: true })
          .gte("received_at", since),
      ]);

      const errors = [
        inboxes.error,
        messages.error,
        activeInboxes.error,
        expiredInboxes.error,
        recentMessageCount.error,
      ].filter(Boolean);

      if (errors.length) throw errors[0];

      return json({
        success: true,
        stats: {
          totalInboxes: inboxes.count ?? 0,
          totalMessages: messages.count ?? 0,
          activeInboxes: activeInboxes.count ?? 0,
          expiredInboxes: expiredInboxes.count ?? 0,
          messagesLast24Hours: recentMessageCount.count ?? 0,
        },
        system: {
          database: "Connected",
          authentication: "Active",
          activityLogs: "Unavailable",
        },
      });
    }

    // INBOX LIST — filters + server-side pagination
    if (section === "inboxes") {
      const status = params.get("status") || "all";
      const page = Math.max(
        1,
        Number.parseInt(params.get("page") || "1", 10) || 1
      );

      const now = new Date().toISOString();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = db
        .from("inboxes")
        .select(
          "id, email_address, created_at, expires_at",
          { count: "exact" }
        );

      if (status === "active") {
        query = query.gt("expires_at", now);
      } else if (status === "expired") {
        query = query.lte("expires_at", now);
      } else if (status !== "all") {
        return json({ error: "Invalid inbox status" }, 400);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const total = count ?? 0;

      return json({
        success: true,
        inboxes: data ?? [],
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
        status,
      });
    }

    // SINGLE INBOX DETAILS — metadata only
    if (section === "inbox") {
      const id = params.get("id");

      if (!id || !/^\d+$/.test(id)) {
        return json({ error: "Invalid inbox ID" }, 400);
      }

      const { data, error } = await db
        .from("inboxes")
        .select("id, email_address, created_at, expires_at")
        .eq("id", Number(id))
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return json({ error: "Inbox not found" }, 404);
      }

      return json({
        success: true,
        inbox: data,
        status:
          new Date(data.expires_at).getTime() > Date.now()
            ? "active"
            : "expired",
        ipAddress: null,
        ipTracking: "Not stored for this inbox",
      });
    }

    if (section === "security") {
      const { count, error } = await db
        .from("inbox_creation_limits")
        .select("ip_hash", {
          count: "exact",
          head: true,
        });

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
