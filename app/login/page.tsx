"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string }>({ kind: "idle" });
  const sb = useSupabase();

  if (!sb) {
    return (
      <div className="pt-8 max-w-md">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-text-2 mt-2">Supabase isn&apos;t configured on this deployment, so there&apos;s nothing to sign in to. See docs/SETUP.md.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setState(error ? { kind: "error", message: error.message } : { kind: "sent" });
  };

  return (
    <div className="pt-8 max-w-md grid gap-3">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <p className="text-sm text-text-2">Enter your email and we&apos;ll send a magic link. Only accounts with the editor role can change data.</p>
      {state.kind === "sent" ? (
        <p className="text-sm">Check your inbox for the link.</p>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="flex-1" />
          <button type="submit" className="px-3 py-1 rounded-md bg-text text-surface text-sm">
            Send link
          </button>
        </form>
      )}
      {state.kind === "error" && <p className="text-sm text-[color:var(--signal-neg)]">{state.message}</p>}
    </div>
  );
}
