
"use client";

import { useState } from "react";
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
  Users,
  Server,
  Clock3
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Inboxes", icon: Inbox },
  { name: "Messages", icon: Mail },
  { name: "Security", icon: Shield },
  { name: "Activity Logs", icon: Activity },
  { name: "Settings", icon: Settings }
];

export default function Dashboard({
  email
}: {
  email: string;
}) {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const stats = [
    {
      title: "Total Inboxes",
      value: "—",
      icon: Inbox,
      note: "Waiting for database connection"
    },
    {
      title: "Total Messages",
      value: "—",
      icon: Mail,
      note: "Waiting for database connection"
    },
    {
      title: "Active Sessions",
      value: "—",
      icon: Users,
      note: "Waiting for database connection"
    },
    {
      title: "System Status",
      value: "Connected",
      icon: Server,
      note: "Admin authentication active"
    }
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
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
              <p className="text-xs text-slate-500">ADMINISTRATION</p>
              <h2 className="text-xl font-semibold mt-1">
                {active}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
            <div className="avatar">
              <Shield size={20} />
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-7xl mx-auto">
          {active === "Overview" ? (
            <>
              <div className="mb-8">
                <p className="text-slate-400 text-sm">
                  Welcome to your control center.
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
                        {stat.value}
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
                    <Activity className="text-cyan-400" />
                    <h3 className="font-semibold">System Overview</h3>
                  </div>

                  <div className="system-row">
                    <span>Admin Authentication</span>
                    <span className="text-emerald-400">Active</span>
                  </div>

                  <div className="system-row">
                    <span>Supabase Connection</span>
                    <span className="text-slate-400">Pending verification</span>
                  </div>

                  <div className="system-row">
                    <span>Email Backend</span>
                    <span className="text-slate-400">Not queried yet</span>
                  </div>
                </section>

                <section className="panel-card">
                  <div className="flex items-center gap-3 mb-5">
                    <Clock3 className="text-pink-400" />
                    <h3 className="font-semibold">Recent Activity</h3>
                  </div>

                  <div className="empty-state">
                    <Activity size={28} />
                    <p className="mt-3">No activity loaded</p>
                    <p className="text-xs mt-1">
                      Activity logs will appear after database integration.
                    </p>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <section className="panel-card">
              <h3 className="text-lg font-semibold">{active}</h3>
              <p className="text-slate-400 text-sm mt-3">
                This section is ready for implementation.
                Database integration is the next step.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
