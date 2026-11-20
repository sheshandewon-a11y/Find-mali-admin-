
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Bell,
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3,
  Command, Eye, Inbox, LayoutDashboard, LogOut, Mail, Menu, Moon,
  RefreshCw, Search, Server, Settings, Shield, ShieldCheck, Sun,
  Users, X, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Theme = "dark" | "light";

type InboxItem = {
  id: number;
  email_address: string;
  created_at: string;
  expires_at: string;
};

type ActivityLog = {
  id: number;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type InboxDetails = InboxItem & {
  status: string;
  ipAddress: string | null;
  ipTracking: string;
};

type DashboardData = {
  stats?: {
    totalInboxes: number;
    totalMessages: number;
    activeInboxes: number;
    expiredInboxes: number;
    messagesLast24Hours: number;
  };
  inboxes?: InboxItem[];
  logs?: ActivityLog[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  rateLimitRecords?: number;
  rateLimit?: string;
  adminAuthentication?: string;
  activityLogs?: string;
  activeSessions?: string;
  system?: {
    database: string;
    authentication: string;
    activityLogs: string;
  };
};

const navigation: {
  name: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { name: "Overview", hint: "Platform summary", icon: LayoutDashboard },
  { name: "Inboxes", hint: "Manage inboxes", icon: Inbox },
  { name: "Security", hint: "Protection settings", icon: ShieldCheck },
  { name: "Activity Logs", hint: "System events", icon: Activity },
  { name: "Settings", hint: "Preferences", icon: Settings },
];

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value?: number) {
  return typeof value === "number"
    ? new Intl.NumberFormat().format(value)
    : "—";
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`fm-status ${active ? "is-active" : "is-expired"}`}>
      <span />
      {active ? "Active" : "Expired"}
    </span>
  );
}

function Metric({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value?: number;
  description: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <article className={`fm-metric ${color}`}>
      <div className="fm-metric-top">
        <span>{title}</span>
        <div className="fm-metric-icon"><Icon size={19} /></div>
      </div>
      <strong>{formatNumber(value)}</strong>
      <small>{description}</small>
      <div className="fm-metric-glow" />
    </article>
  );
}

function ActivityIcon({ action }: { action: string }) {
  if (action.includes("security")) return <ShieldCheck size={19} />;
  if (action.includes("inbox")) return <Inbox size={19} />;
  if (action.includes("settings")) return <Settings size={19} />;
  return <Eye size={19} />;
}

