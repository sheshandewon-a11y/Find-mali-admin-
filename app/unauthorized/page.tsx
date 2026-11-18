
import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <div className="login-card max-w-md w-full p-8 text-center">
        <ShieldX size={55} className="mx-auto text-red-400" />

        <h1 className="text-2xl font-bold mt-6">
          Access Denied
        </h1>

        <p className="text-slate-400 mt-3">
          This Google account is not authorized to access
          the FIND MALI Admin Dashboard.
        </p>

        <Link href="/login" className="text-cyan-400 inline-block mt-7">
          Back to Login
        </Link>
      </div>
    </main>
  );
}
