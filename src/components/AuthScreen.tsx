"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseMessage } from "@/lib/utils";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"login" | "signup" | "google" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setBusy("login");
    setError("");
    setSuccess("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(getSupabaseMessage(authError, "Não foi possível entrar. Confira email e senha."));
    }

    setBusy(null);
  }

  async function signUp() {
    if (!supabase) {
      return;
    }

    setBusy("signup");
    setError("");
    setSuccess("");

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(getSupabaseMessage(authError, "Não foi possível criar sua conta."));
    } else {
      setSuccess("Conta criada. Se a confirmação de email estiver ativa, confirme o email antes de entrar.");
    }

    setBusy(null);
  }

  async function signInWithGoogle() {
    if (!supabase) {
      return;
    }

    setBusy("google");
    setError("");
    setSuccess("");

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });

    if (authError) {
      setError(getSupabaseMessage(authError, "Não foi possível iniciar o login com Google."));
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-emerald-700">Mercado Rápido</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Entrar na sua conta</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Sua lista de compras sincronizada e fácil de reutilizar.
          </p>
        </div>

        <form onSubmit={signIn}>
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
            placeholder="Email Address"
            autoComplete="email"
            required
          />

          <label className="sr-only" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-3 h-12 w-full rounded-lg border border-slate-300 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
            placeholder="Senha"
            autoComplete="current-password"
            minLength={6}
            required
          />

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3">
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy === "login" ? "Entrando..." : "Continue with Email"}
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={busy !== null || !email || password.length < 6}
              className="text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-60"
            >
              {busy === "signup" ? "Criando..." : "Criar conta"}
            </button>
          </div>
        </form>

        <div className="my-6 border-t border-slate-200" />

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy !== null}
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <GoogleMark />
          {busy === "google" ? "Abrindo Google..." : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.67-.06-1.31-.17-1.93H10v3.65h5.39a4.61 4.61 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.97-4.31 2.97-7.24z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.07v2.59A10 10 0 0 0 10 20z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.9a6.01 6.01 0 0 1 0-3.8V5.51H1.07a10 10 0 0 0 0 8.98l3.34-2.59z"
      />
      <path
        fill="#EA4335"
        d="M10 3.98c1.47 0 2.8.51 3.84 1.5l2.87-2.88A9.62 9.62 0 0 0 10 0a10 10 0 0 0-8.93 5.51L4.4 8.1C5.2 5.74 7.4 3.98 10 3.98z"
      />
    </svg>
  );
}