export default function Dashboard({ email }: { email: string }) {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [theme, setTheme] = useState<Theme>("dark");
  const [data, setData] = useState<DashboardData>({});

  const [inboxStatus, setInboxStatus] = useState("all");
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxSearch, setInboxSearch] = useState("");

  const [activityPage, setActivityPage] = useState(1);
  const [activitySearch, setActivitySearch] = useState("");

  const [selectedInbox, setSelectedInbox] = useState<InboxDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Restore saved theme.
  useEffect(() => {
    const saved = localStorage.getItem("find-mali-admin-theme");

    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("find-mali-admin-theme", theme);
  }, [theme]);

  // Existing backend API is preserved.
  const loadData = useCallback(async (
    section: string,
    refresh = false
  ) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const apiSection = section.toLowerCase();

      let url = `/api/admin/data?section=${encodeURIComponent(apiSection)}`;

      if (section === "Inboxes") {
        url +=
          `&status=${encodeURIComponent(inboxStatus)}` +
          `&page=${inboxPage}`;
      }

      if (section === "Activity Logs") {
        url +=
          `&page=${activityPage}` +
          `&action=${encodeURIComponent(activitySearch)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load dashboard data."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    inboxStatus,
    inboxPage,
    activityPage,
    activitySearch,
  ]);

  useEffect(() => {
    if (active === "Settings") {
      setData({});
      setError("");
      setLoading(false);
      return;
    }

    loadData(active);

  }, [active, loadData]);

  // Inbox details.
  async function openInbox(id: number) {
    setSelectedInbox(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/data?section=inbox&id=${encodeURIComponent(String(id))}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load inbox.");
      }

      setSelectedInbox({
        ...result.inbox,
        status: result.status,
        ipAddress: result.ipAddress,
        ipTracking: result.ipTracking,
      });
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Unable to load inbox details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  function changeSection(name: string) {
    setActive(name);
    setMobileOpen(false);
    setSelectedInbox(null);
    setError("");
  }

  function changeInboxStatus(status: string) {
    setInboxStatus(status);
    setInboxPage(1);
    setSelectedInbox(null);
  }

  async function logout() {
    setLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  const filteredInboxes = useMemo(() => {
    const query = inboxSearch.trim().toLowerCase();

    if (!query) return data.inboxes ?? [];

    return (data.inboxes ?? []).filter((item) =>
      item.email_address.toLowerCase().includes(query)
    );
  }, [data.inboxes, inboxSearch]);

  const stats = data.stats;

  const latestActivity = data.logs?.[0];

  return (
    <div className="fm-shell">

      <style jsx global>{`
        :root {
          --fm-bg: #050713;
          --fm-sidebar: #080d20;
          --fm-card: #0b1530;
          --fm-card2: #101b39;
          --fm-border: rgba(92, 139, 255, .22);
          --fm-text: #f2f6ff;
          --fm-muted: #9baaca;
          --fm-subtle: #647494;
          --fm-cyan: #00eaff;
          --fm-pink: #ff29c8;
          --fm-green: #00e69a;
          --fm-violet: #a66bff;
          --fm-shadow: 0 0 28px rgba(0, 234, 255, .07);
        }

        html[data-theme="light"] {
          --fm-bg: #edf3fb;
          --fm-sidebar: #ffffff;
          --fm-card: #ffffff;
          --fm-card2: #f3f7ff;
          --fm-border: rgba(38, 91, 150, .17);
          --fm-text: #15213a;
          --fm-muted: #566986;
          --fm-subtle: #8090a8;
          --fm-cyan: #008da9;
          --fm-pink: #d82aa8;
          --fm-green: #079b70;
          --fm-violet: #7850d8;
          --fm-shadow: 0 10px 30px rgba(25, 60, 100, .06);
        }

        .fm-shell {
          min-height: 100vh;
          display: flex;
          color: var(--fm-text);
          background:
            radial-gradient(ellipse at 80% 0%, rgba(0,234,255,.055), transparent 35%),
            radial-gradient(ellipse at 95% 50%, rgba(255,41,200,.045), transparent 35%),
            var(--fm-bg);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .fm-shell * { box-sizing: border-box; }
        .fm-shell button, .fm-shell input { font: inherit; }
        .fm-shell button { cursor: pointer; }
        .fm-shell button:disabled { opacity: .4; cursor: not-allowed; }

        .fm-sidebar {
          width: 250px;
          flex: 0 0 250px;
          min-height: 100vh;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          flex-direction: column;
          padding: 25px 16px 18px;
          background: var(--fm-sidebar);
          border-right: 1px solid var(--fm-border);
        }

        .fm-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 8px 34px;
        }

        .fm-brand-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          color: #07101e;
          background: linear-gradient(135deg, var(--fm-cyan), var(--fm-pink));
          border-radius: 13px;
          box-shadow: 0 0 20px rgba(0,234,255,.25);
        }

        .fm-brand-name {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .fm-brand-name span { color: var(--fm-pink); }

        .fm-brand-caption {
          margin-top: 4px;
          font-size: 9px;
          color: var(--fm-muted);
          letter-spacing: .15em;
          font-weight: 750;
        }

        .fm-side-label {
          padding: 0 11px 12px;
          color: var(--fm-subtle);
          font-size: 10px;
          letter-spacing: .18em;
          font-weight: 850;
        }

        .fm-nav { display: grid; gap: 8px; }

        .fm-nav-button {
          min-height: 59px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          padding: 9px 11px;
          color: var(--fm-muted);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 13px;
          text-align: left;
          transition: .2s ease;
        }

        .fm-nav-button:hover {
          color: var(--fm-text);
          background: var(--fm-card2);
        }

        .fm-nav-button.selected {
          color: var(--fm-cyan);
          border-color: rgba(0,234,255,.4);
          background: linear-gradient(100deg, rgba(0,234,255,.15), rgba(255,41,200,.08));
          box-shadow: inset 0 0 18px rgba(0,234,255,.06), 0 0 16px rgba(0,234,255,.08);
        }

        .fm-nav-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(100,140,200,.09);
        }

        .fm-nav-copy { display: grid; gap: 4px; }
        .fm-nav-copy strong { font-size: 12px; }
        .fm-nav-copy small { font-size: 9px; color: var(--fm-subtle); }

        .fm-side-spacer { flex: 1; min-height: 28px; }

        .fm-protected {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 10px;
          border: 1px solid rgba(0,234,255,.35);
          border-radius: 13px;
          background: linear-gradient(140deg, rgba(0,234,255,.09), rgba(255,41,200,.045));
          box-shadow: 0 0 18px rgba(0,234,255,.06);
        }

        .fm-protected-icon { color: var(--fm-cyan); }
        .fm-protected-copy { display: grid; gap: 4px; min-width: 0; }
        .fm-protected-copy strong { font-size: 10px; }
        .fm-protected-copy small { color: var(--fm-muted); font-size: 9px; }
        .fm-live-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: var(--fm-green);
          box-shadow: 0 0 12px var(--fm-green);
        }

        .fm-logout {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(255,41,200,.4);
          border-radius: 11px;
          color: var(--fm-pink);
          background: rgba(255,41,200,.055);
          font-size: 12px;
          font-weight: 700;
        }

        .fm-side-footer {
          padding: 22px 0 0;
          color: var(--fm-subtle);
          text-align: center;
          font-size: 9px;
          letter-spacing: .13em;
        }

        .fm-main { flex: 1; min-width: 0; }

        .fm-topbar {
          height: 82px;
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 30px;
          border-bottom: 1px solid var(--fm-border);
          background: color-mix(in srgb, var(--fm-bg) 88%, transparent);
          backdrop-filter: blur(18px);
        }

        .fm-top-left, .fm-top-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .fm-breadcrumb {
          color: var(--fm-subtle);
          font-size: 9px;
          letter-spacing: .17em;
          font-weight: 850;
        }

        .fm-breadcrumb span { color: var(--fm-cyan); padding: 0 7px; }

        .fm-page-title {
          margin: 5px 0 0;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: -.035em;
        }

        .fm-session {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid rgba(0,230,154,.28);
          border-radius: 30px;
          color: var(--fm-green);
          font-size: 10px;
          white-space: nowrap;
          background: rgba(0,230,154,.05);
        }

        .fm-icon-button {
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          flex: 0 0 41px;
          border: 1px solid var(--fm-border);
          border-radius: 12px;
          color: var(--fm-muted);
          background: var(--fm-card);
          transition: .2s;
        }

        .fm-icon-button:hover {
          color: var(--fm-cyan);
          border-color: var(--fm-cyan);
          box-shadow: 0 0 15px rgba(0,234,255,.13);
        }

        .fm-admin-user {
          display: flex;
          align-items: center;
          gap: 9px;
          padding-left: 4px;
          min-width: 0;
        }

        .fm-admin-avatar {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          color: var(--fm-cyan);
          border: 1px solid rgba(0,234,255,.25);
          border-radius: 12px;
          background: rgba(0,234,255,.08);
        }

        .fm-admin-text { display: grid; gap: 3px; min-width: 0; }
        .fm-admin-text strong { font-size: 10px; }
        .fm-admin-text small {
          max-width: 155px;
          overflow: hidden;
          color: var(--fm-muted);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
        }

        .fm-menu-button { display: none; }

        .fm-content {
          width: min(100%, 1500px);
          margin: 0 auto;
          padding: 32px 30px 22px;
        }

        .fm-eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--fm-subtle);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .18em;
        }

        .fm-eyebrow-line {
          width: 21px;
          height: 3px;
          border-radius: 5px;
          background: var(--fm-cyan);
          box-shadow: 0 0 10px var(--fm-cyan);
        }

        .fm-intro {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .fm-intro h2 {
          margin: 11px 0 8px;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 900;
          letter-spacing: -.05em;
        }

        .fm-intro p {
          margin: 0;
          color: var(--fm-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .fm-count {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 13px 16px;
          border: 1px solid var(--fm-border);
          border-radius: 13px;
          color: var(--fm-cyan);
          background: var(--fm-card);
          white-space: nowrap;
          font-size: 11px;
        }

        .fm-count strong { color: var(--fm-text); font-size: 18px; }

        .fm-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .fm-metric {
          min-height: 145px;
          position: relative;
          overflow: hidden;
          padding: 18px;
          border: 1px solid var(--fm-border);
          border-radius: 16px;
          background: var(--fm-card);
          box-shadow: var(--fm-shadow);
        }

        .fm-metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          color: var(--fm-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .fm-metric-icon {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: var(--fm-cyan);
          background: rgba(0,234,255,.1);
        }

        .fm-metric strong {
          display: block;
          margin-top: 12px;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -.05em;
        }

        .fm-metric small {
          display: block;
          margin-top: 7px;
          color: var(--fm-subtle);
          font-size: 10px;
        }

        .fm-metric-glow {
          position: absolute;
          right: -35px;
          bottom: -55px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--fm-cyan);
          opacity: .13;
          filter: blur(25px);
        }

        .fm-metric.pink .fm-metric-icon { color: var(--fm-pink); background: rgba(255,41,200,.1); }
        .fm-metric.pink .fm-metric-glow { background: var(--fm-pink); }
        .fm-metric.green .fm-metric-icon { color: var(--fm-green); background: rgba(0,230,154,.1); }
        .fm-metric.green .fm-metric-glow { background: var(--fm-green); }
        .fm-metric.violet .fm-metric-icon { color: var(--fm-violet); background: rgba(166,107,255,.1); }
        .fm-metric.violet .fm-metric-glow { background: var(--fm-violet); }

        .fm-grid-two {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 15px;
          margin-top: 16px;
        }

        .fm-card {
          min-width: 0;
          border: 1px solid var(--fm-border);
          border-radius: 17px;
          background: var(--fm-card);
          box-shadow: var(--fm-shadow);
        }

        .fm-card-pad { padding: 21px; }

        .fm-card-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .fm-card-title h3 {
          margin: 5px 0 0;
          font-size: 16px;
          font-weight: 800;
        }

        .fm-heading-icon {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          color: var(--fm-cyan);
          border-radius: 11px;
          background: rgba(0,234,255,.1);
        }

        .fm-system-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid var(--fm-border);
        }

        .fm-system-row:last-child { border-bottom: 0; }

        .fm-system-label {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .fm-system-label span:last-child { display: grid; gap: 4px; }
        .fm-system-label strong { font-size: 11px; }
        .fm-system-label small { color: var(--fm-subtle); font-size: 9px; }
        .fm-system-value { color: var(--fm-green); font-size: 10px; font-weight: 750; text-align: right; }

        .fm-privacy {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 250px;
        }

        .fm-privacy-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          color: var(--fm-cyan);
          border: 1px solid rgba(0,234,255,.25);
          border-radius: 14px;
          background: rgba(0,234,255,.09);
        }

        .fm-privacy h3 {
          max-width: 330px;
          margin: 10px 0;
          font-size: 20px;
          line-height: 1.3;
        }

        .fm-privacy p {
          margin: 0;
          color: var(--fm-muted);
          font-size: 11px;
          line-height: 1.8;
        }

        .fm-privacy-foot {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 17px;
          color: var(--fm-green);
          font-size: 10px;
        }

        .fm-panel { overflow: hidden; }

        .fm-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 13px;
          padding: 17px 19px;
          border-bottom: 1px solid var(--fm-border);
        }

        .fm-toolbar h3 { margin: 5px 0 0; font-size: 17px; }

        .fm-search {
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 13px;
          border: 1px solid var(--fm-border);
          border-radius: 12px;
          color: var(--fm-subtle);
          background: var(--fm-card2);
        }

        .fm-search:focus-within {
          border-color: var(--fm-cyan);
          box-shadow: 0 0 13px rgba(0,234,255,.08);
        }

        .fm-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: var(--fm-text);
          background: transparent;
          font-size: 11px;
        }

        .fm-search input::placeholder { color: var(--fm-subtle); }

        .fm-search button {
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          color: var(--fm-muted);
          background: transparent;
        }

        .fm-table-wrap { overflow-x: auto; }

        .fm-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .fm-table th {
          padding: 15px 17px;
          color: var(--fm-cyan);
          background: var(--fm-card2);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .09em;
          white-space: nowrap;
        }

        .fm-table td {
          padding: 16px 17px;
          border-top: 1px solid var(--fm-border);
          color: var(--fm-muted);
          font-size: 11px;
          white-space: nowrap;
        }

        .fm-table tbody tr:hover { background: rgba(0,234,255,.035); }
        .fm-action-text { color: var(--fm-cyan); font-weight: 800; }
        .fm-target { color: var(--fm-muted); }

        .fm-event-icon {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          margin-right: 9px;
          vertical-align: middle;
          border-radius: 10px;
          color: var(--fm-cyan);
          background: rgba(0,234,255,.09);
        }

        .fm-event-icon.pink {
          color: var(--fm-pink);
          background: rgba(255,41,200,.09);
        }

        .fm-event-icon.violet {
          color: var(--fm-violet);
          background: rgba(166,107,255,.1);
        }

        .fm-date {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--fm-muted);
        }

        .fm-mobile-events { display: none; }

        .fm-event-card {
          padding: 15px;
          border-bottom: 1px solid var(--fm-border);
        }

        .fm-event-card:last-child { border-bottom: 0; }

        .fm-event-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .fm-event-card-top strong {
          color: var(--fm-cyan);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .fm-event-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fm-event-meta div { min-width: 0; }

        .fm-event-meta small {
          display: block;
          margin-bottom: 5px;
          color: var(--fm-subtle);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 800;
        }

        .fm-event-meta span {
          display: block;
          color: var(--fm-muted);
          font-size: 10px;
          overflow-wrap: anywhere;
        }

        .fm-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 19px;
          border-top: 1px solid var(--fm-border);
          color: var(--fm-muted);
          font-size: 10px;
        }

        .fm-pagination strong { color: var(--fm-text); }

        .fm-pagination-actions { display: flex; gap: 8px; }

        .fm-pagination button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 11px;
          border: 1px solid var(--fm-border);
          border-radius: 10px;
          color: var(--fm-muted);
          background: var(--fm-card2);
          font-size: 10px;
        }

        .fm-pagination button:not(:disabled):hover {
          color: var(--fm-cyan);
          border-color: var(--fm-cyan);
        }

        .fm-empty {
          min-height: 170px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 22px;
          color: var(--fm-subtle);
          text-align: center;
        }

        .fm-empty strong { color: var(--fm-text); font-size: 13px; }
        .fm-empty span { font-size: 10px; line-height: 1.6; }

        .fm-filter-tabs {
          display: flex;
          gap: 5px;
          padding: 4px;
          border-radius: 11px;
          background: var(--fm-card2);
        }

        .fm-filter-tabs button {
          padding: 8px 11px;
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--fm-muted);
          background: transparent;
          font-size: 10px;
          white-space: nowrap;
        }

        .fm-filter-tabs button.selected {
          color: var(--fm-cyan);
          border-color: rgba(0,234,255,.3);
          background: rgba(0,234,255,.09);
        }

        .fm-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 30px;
          font-size: 9px;
          font-weight: 800;
        }

        .fm-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .fm-status.is-active { color: var(--fm-green); background: rgba(0,230,154,.09); }
        .fm-status.is-expired { color: #e6ad45; background: rgba(230,173,69,.09); }

        .fm-table-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 9px;
          border: 1px solid rgba(0,234,255,.25);
          border-radius: 8px;
          color: var(--fm-cyan);
          background: rgba(0,234,255,.06);
          font-size: 10px;
        }

        .fm-details { margin-top: 16px; padding: 20px; }
        .fm-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .fm-detail {
          display: grid;
          gap: 7px;
          padding: 13px;
          border: 1px solid var(--fm-border);
          border-radius: 11px;
          background: var(--fm-card2);
          min-width: 0;
        }
        .fm-detail small { color: var(--fm-subtle); font-size: 9px; text-transform: uppercase; }
        .fm-detail strong { color: var(--fm-text); font-size: 11px; overflow-wrap: anywhere; }
        .fm-detail-wide { grid-column: 1 / -1; }

        .fm-security-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 0;
          border-bottom: 1px solid var(--fm-border);
        }

        .fm-security-row:last-child { border-bottom: 0; }
        .fm-security-row span { color: var(--fm-muted); font-size: 11px; }
        .fm-security-row strong { color: var(--fm-text); font-size: 11px; text-align: right; }

        .fm-settings-block {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px 0;
          border-top: 1px solid var(--fm-border);
        }

        .fm-settings-icon {
          width: 41px;
          height: 41px;
          flex: 0 0 41px;
          display: grid;
          place-items: center;
          color: var(--fm-cyan);
          border-radius: 12px;
          background: rgba(0,234,255,.1);
        }

        .fm-settings-copy { display: grid; gap: 5px; flex: 1; min-width: 0; }
        .fm-settings-copy strong { font-size: 12px; }
        .fm-settings-copy span { color: var(--fm-muted); font-size: 10px; overflow-wrap: anywhere; }
        .fm-settings-copy small { color: var(--fm-cyan); font-size: 10px; overflow-wrap: anywhere; }

        .fm-theme-control {
          display: flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--fm-border);
          border-radius: 11px;
          background: var(--fm-card2);
        }

        .fm-theme-control button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border: 0;
          border-radius: 8px;
          color: var(--fm-muted);
          background: transparent;
          font-size: 10px;
        }

        .fm-theme-control button.selected {
          color: var(--fm-cyan);
          background: rgba(0,234,255,.1);
        }

        .fm-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--fm-green);
          font-size: 10px;
          white-space: nowrap;
        }

        .fm-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
          padding: 13px;
          border: 1px solid rgba(255,90,120,.3);
          border-radius: 11px;
          color: #ff718f;
          background: rgba(255,90,120,.07);
          font-size: 11px;
        }

        .fm-alert span { flex: 1; }

        .fm-alert button {
          display: grid;
          place-items: center;
          border: 0;
          color: inherit;
          background: transparent;
        }

        .fm-loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid var(--fm-border);
          border-radius: 16px;
          color: var(--fm-cyan);
          background: var(--fm-card);
        }

        .fm-loading strong { color: var(--fm-text); font-size: 13px; }
        .fm-loading span { color: var(--fm-muted); font-size: 10px; }

        .fm-spin { animation: fmspin 1s linear infinite; }
        @keyframes fmspin { to { transform: rotate(360deg); } }

        .fm-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 27px 2px 6px;
          color: var(--fm-subtle);
          font-size: 9px;
          letter-spacing: .08em;
        }

        .fm-footer span:last-child {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .fm-backdrop { display: none; }

        @media (max-width: 1100px) {
          .fm-sidebar { width: 220px; flex-basis: 220px; }
          .fm-metric-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 760px) {
          .fm-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: min(290px, 86vw);
            height: 100dvh;
            transform: translateX(-105%);
            transition: transform .25s ease;
            box-shadow: 0 20px 60px rgba(0,0,0,.35);
          }

          .fm-sidebar.open { transform: translateX(0); }

          .fm-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 29;
            border: 0;
            background: rgba(0,0,0,.65);
            backdrop-filter: blur(4px);
          }

          .fm-menu-button { display: grid; }

          .fm-topbar { height: 72px; padding: 0 14px; }
          .fm-top-left, .fm-top-actions { gap: 8px; }
          .fm-session, .fm-admin-text { display: none; }
          .fm-admin-avatar { width: 36px; height: 36px; }
          .fm-page-title { font-size: 17px; }
          .fm-icon-button { width: 37px; height: 37px; flex-basis: 37px; }

          .fm-content { padding: 23px 15px 18px; }
          .fm-intro { align-items: flex-start; flex-direction: column; }
          .fm-count { align-self: flex-start; }

          .fm-grid-two { grid-template-columns: 1fr; }
          .fm-toolbar { align-items: stretch; flex-direction: column; }
          .fm-search { min-width: 0; width: 100%; }
          .fm-filter-tabs { overflow-x: auto; }

          .fm-table-wrap { display: none; }
          .fm-mobile-events { display: block; }

          .fm-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .fm-details-grid { grid-template-columns: 1fr; }
          .fm-detail-wide { grid-column: auto; }
        }

        @media (max-width: 460px) {
          .fm-metric-grid { gap: 9px; }
          .fm-metric { min-height: 132px; padding: 13px; }
          .fm-metric-top { font-size: 10px; }
          .fm-metric strong { font-size: 25px; }
          .fm-metric small { font-size: 9px; line-height: 1.5; }
          .fm-card-pad { padding: 16px; }
          .fm-toolbar { padding: 15px; }
          .fm-event-meta { grid-template-columns: 1fr 1fr; }
          .fm-settings-block { flex-wrap: wrap; align-items: flex-start; }
          .fm-settings-copy { min-width: calc(100% - 60px); }
          .fm-theme-control, .fm-badge { margin-left: 54px; }
          .fm-footer { font-size: 8px; }
          .fm-topbar { padding: 0 10px; }
          .fm-content { padding-left: 12px; padding-right: 12px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fm-shell *, .fm-shell *::before, .fm-shell *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {mobileOpen && (
        <button
          className="fm-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside className={`fm-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="fm-brand">
          <div className="fm-brand-icon"><Command size={23} /></div>
          <div>
            <div className="fm-brand-name">FIND <span>MALI</span></div>
            <div className="fm-brand-caption">ADMIN CONTROL CENTER</div>
          </div>
        </div>

        <div className="fm-side-label">WORKSPACE</div>

        <nav className="fm-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.name;

            return (
              <button
                key={item.name}
                className={`fm-nav-button ${selected ? "selected" : ""}`}
                onClick={() => changeSection(item.name)}
                aria-current={selected ? "page" : undefined}
              >
                <span className="fm-nav-icon"><Icon size={19} /></span>
                <span className="fm-nav-copy">
                  <strong>{item.name}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="fm-side-spacer" />

        <div className="fm-protected">
          <div className="fm-protected-icon"><ShieldCheck size={22} /></div>
          <div className="fm-protected-copy">
            <strong>Protected session</strong>
            <small>Admin authentication active</small>
          </div>
          <span className="fm-live-dot" />
        </div>

        <button
          className="fm-logout"
          onClick={logout}
          disabled={loggingOut}
        >
          <LogOut size={17} />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>

        <div className="fm-side-footer">FIND MALI · ADMIN</div>
      </aside>

      {/* Main */}
      <main className="fm-main">
        <header className="fm-topbar">
          <div className="fm-top-left">
            <button
              className="fm-icon-button fm-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="fm-breadcrumb">
                WORKSPACE <span>/</span> {active.toUpperCase()}
              </div>
              <h1 className="fm-page-title">{active}</h1>
            </div>
          </div>

          <div className="fm-top-actions">
            <div className="fm-session">
              <span className="fm-live-dot" />
              Admin session
            </div>

            <button
              className="fm-icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              className="fm-icon-button"
              onClick={() => loadData(active, true)}
              disabled={refreshing || active === "Settings"}
              title="Refresh"
              aria-label="Refresh dashboard"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "fm-spin" : ""}
              />
            </button>

            <div className="fm-admin-user">
              <div className="fm-admin-avatar"><Shield size={18} /></div>
              <div className="fm-admin-text">
                <strong>Administrator</strong>
                <small title={email}>{email}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="fm-content">
          {error && (
            <div className="fm-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss">
                <X size={17} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="fm-loading">
              <RefreshCw size={24} className="fm-spin" />
              <strong>Loading dashboard data</strong>
              <span>Connecting to your secure database…</span>
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {active === "Overview" && (
                <>
                  <section className="fm-intro">
                    <div>
                      <div className="fm-eyebrow">
                        <span className="fm-eyebrow-line" />
                        LIVE PLATFORM OVERVIEW
                      </div>
                      <h2>Welcome back<span style={{ color: "var(--fm-cyan)" }}>.</span></h2>
                      <p>
                        Here&apos;s what&apos;s happening across your FIND MALI platform.
                      </p>
                    </div>

                    <div className="fm-count">
                      <CalendarDays size={17} />
                      {new Date().toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </section>

                  <section className="fm-metric-grid">
                    <Metric
                      title="Total inboxes"
                      value={stats?.totalInboxes}
                      description="All created inboxes"
                      icon={Inbox}
                      color=""
                    />
                    <Metric
                      title="Total messages"
                      value={stats?.totalMessages}
                      description="Message count only"
                      icon={Mail}
                      color="pink"
                    />
                    <Metric
                      title="Active inboxes"
                      value={stats?.activeInboxes}
                      description="Currently active"
                      icon={Users}
                      color="green"
                    />
                    <Metric
                      title="Expired inboxes"
                      value={stats?.expiredInboxes}
                      description="Past expiration time"
                      icon={Clock3}
                      color="violet"
                    />
                  </section>

                  <section className="fm-grid-two">
                    <article className="fm-card fm-card-pad">
                      <div className="fm-card-title">
                        <div>
                          <div className="fm-eyebrow">INFRASTRUCTURE</div>
                          <h3>System overview</h3>
                        </div>
                        <span className="fm-heading-icon"><Server size={19} /></span>
                      </div>

                      {[
                        ["Database connection", data.system?.database ?? "Unknown", Server],
                        ["Admin authentication", data.system?.authentication ?? "Unknown", ShieldCheck],
                        ["Activity logging", data.system?.activityLogs ?? "Unknown", Activity],
                        ["Messages · last 24 hours", formatNumber(stats?.messagesLast24Hours), Mail],
                      ].map(([label, value, Icon]) => {
                        const ItemIcon = Icon as LucideIcon;

                        return (
                          <div className="fm-system-row" key={label as string}>
                            <div className="fm-system-label">
                              <ItemIcon size={17} />
                              <span>
                                <strong>{label as string}</strong>
                                <small>Platform status</small>
                              </span>
                            </div>
                            <span className="fm-system-value">{value as string}</span>
                          </div>
                        );
                      })}
                    </article>

                    <article className="fm-card fm-card-pad fm-privacy">
                      <div className="fm-privacy-icon"><ShieldCheck size={24} /></div>
                      <div className="fm-eyebrow">PRIVACY BY DESIGN</div>
                      <h3>Your users&apos; messages stay private.</h3>
                      <p>
                        This dashboard displays aggregate message counts and
                        inbox metadata only. Incoming email content and message
                        bodies are not displayed here.
                      </p>
                      <div className="fm-privacy-foot">
                        <CheckCircle2 size={15} />
                        Message content hidden from admin UI
                      </div>
                    </article>
                  </section>
                </>
              )}

              {/* INBOXES */}
              {active === "Inboxes" && (
                <>
                  <section className="fm-intro">
                    <div>
                      <div className="fm-eyebrow">
                        <span className="fm-eyebrow-line" />
                        PLATFORM MANAGEMENT
                      </div>
                      <h2>Inbox management</h2>
                      <p>
                        Review inbox metadata and expiration status.
                        Message content remains private.
                      </p>
                    </div>

                    <div className="fm-count">
                      <Inbox size={17} />
                      <strong>{formatNumber(data.total ?? 0)}</strong>
                      records
                    </div>
                  </section>

                  <section className="fm-card fm-panel">
                    <div className="fm-toolbar">
                      <div className="fm-filter-tabs">
                        {[
                          ["All inboxes", "all"],
                          ["Active", "active"],
                          ["Expired", "expired"],
                        ].map(([label, value]) => (
                          <button
                            key={value}
                            className={inboxStatus === value ? "selected" : ""}
                            onClick={() => changeInboxStatus(value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <label className="fm-search">
                        <Search size={17} />
                        <input
                          value={inboxSearch}
                          onChange={(event) => setInboxSearch(event.target.value)}
                          placeholder="Search current page…"
                        />
                        {inboxSearch && (
                          <button
                            onClick={() => setInboxSearch("")}
                            aria-label="Clear search"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </label>
                    </div>

                    <div className="fm-table-wrap">
                      <table className="fm-table">
                        <thead>
                          <tr>
                            <th>Email address</th>
                            <th>Created</th>
                            <th>Expires</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInboxes.map((item) => {
                            const isActive =
                              new Date(item.expires_at).getTime() > Date.now();

                            return (
                              <tr key={item.id}>
                                <td><span className="fm-action-text">{item.email_address}</span></td>
                                <td>{formatDate(item.created_at)}</td>
                                <td>{formatDate(item.expires_at)}</td>
                                <td><StatusPill active={isActive} /></td>
                                <td>
                                  <button
                                    className="fm-table-action"
                                    onClick={() => openInbox(item.id)}
                                  >
                                    View details <ChevronRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {!filteredInboxes.length && (
                      <div className="fm-empty">
                        <Inbox size={26} />
                        <strong>No inboxes found</strong>
                        <span>
                          {inboxSearch
                            ? "Try another search term."
                            : "There are no records in this view."}
                        </span>
                      </div>
                    )}

                    <div className="fm-pagination">
                      <span>
                        Page <strong>{data.page ?? inboxPage}</strong> of{" "}
                        <strong>{Math.max(1, data.totalPages ?? 1)}</strong>
                        {" · "}{formatNumber(data.total ?? 0)} records
                      </span>

                      <div className="fm-pagination-actions">
                        <button
                          onClick={() => setInboxPage((page) => Math.max(1, page - 1))}
                          disabled={inboxPage <= 1}
                        >
                          <ChevronLeft size={15} /> Previous
                        </button>
                        <button
                          onClick={() => setInboxPage((page) => page + 1)}
                          disabled={inboxPage >= (data.totalPages ?? 1)}
                        >
                          Next <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </section>

                  {(detailsLoading || selectedInbox || detailsError) && (
                    <section className="fm-card fm-details">
                      {detailsLoading ? (
                        <div className="fm-loading">
                          <RefreshCw size={20} className="fm-spin" />
                          <span>Loading inbox details…</span>
                        </div>
                      ) : detailsError ? (
                        <div className="fm-alert">
                          <AlertCircle size={17} />
                          {detailsError}
                        </div>
                      ) : selectedInbox ? (
                        <>
                          <div className="fm-card-title">
                            <div>
                              <div className="fm-eyebrow">
                                INBOX RECORD #{selectedInbox.id}
                              </div>
                              <h3>Inbox details</h3>
                            </div>
                            <button
                              className="fm-icon-button"
                              onClick={() => setSelectedInbox(null)}
                              aria-label="Close details"
                            >
                              <X size={17} />
                            </button>
                          </div>

                          <div className="fm-details-grid">
                            <div className="fm-detail">
                              <small>Email address</small>
                              <strong>{selectedInbox.email_address}</strong>
                            </div>
                            <div className="fm-detail">
                              <small>Status</small>
                              <StatusPill active={selectedInbox.status === "active"} />
                            </div>
                            <div className="fm-detail">
                              <small>Created</small>
                              <strong>{formatDate(selectedInbox.created_at)}</strong>
                            </div>
                            <div className="fm-detail">
                              <small>Expires</small>
                              <strong>{formatDate(selectedInbox.expires_at)}</strong>
                            </div>
                            <div className="fm-detail fm-detail-wide">
                              <small>IP tracking</small>
                              <strong>{selectedInbox.ipTracking || "Not available"}</strong>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </section>
                  )}
                </>
              )}

              {/* SECURITY */}
              {active === "Security" && (
                <>
                  <section className="fm-intro">
                    <div>
                      <div className="fm-eyebrow">
                        <span className="fm-eyebrow-line" />
                        PROTECTION CENTER
                      </div>
                      <h2>Security overview</h2>
                      <p>
                        Read-only view of your current backend security configuration.
                      </p>
                    </div>

                    <div className="fm-count">
                      <ShieldCheck size={17} />
                      Read only
                    </div>
                  </section>

                  <section className="fm-card fm-card-pad">
                    <div className="fm-card-title">
                      <div>
                        <div className="fm-eyebrow">ACCESS &amp; PROTECTION</div>
                        <h3>Security configuration</h3>
                      </div>
                      <span className="fm-heading-icon"><Shield size={19} /></span>
                    </div>

                    {[
                      ["Google admin authentication", data.adminAuthentication ?? "—"],
                      ["Inbox creation limit", data.rateLimit ?? "—"],
                      ["Rate limit records", formatNumber(data.rateLimitRecords)],
                      ["Activity logging", data.activityLogs ?? "—"],
                      ["Active sessions", data.activeSessions ?? "—"],
                    ].map(([label, value]) => (
                      <div className="fm-security-row" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}

                    <div className="fm-privacy-foot">
                      <ShieldCheck size={16} />
                      Security settings are displayed as read-only information.
                    </div>
                  </section>
                </>
              )}

              {/* ACTIVITY LOGS */}
              {active === "Activity Logs" && (
                <>
                  <section className="fm-intro">
                    <div>
                      <div className="fm-eyebrow">
                        <span className="fm-eyebrow-line" />
                        AUDIT TRAIL
                      </div>
                      <h2>Administrator activity</h2>
                      <p>
                        Real dashboard events recorded by the server.
                        Message content is never included.
                      </p>
                    </div>

                    <div className="fm-count">
                      <Activity size={19} />
                      <strong>{formatNumber(data.total ?? 0)}</strong>
                      records
                    </div>
                  </section>

                  <section className="fm-card fm-panel">
                    <div className="fm-toolbar">
                      <div>
                        <div className="fm-eyebrow">RECORDED EVENTS</div>
                        <h3>Activity history</h3>
                      </div>

                      <label className="fm-search">
                        <Search size={18} />
                        <input
                          value={activitySearch}
                          onChange={(event) => {
                            setActivitySearch(event.target.value);
                            setActivityPage(1);
                          }}
                          placeholder="Search actions…"
                          aria-label="Search activity actions"
                        />
                        {activitySearch && (
                          <button
                            onClick={() => {
                              setActivitySearch("");
                              setActivityPage(1);
                            }}
                            aria-label="Clear search"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </label>
                    </div>

                    {/* Desktop table */}
                    <div className="fm-table-wrap">
                      <table className="fm-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Details</th>
                            <th>Date &amp; Time</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(data.logs ?? []).map((log, index) => (
                            <tr key={log.id}>
                              <td>
                                <span className={`fm-event-icon ${index % 3 === 1 ? "pink" : index % 3 === 2 ? "violet" : ""}`}>
                                  <ActivityIcon action={log.action} />
                                </span>
                                <span className="fm-action-text">{log.action}</span>
                              </td>
                              <td>
                                <span className="fm-target">
                                  {log.target_type ?? "—"}
                                  {log.target_id ? ` · ${log.target_id}` : ""}
                                </span>
                              </td>
                              <td>
                                {log.details && Object.keys(log.details).length
                                  ? JSON.stringify(log.details)
                                  : "—"}
                              </td>
                              <td>
                                <span className="fm-date">
                                  <Clock3 size={15} />
                                  {formatDate(log.created_at)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="fm-mobile-events">
                      {(data.logs ?? []).map((log, index) => (
                        <article className="fm-event-card" key={log.id}>
                          <div className="fm-event-card-top">
                            <span className={`fm-event-icon ${index % 3 === 1 ? "pink" : index % 3 === 2 ? "violet" : ""}`}>
                              <ActivityIcon action={log.action} />
                            </span>
                            <strong>{log.action}</strong>
                          </div>

                          <div className="fm-event-meta">
                            <div>
                              <small>Target</small>
                              <span>
                                {log.target_type ?? "—"}
                                {log.target_id ? ` · ${log.target_id}` : ""}
                              </span>
                            </div>
                            <div>
                              <small>Date &amp; Time</small>
                              <span>{formatDate(log.created_at)}</span>
                            </div>
                            <div>
                              <small>Details</small>
                              <span>
                                {log.details && Object.keys(log.details).length
                                  ? JSON.stringify(log.details)
                                  : "—"}
                              </span>
                            </div>
                            <div>
                              <small>Record ID</small>
                              <span>#{log.id}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    {!data.logs?.length && (
                      <div className="fm-empty">
                        <Activity size={28} />
                        <strong>No activity records found</strong>
                        <span>
                          Events will appear here when dashboard activity is recorded.
                        </span>
                      </div>
                    )}

                    <div className="fm-pagination">
                      <span>
                        Page <strong>{data.page ?? activityPage}</strong> of{" "}
                        <strong>{Math.max(1, data.totalPages ?? 1)}</strong>
                        {" · "}{formatNumber(data.total ?? 0)} records
                      </span>

                      <div className="fm-pagination-actions">
                        <button
                          onClick={() =>
                            setActivityPage((page) => Math.max(1, page - 1))
                          }
                          disabled={activityPage <= 1}
                        >
                          <ChevronLeft size={15} /> Previous
                        </button>
                        <button
                          onClick={() => setActivityPage((page) => page + 1)}
                          disabled={activityPage >= (data.totalPages ?? 1)}
                        >
                          Next <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* SETTINGS */}
              {active === "Settings" && (
                <>
                  <section className="fm-card fm-card-pad">
                    <div className="fm-intro">
                      <div>
                        <div className="fm-eyebrow">
                          <span className="fm-eyebrow-line" />
                          PREFERENCES
                        </div>
                        <h2>Settings</h2>
                        <p>
                          Manage your dashboard appearance and review your administrator account.
                        </p>
                      </div>
                    </div>

                    <div className="fm-settings-block">
                      <div className="fm-settings-icon"><Sun size={20} /></div>
                      <div className="fm-settings-copy">
                        <strong>Appearance</strong>
                        <span>Choose the dashboard color theme.</span>
                      </div>

                      <div className="fm-theme-control">
                        <button
                          className={theme === "dark" ? "selected" : ""}
                          onClick={() => setTheme("dark")}
                        >
                          <Moon size={15} /> Dark
                        </button>
                        <button
                          className={theme === "light" ? "selected" : ""}
                          onClick={() => setTheme("light")}
                        >
                          <Sun size={15} /> Light
                        </button>
                      </div>
                    </div>

                    <div className="fm-settings-block">
                      <div className="fm-settings-icon"><ShieldCheck size={20} /></div>
                      <div className="fm-settings-copy">
                        <strong>Administrator account</strong>
                        <span>Signed in through Supabase Google OAuth.</span>
                        <small>{email}</small>
                      </div>
                      <span className="fm-badge">
                        <CheckCircle2 size={15} /> Authenticated
                      </span>
                    </div>

                    <div className="fm-settings-block">
                      <div className="fm-settings-icon"><Bell size={20} /></div>
                      <div className="fm-settings-copy">
                        <strong>Notifications</strong>
                        <span>Dashboard notifications are not configured.</span>
                      </div>
                      <span className="fm-badge" style={{ color: "var(--fm-muted)" }}>
                        Not configured
                      </span>
                    </div>

                    <p style={{
                      color: "var(--fm-subtle)",
                      fontSize: 10,
                      lineHeight: 1.7,
                      borderTop: "1px solid var(--fm-border)",
                      paddingTop: 15,
                      marginTop: 12,
                    }}>
                      Theme preference is saved in this browser only.
                      Authentication and backend settings are unchanged.
                    </p>
                  </section>
                </>
              )}
            </>
          )}

          <footer className="fm-footer">
            <span>© {new Date().getFullYear()} FIND MALI</span>
            <span>
              <span className="fm-live-dot" />
              Secure admin workspace
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
