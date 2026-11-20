
"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Inbox,
  Mail,
  Shield,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Server,
  Clock3,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserRound,
  CalendarDays,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type InboxItem = {
  id: number;
  email_address: string;
  created_at: string;
  expires_at: string;
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

type InboxDetails = {
  id: number;
  email_address: string;
  created_at: string;
  expires_at: string;
  status: string;
  ipAddress: string | null;
  ipTracking: string;
};

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Inboxes", icon: Inbox },
  { name: "Security", icon: Shield },
  { name: "Activity Logs", icon: Activity },
  { name: "Settings", icon: Settings },
];

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        active ? "text-emerald-400" : "text-amber-400"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          active ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      {active ? "Active" : "Expired"}
    </span>
  );
}

export default function Dashboard({ email }: { email: string }) {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState<DashboardData>({});
  const [error, setError] = useState("");

  const [inboxStatus, setInboxStatus] = useState("all");
  const [inboxPage, setInboxPage] = useState(1);

  const [selectedInbox, setSelectedInbox] =
    useState<InboxDetails | null>(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  async function loadData(
    section = active,
    refresh = false
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      let url = `/api/admin/data?section=${encodeURIComponent(
        section.toLowerCase()
      )}`;

      if (section === "Inboxes") {
        url += `&status=${inboxStatus}&page=${inboxPage}`;
      }

      const response = await fetch(url, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load data"
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (
      active === "Activity Logs" ||
      active === "Settings"
    ) {
      setData({});
      setLoading(false);
      setError("");
      return;
    }

    loadData(active);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, inboxStatus, inboxPage]);

  async function openInbox(id: number) {
    setSelectedInbox(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/data?section=inbox&id=${id}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load inbox details"
        );
      }

      setSelectedInbox(result.inbox);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Unable to load inbox details"
      );
    } finally {
      setDetailsLoading(false);
    }
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

  function changeStatus(status: string) {
    setInboxStatus(status);
    setInboxPage(1);
    setSelectedInbox(null);
  }

  const stats = [
    {
      title: "Total Inboxes",
      value: data.stats?.totalInboxes,
      icon: Inbox,
      note: "All created inboxes",
    },
    {
      title: "Total Messages",
      value: data.stats?.totalMessages,
      icon: Mail,
      note: "Count only — content hidden",
    },
    {
      title: "Active Inboxes",
      value: data.stats?.activeInboxes,
      icon: Users,
      note: "Not yet expired",
    },
    {
      title: "Expired Inboxes",
      value: data.stats?.expiredInboxes,
      icon: Clock3,
      note: "Past expiration time",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080B14] text-white flex">
      {mobileOpen && (
        <button
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`sidebar fixed lg:static z-50 inset-y-0 left-0 w-64 p-5 flex flex-col ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              FIND <span className="text-cyan-400">MALI</span>
            </h1>
            <p className="text-[10px] tracking-[3px] text-slate-500 mt-1">
              ADMIN CONSOLE
            </p>
          </div>

          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>

        <p className="text-[10px] tracking-[2px] text-slate-500 mb-4">
          MANAGEMENT
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setMobileOpen(false);
                  setSelectedInbox(null);
                }}
                className={`nav-item w-full ${
                  active === item.name ? "nav-active" : ""
                }`}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="sidebar-status mb-4">
            <span className="status-dot" />
            Admin authentication active
          </div>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="nav-item w-full text-red-400"
          >
            <LogOut size={19} />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="topbar px-5 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </button>

            <div>
              <p className="text-xs text-slate-500">
                ADMINISTRATION
              </p>
              <h2 className="text-xl font-semibold mt-1">
                {active}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(active, true)}
              disabled={
                refreshing ||
                active === "Activity Logs" ||
                active === "Settings"
              }
              className="p-2 rounded-lg border border-slate-700 hover:border-cyan-400 disabled:opacity-40"
              aria-label="Refresh data"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">
                Administrator
              </p>
              <p className="text-xs text-slate-500">
                {email}
              </p>
            </div>

            <div className="avatar">
              <Shield size={20} />
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-5 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 flex gap-3">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="panel-card flex items-center justify-center gap-3 min-h-48 text-slate-400">
              <RefreshCw className="animate-spin" size={20} />
              Loading real database data...
            </div>
          ) : active === "Overview" ? (
            <>
              <div className="mb-8">
                <p className="text-slate-400 text-sm">
                  Welcome to your FIND MALI control center.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Live information from your Supabase database.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div className="stat-card" key={stat.title}>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-400">
                          {stat.title}
                        </p>
                        <Icon className="text-cyan-400" size={21} />
                      </div>

                      <h3 className="text-3xl font-bold mt-5">
                        {stat.value ?? "—"}
                      </h3>

                      <p className="text-xs text-slate-500 mt-3">
                        {stat.note}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-2 gap-5 mt-6">
                <section className="panel-card">
                  <div className="flex items-center gap-3 mb-5">
                    <Server className="text-cyan-400" />
                    <h3 className="font-semibold">
                      System Overview
                    </h3>
                  </div>

                  <div className="system-row">
                    <span>Database Connection</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={15} />
                      {data.system?.database ?? "Unknown"}
                    </span>
                  </div>

                  <div className="system-row">
                    <span>Admin Authentication</span>
                    <span className="text-emerald-400">
                      {data.system?.authentication ?? "Unknown"}
                    </span>
                  </div>

                  <div className="system-row">
                    <span>Messages in last 24 hours</span>
                    <span className="text-cyan-400">
                      {data.stats?.messagesLast24Hours ?? 0}
                    </span>
                  </div>
                </section>

                <section className="panel-card">
                  <div className="flex items-center gap-3 mb-5">
                    <Shield className="text-pink-400" />
                    <h3 className="font-semibold">
                      Message Privacy
                    </h3>
                  </div>

                  <p className="text-sm text-slate-300">
                    Incoming email content is not displayed in
                    this Admin Dashboard.
                  </p>

                  <p className="text-xs text-slate-500 mt-3">
                    Only aggregate message counts are used
                    for dashboard statistics.
                  </p>
                </section>
              </div>
            </>
          ) : active === "Inboxes" ? (
            <>
              <section className="panel-card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-lg">
                      Inbox Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.total ?? 0} matching inboxes
                    </p>
                  </div>

                  <Inbox className="text-cyan-400" />
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { label: "All", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Expired", value: "expired" },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => changeStatus(filter.value)}
                      className={`px-4 py-2 rounded-lg text-sm border transition ${
                        inboxStatus === filter.value
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="py-3 pr-4">Email Address</th>
                        <th className="py-3 pr-4">Created</th>
                        <th className="py-3 pr-4">Expires</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3">Details</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.inboxes?.map((item) => {
                        const isActive =
                          new Date(item.expires_at).getTime() >
                          Date.now();

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-800/70 hover:bg-white/[0.02]"
                          >
                            <td className="py-4 pr-4 text-cyan-300 break-all">
                              {item.email_address}
                            </td>

                            <td className="py-4 pr-4 text-slate-400 text-xs whitespace-nowrap">
                              {formatDate(item.created_at)}
                            </td>

                            <td className="py-4 pr-4 text-slate-400 text-xs whitespace-nowrap">
                              {formatDate(item.expires_at)}
                            </td>

                            <td className="py-4 pr-4">
                              <Status active={isActive} />
                            </td>

                            <td className="py-4">
                              <button
                                onClick={() => openInbox(item.id)}
                                className="text-cyan-400 hover:text-cyan-200 text-xs border border-cyan-400/30 rounded-lg px-3 py-2"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!data.inboxes?.length && (
                  <p className="text-center text-slate-500 py-10">
                    No inboxes found.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    Page {data.page ?? inboxPage} of{" "}
                    {Math.max(1, data.totalPages ?? 1)}
                    {" · "}
                    {data.total ?? 0} records
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setInboxPage((p) => Math.max(1, p - 1))
                      }
                      disabled={inboxPage <= 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700 text-sm disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    <button
                      onClick={() => setInboxPage((p) => p + 1)}
                      disabled={
                        inboxPage >= (data.totalPages ?? 1)
                      }
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-700 text-sm disabled:opacity-30"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </section>

              {(detailsLoading || selectedInbox || detailsError) && (
                <section className="panel-card mt-5">
                  {detailsLoading ? (
                    <div className="flex items-center gap-3 text-slate-400 py-5">
                      <RefreshCw className="animate-spin" />
                      Loading inbox details...
                    </div>
                  ) : detailsError ? (
                    <p className="text-red-400 text-sm">
                      {detailsError}
                    </p>
                  ) : selectedInbox ? (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3">
                          <UserRound className="text-cyan-400" />
                          <div>
                            <h3 className="font-semibold text-lg">
                              Inbox Details
                            </h3>
                            <p className="text-xs text-slate-500">
                              Record #{selectedInbox.id}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedInbox(null)}
                          className="text-slate-400 hover:text-white"
                          aria-label="Close details"
                        >
                          <X />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800">
                          <p className="text-xs text-slate-500 mb-2">
                            Email Address
                          </p>
                          <p className="text-cyan-300 break-all">
                            {selectedInbox.email_address}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800">
                          <p className="text-xs text-slate-500 mb-2">
                            Inbox Status
                          </p>
                          <Status
                            active={selectedInbox.status === "active"}
                          />
                        </div>

                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                            <CalendarDays size={14} />
                            Created At
                          </p>
                          <p className="text-sm text-slate-300">
                            {formatDate(selectedInbox.created_at)}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800">
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                            <Clock3 size={14} />
                            Expires At
                          </p>
                          <p className="text-sm text-slate-300">
                            {formatDate(selectedInbox.expires_at)}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0B1220] border border-slate-800 sm:col-span-2">
                          <p className="text-xs text-slate-500 mb-2">
                            IP Address
                          </p>

                          <p className="text-sm text-amber-400">
                            Not available
                          </p>

                          <p className="text-xs text-slate-500 mt-2">
                            This Inbox was created before
                            individual IP tracking was configured.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3 text-xs text-slate-500">
                        <Info size={16} className="shrink-0" />
                        <p>
                          Only Inbox metadata is displayed here.
                          Incoming email content and message bodies
                          are not shown.
                        </p>
                      </div>
                    </>
                  ) : null}
                </section>
              )}
            </>
          ) : active === "Security" ? (
            <section className="panel-card">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="text-cyan-400" />
                <h3 className="font-semibold text-lg">
                  Security Overview
                </h3>
              </div>

              <div className="system-row">
                <span>Google Admin Authentication</span>
                <span className="text-emerald-400">
                  {data.adminAuthentication ?? "—"}
                </span>
              </div>

              <div className="system-row">
                <span>Inbox Creation Limit</span>
                <span className="text-cyan-300">
                  {data.rateLimit ?? "—"}
                </span>
              </div>

              <div className="system-row">
                <span>Rate Limit Records</span>
                <span>{data.rateLimitRecords ?? "—"}</span>
              </div>

              <div className="system-row">
                <span>Activity Logs</span>
                <span className="text-amber-400">
                  {data.activityLogs ?? "—"}
                </span>
              </div>

              <div className="system-row">
                <span>Active Sessions</span>
                <span className="text-amber-400">
                  {data.activeSessions ?? "—"}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-5">
                Security information is read-only. No changes
                are made to your email backend.
              </p>
            </section>
          ) : active === "Activity Logs" ? (
            <section className="panel-card">
              <Activity
                className="text-pink-400 mb-4"
                size={25}
              />
              <h3 className="font-semibold text-lg">
                Activity Logs
              </h3>
              <p className="text-sm text-slate-400 mt-3">
                Activity logging is not configured in the
                current database.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                No activity records are being invented or displayed.
              </p>
            </section>
          ) : (
            <section className="panel-card">
              <Settings
                className="text-cyan-400 mb-4"
                size={25}
              />
              <h3 className="font-semibold text-lg">
                Settings
              </h3>
              <p className="text-sm text-slate-400 mt-3">
                Admin account: {email}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Authentication is managed through Supabase Google OAuth.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
