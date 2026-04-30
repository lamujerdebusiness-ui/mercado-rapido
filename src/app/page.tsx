"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/AuthScreen";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { supabase, supabaseEnvError } from "@/lib/supabaseClient";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadSession() {
      if (!supabase) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", window.location.pathname);
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (supabaseEnvError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-lg">
          <EmptyState
            title="Configure o Supabase"
            description={supabaseEnvError}
            action="Crie um .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
          />
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-700">
        <div className="rounded-xl bg-white px-6 py-5 shadow-soft">Carregando sessão...</div>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const shareToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("share") : null;

  return <AppShell session={session} shareToken={shareToken} />;
}
