
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function googleLogin() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="login-card w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="logo-icon">
            <ShieldCheck size={34} />
          </div>
        </div>

        <p className="text-center text-cyan-400 text-xs tracking-[4px] mb-3">
          FIND MALI
        </p>

        <h1 className="text-3xl font-bold text-center">
          Admin Console
        </h1>

        <p className="text-slate-400 text-center mt-3 text-sm">
          Secure administration portal
        </p>

        <div className="security-note mt-8">
          <LockKeyhole size={18} />
          <span>Authorized Google account access only</span>
        </div>

        <button
          onClick={googleLogin}
          disabled={loading}
          className="google-button mt-7"
        >
          <span className="google-g">G</span>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">
            {error}
          </p>
        )}

        <p className="text-xs text-slate-500 text-center mt-8">
          Protected Admin Access · FIND MALI
        </p>
      </div>
    </main>
  );
}
