"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/client";

type Mode = "password" | "signup" | "link" | "reset";

export default function LoginPage() {
  const sb = useSupabase();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setSignedInAs(data.user?.email ?? null));
  }, [sb]);

  if (!sb) {
    return (
      <div className="pt-8 max-w-md">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-text-2 mt-2">Supabase isn&apos;t configured on this deployment, so there&apos;s nothing to sign in to. See docs/SETUP.md.</p>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  const origin = () => window.location.origin;

  const signInWithPassword = () =>
    run(async () => {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    });

  const signUp = () =>
    run(async () => {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${origin()}/auth/confirm?next=/login` } });
      if (error) throw error;
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setMsg({ tone: "ok", text: "Account created. Check your email for a confirmation link, click it once, then sign in with your password." });
      }
    });

  const sendLink = () =>
    run(async () => {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin()}/auth/confirm` } });
      if (error) throw error;
      setMsg({ tone: "ok", text: "Check your inbox for the link." });
    });

  const sendReset = () =>
    run(async () => {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/confirm?next=/login` });
      if (error) throw error;
      setMsg({ tone: "ok", text: "Check your inbox. The link brings you back here to choose a new password." });
    });

  const setPasswordForUser = () =>
    run(async () => {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setMsg({ tone: "ok", text: "Password saved. Next time, sign in with your email and password." });
    });

  const signOut = () =>
    run(async () => {
      await sb.auth.signOut();
      setSignedInAs(null);
      router.refresh();
    });

  const tabs: Array<[Mode, string]> = [
    ["password", "Password"],
    ["signup", "Create account"],
    ["link", "Email link"],
    ["reset", "Forgot password"],
  ];

  return (
    <div className="pt-8 max-w-md grid gap-4">
      {signedInAs ? (
        <section className="grid gap-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h1 className="text-lg font-semibold">Signed in as {signedInAs}</h1>
            <p className="text-sm text-text-2">Set a password here so you can skip the email link next time.</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordForUser();
            }}
          >
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className="flex-1"
            />
            <button type="submit" disabled={busy} className="px-3 py-1 rounded-md bg-text text-surface text-sm">
              Save password
            </button>
          </form>
          <button onClick={signOut} disabled={busy} className="text-xs text-text-2 underline justify-self-start">
            Sign out
          </button>
        </section>
      ) : (
        <section className="grid gap-3">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <div className="inline-flex flex-wrap rounded-md border border-border overflow-hidden text-sm" role="tablist">
            {tabs.map(([m, label]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setMsg(null);
                }}
                className={`px-3 py-1 ${mode === m ? "bg-text text-surface" : "text-text-2 hover:bg-surface-2"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "password") signInWithPassword();
              else if (mode === "signup") signUp();
              else if (mode === "link") sendLink();
              else sendReset();
            }}
          >
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            {(mode === "password" || mode === "signup") && (
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : 1}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Password"}
              />
            )}
            <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md bg-text text-surface text-sm justify-self-start">
              {mode === "password" ? "Sign in" : mode === "signup" ? "Create account" : mode === "link" ? "Send link" : "Send reset email"}
            </button>
          </form>

          <p className="text-xs text-text-2">
            {mode === "password" && "Use the password you set on this page. First time here? Use “Create account” or “Email link”."}
            {mode === "signup" && "You'll get one confirmation email. After that, it's email and password."}
            {mode === "link" && "No password needed. The emailed link signs you in; you can set a password afterward."}
            {mode === "reset" && "We'll email a link that brings you back here to choose a new password."}
          </p>
        </section>
      )}
      {msg && <p className={`text-sm ${msg.tone === "err" ? "text-[color:var(--signal-neg)]" : "text-text"}`}>{msg.text}</p>}
      <p className="text-xs text-text-3">Only accounts an admin has promoted to editor can change data. Everyone else can browse.</p>
    </div>
  );
}
