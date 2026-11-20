"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
  X,
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

type Theme = "dark" | "light";

const navigation = [
  { name: "Overview", icon: LayoutDashboard, hint: "Platform summary" },
  { name: "Inboxes", icon: Inbox, hint: "Manage temporary inboxes" },
  { name: "Security", icon: ShieldCheck, hint: "Security configuration" },
  { name: "Activity Logs", icon: Activity, hint: "System events" },
  { name: "Settings", icon: Settings, hint: "Admin preferences" },
];

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatNumber(value?: number) {
  return typeof value === "number"
    ? new Intl.NumberFormat().format(value)
    : "—";
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`status-pill ${active ? "status-active" : "status-expired"}`}>
      <span className="status-indicator" />
      {active ? "Active" : "Expired"}
    </span>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  accent,
  trend,
}: {
  title: string;
  value?: number;
  note: string;
  icon: typeof Inbox;
  accent: "cyan" | "violet" | "green" | "amber";
  trend?: "up" | "down";
}) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <div className="metric-top">
        <span className="metric-label">{title}</span>
        <span className="metric-icon"><Icon size={19} /></span>
      </div>
      <div className="metric-value-row">
        <h3 className="metric-value">{formatNumber(value)}</h3>
        {trend && (
          <span className="metric-trend">
            {trend === "up" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          </span>
        )}
      </div>
      <p className="metric-note">{note}</p>
      <span className="metric-orb" />
    </article>
  );
}

export default function Dashboard({ email }: { email: string }) {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [data, setData] = useState<DashboardData>({});
  const [error, setError] = useState("");
  const [inboxStatus, setInboxStatus] = useState("all");
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxSearch, setInboxSearch] = useState("");
  const [selectedInbox, setSelectedInbox] = useState<InboxDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("find-mali-admin-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("find-mali-admin-theme", theme);
  }, [theme]);

  async function loadData(section = active, refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const apiSection = section.toLowerCase();
      let url = `/api/admin/data?section=${encodeURIComponent(apiSection)}`;

      if (section === "Inboxes") {
        url += `&status=${encodeURIComponent(inboxStatus)}&page=${inboxPage}`;
      }

      const response = await fetch(url, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load dashboard data.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (active === "Activity Logs" || active === "Settings") {
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
        `/api/admin/data?section=inbox&id=${encodeURIComponent(String(id))}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load inbox details.");
      }

      setSelectedInbox(result.inbox);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : "Unable to load inbox details."
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

  const filteredInboxes = useMemo(() => {
    const query = inboxSearch.trim().toLowerCase();
    if (!query) return data.inboxes ?? [];
    return (data.inboxes ?? []).filter((item) =>
      item.email_address.toLowerCase().includes(query)
    );
  }, [data.inboxes, inboxSearch]);

  const stats = data.stats;

  return (
    <div className="admin-shell">
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Command size={22} /></div>
          <div className="brand-copy">
            <div className="brand-name">FIND <span>MALI</span></div>
            <div className="brand-caption">ADMIN CONTROL CENTER</div>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);
                  setMobileOpen(false);
                  setSelectedInbox(null);
                }}
                className={`sidebar-link ${selected ? "sidebar-link-active" : ""}`}
                aria-current={selected ? "page" : undefined}
              >
                <span className="sidebar-link-icon"><Icon size={18} /></span>
                <span className="sidebar-link-copy">
                  <span>{item.name}</span>
                  <small>{item.hint}</small>
                </span>
                {selected && <span className="sidebar-active-bar" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-security-card">
          <div className="security-card-icon"><ShieldCheck size={18} /></div>
          <div>
            <strong>Protected session</strong>
            <span>Admin authentication active</span>
          </div>
          <span className="live-dot" />
        </div>
        <button className="sidebar-logout" onClick={logout} disabled={loggingOut}>
          <LogOut size={17} />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
        <div className="sidebar-footer">FIND MALI · ADMIN</div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <div className="breadcrumb">WORKSPACE <span>/</span> {active.toUpperCase()}</div>
              <h1 className="page-title">{active}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="connection-indicator"><span className="live-dot" /> <span>Admin session</span></div>
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={() => loadData(active, true)}
              disabled={refreshing || active === "Activity Logs" || active === "Settings"}
              aria-label="Refresh dashboard"
              title="Refresh"
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
            <div className="topbar-admin">
              <div className="admin-avatar"><Shield size={17} /></div>
              <div className="admin-identity">
                <strong>Administrator</strong>
                <span title={email}>{email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert-banner">
              <AlertCircle size={19} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error"><X size={17} /></button>
            </div>
          )}

          {loading ? (
            <div className="loading-panel">
              <RefreshCw size={22} className="spin" />
              <strong>Loading dashboard data</strong>
              <span>Connecting to your secure database…</span>
            </div>
          ) : active === "Overview" ? (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> LIVE PLATFORM OVERVIEW</div>
                  <h2>Welcome back<span className="accent-dot">.</span></h2>
                  <p>Here&apos;s what&apos;s happening across your FIND MALI platform.</p>
                </div>
                <div className="welcome-date"><CalendarDays size={16} /> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</div>
              </section>

              <section className="metric-grid" aria-label="Platform statistics">
                <MetricCard title="Total inboxes" value={stats?.totalInboxes} note="All created inboxes" icon={Inbox} accent="cyan" />
                <MetricCard title="Total messages" value={stats?.totalMessages} note="Message count only · content private" icon={Mail} accent="violet" />
                <MetricCard title="Active inboxes" value={stats?.activeInboxes} note="Currently within expiry time" icon={Users} accent="green" trend="up" />
                <MetricCard title="Expired inboxes" value={stats?.expiredInboxes} note="Past their expiration time" icon={Clock3} accent="amber" />
              </section>

              <section className="overview-grid">
                <article className="surface-card system-card">
                  <div className="card-heading">
                    <div>
                      <div className="eyebrow">INFRASTRUCTURE</div>
                      <h3>System overview</h3>
                    </div>
                    <span className="heading-icon"><Server size={19} /></span>
                  </div>
                  <div className="system-status-row">
                    <div className="system-status-label"><span className="status-symbol"><Server size={16} /></span><span><strong>Database connection</strong><small>Supabase database</small></span></div>
                    <span className="system-value">{data.system?.database ?? "Unknown"}</span>
                  </div>
                  <div className="system-status-row">
                    <div className="system-status-label"><span className="status-symbol"><ShieldCheck size={16} /></span><span><strong>Admin authentication</strong><small>Google OAuth</small></span></div>
                    <span className="system-value">{data.system?.authentication ?? "Unknown"}</span>
                  </div>
                  <div className="system-status-row">
                    <div className="system-status-label"><span className="status-symbol"><Activity size={16} /></span><span><strong>Messages · last 24 hours</strong><small>Aggregate count</small></span></div>
                    <span className="system-value system-value-cyan">{formatNumber(stats?.messagesLast24Hours)}</span>
                  </div>
                </article>

                <article className="surface-card privacy-card">
                  <div className="privacy-glow" />
                  <div className="privacy-icon"><ShieldCheck size={23} /></div>
                  <div className="eyebrow">PRIVACY BY DESIGN</div>
                  <h3>Your users&apos; messages stay private.</h3>
                  <p>The Admin Dashboard displays aggregate message counts and inbox metadata only. Incoming email content and message bodies are not shown here.</p>
                  <div className="privacy-foot"><CheckCircle2 size={15} /> Message content hidden from admin UI</div>
                </article>
              </section>
            </>
          ) : active === "Inboxes" ? (
            <>
              <section className="section-intro">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> PLATFORM MANAGEMENT</div>
                  <h2>Inbox management</h2>
                  <p>Review inbox metadata and expiration status. Message content remains private.</p>
                </div>
                <div className="section-count"><Inbox size={17} /><strong>{formatNumber(data.total ?? 0)}</strong><span>records</span></div>
              </section>

              <section className="surface-card inbox-card">
                <div className="inbox-toolbar">
                  <div className="filter-tabs" role="group" aria-label="Filter inboxes">
                    {[
                      { label: "All inboxes", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Expired", value: "expired" },
                    ].map((filter) => (
                      <button key={filter.value} onClick={() => changeStatus(filter.value)} className={`filter-tab ${inboxStatus === filter.value ? "filter-tab-active" : ""}`}>
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <label className="search-box">
                    <Search size={17} />
                    <input value={inboxSearch} onChange={(event) => setInboxSearch(event.target.value)} placeholder="Search current page…" aria-label="Search inboxes on current page" />
                    {inboxSearch && <button onClick={() => setInboxSearch("")} aria-label="Clear search"><X size={15} /></button>}
                  </label>
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Email address</th><th>Created</th><th>Expires</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {filteredInboxes.map((item) => {
                        const isActive = new Date(item.expires_at).getTime() > Date.now();
                        return (
                          <tr key={item.id}>
                            <td><span className="email-cell">{item.email_address}</span></td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>{formatDate(item.expires_at)}</td>
                            <td><StatusPill active={isActive} /></td>
                            <td><button className="table-action" onClick={() => openInbox(item.id)}>View details <ChevronRight size={14} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!filteredInboxes.length && <div className="empty-state"><Inbox size={25} /><strong>No inboxes found</strong><span>{inboxSearch ? "Try another search term." : "There are no records in this view."}</span></div>}
                </div>

                <div className="pagination">
                  <span>Page <strong>{data.page ?? inboxPage}</strong> of <strong>{Math.max(1, data.totalPages ?? 1)}</strong> <i /> {formatNumber(data.total ?? 0)} records</span>
                  <div className="pagination-actions">
                    <button onClick={() => setInboxPage((page) => Math.max(1, page - 1))} disabled={inboxPage <= 1}><ChevronLeft size={16} /> Previous</button>
                    <button onClick={() => setInboxPage((page) => page + 1)} disabled={inboxPage >= (data.totalPages ?? 1)}>Next <ChevronRight size={16} /></button>
                  </div>
                </div>
              </section>

              {(detailsLoading || selectedInbox || detailsError) && (
                <section className="surface-card details-card">
                  {detailsLoading ? (
                    <div className="details-loading"><RefreshCw size={19} className="spin" /> Loading inbox details…</div>
                  ) : detailsError ? (
                    <div className="alert-inline"><AlertCircle size={17} /> {detailsError}</div>
                  ) : selectedInbox ? (
                    <>
                      <div className="details-heading">
                        <div><div className="eyebrow">INBOX RECORD #{selectedInbox.id}</div><h3>Inbox details</h3></div>
                        <button className="icon-button" onClick={() => setSelectedInbox(null)} aria-label="Close details"><X size={18} /></button>
                      </div>
                      <div className="details-grid">
                        <div className="detail-item"><span>Email address</span><strong className="detail-email">{selectedInbox.email_address}</strong></div>
                        <div className="detail-item"><span>Status</span><StatusPill active={selectedInbox.status === "active"} /></div>
                        <div className="detail-item"><span>Created at</span><strong>{formatDate(selectedInbox.created_at)}</strong></div>
                        <div className="detail-item"><span>Expires at</span><strong>{formatDate(selectedInbox.expires_at)}</strong></div>
                        <div className="detail-item detail-wide"><span>IP address</span><strong className="detail-muted">Not available</strong><small>Individual IP tracking was not configured for this record.</small></div>
                      </div>
                      <div className="privacy-foot details-privacy"><ShieldCheck size={15} /> Only inbox metadata is displayed. Email content and message bodies are not shown.</div>
                    </>
                  ) : null}
                </section>
              )}
            </>
          ) : active === "Security" ? (
            <>
              <section className="section-intro">
                <div><div className="eyebrow"><span className="eyebrow-line" /> PROTECTION CENTER</div><h2>Security overview</h2><p>Read-only view of the security configuration reported by your backend.</p></div>
                <div className="section-count"><ShieldCheck size={18} /><span>Read only</span></div>
              </section>
              <section className="surface-card security-list">
                <div className="card-heading"><div><div className="eyebrow">ACCESS & PROTECTION</div><h3>Security configuration</h3></div><span className="heading-icon"><Shield size={19} /></span></div>
                {[
                  { label: "Google admin authentication", value: data.adminAuthentication ?? "—", icon: ShieldCheck },
                  { label: "Inbox creation limit", value: data.rateLimit ?? "—", icon: Inbox },
                  { label: "Rate limit records", value: formatNumber(data.rateLimitRecords), icon: Activity },
                  { label: "Activity logging", value: data.activityLogs ?? "—", icon: Clock3 },
                  { label: "Active sessions", value: data.activeSessions ?? "—", icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  return <div className="security-row" key={item.label}><span className="security-row-label"><span className="security-row-icon"><Icon size={17} /></span>{item.label}</span><strong>{item.value}</strong></div>;
                })}
                <div className="security-note"><ShieldCheck size={17} /><span>Security information is read-only. This dashboard does not change your email backend or security policies.</span></div>
              </section>
            </>
          ) : active === "Activity Logs" ? (
            <section className="surface-card empty-feature">
              <div className="empty-feature-icon"><Activity size={25} /></div>
              <div className="eyebrow">AUDIT TRAIL</div>
              <h2>Activity logs are not enabled yet</h2>
              <p>There are currently no configured activity log records to display. No events are fabricated or presented as real.</p>
              <span className="feature-status"><Clock3 size={14} /> Awaiting backend logging configuration</span>
            </section>
          ) : (
            <section className="surface-card settings-panel">
              <div className="section-intro settings-intro">
                <div><div className="eyebrow"><span className="eyebrow-line" /> PREFERENCES</div><h2>Settings</h2><p>Manage your dashboard appearance and review your administrator account.</p></div>
                <div className="section-count"><Settings size={17} /><span>Preferences</span></div>
              </div>
              <div className="settings-block">
                <div className="settings-block-icon"><Sun size={19} /></div>
                <div className="settings-block-copy"><strong>Appearance</strong><span>Choose the dashboard color theme.</span></div>
                <div className="theme-segment">
                  <button className={theme === "dark" ? "theme-segment-active" : ""} onClick={() => setTheme("dark")}><Moon size={15} /> Dark</button>
                  <button className={theme === "light" ? "theme-segment-active" : ""} onClick={() => setTheme("light")}><Sun size={15} /> Light</button>
                </div>
              </div>
              <div className="settings-block">
                <div className="settings-block-icon"><ShieldCheck size={19} /></div>
                <div className="settings-block-copy"><strong>Administrator account</strong><span>Signed in through Supabase Google OAuth.</span><small>{email}</small></div>
                <span className="settings-badge"><CheckCircle2 size={14} /> Authenticated</span>
              </div>
              <div className="settings-block">
                <div className="settings-block-icon"><Bell size={19} /></div>
                <div className="settings-block-copy"><strong>Notifications</strong><span>Dashboard notifications are not configured.</span></div>
                <span className="feature-status">Not configured</span>
              </div>
              <p className="settings-footnote">Theme preference is saved in this browser only. Authentication and backend settings are unchanged.</p>
            </section>
          )}

          <footer className="page-footer"><span>© {new Date().getFullYear()} FIND MALI</span><span><span className="live-dot" /> Secure admin workspace</span></footer>
        </div>
      </main>
    </div>
  );
}
