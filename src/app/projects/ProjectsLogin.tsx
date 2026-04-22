"use client";

import { useActionState } from "react";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";

export interface ProjectLoginState {
  error?: string;
}

interface ProjectsLoginProps {
  loginAction: (
    previousState: ProjectLoginState,
    formData: FormData
  ) => Promise<ProjectLoginState>;
  passwordState: {
    isConfigured: boolean;
    isUsingDevFallback: boolean;
  };
}

export default function ProjectsLogin({
  loginAction,
  passwordState,
}: ProjectsLoginProps) {
  const [state, formAction, isPending] = useActionState(loginAction, {});
  const isPasswordMissing =
    !passwordState.isConfigured && !passwordState.isUsingDevFallback;

  return (
    <div
      dir="ltr"
      className="flex min-h-screen items-center justify-center bg-[#0d1b2a] px-4 py-12 font-sans antialiased"
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Glow effect */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#d9140e]/20 via-transparent to-transparent blur-xl" />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
          {/* Top accent line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d9140e]/60 to-transparent" />

          <div className="px-8 py-8">
            {/* Brand mark */}
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d9140e] shadow-lg shadow-red-900/40">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  Tech-Solution
                </div>
                <div className="text-lg font-bold text-white">Projects</div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Accès sécurisé
              </h1>
              <p className="mt-1.5 text-sm text-white/40">
                Espace interne de pilotage de projets.
              </p>
            </div>

            {/* Warnings */}
            {isPasswordMissing && (
              <div className="mb-5 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-4 text-sm text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Mot de passe non configuré — ajoutez{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">
                    PROJECTS_PASSWORD
                  </code>{" "}
                  dans les variables d&apos;environnement.
                </span>
              </div>
            )}

            {passwordState.isUsingDevFallback && (
              <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs text-white/40">
                Mode local · mot de passe de développement actif.
              </div>
            )}

            {state.error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Form */}
            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/40">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
                  <input
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-white/[0.10] bg-white/[0.06] pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#d9140e]/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-[#d9140e]/20"
                    disabled={isPasswordMissing || isPending}
                    name="password"
                    placeholder="••••••••••"
                    type="password"
                  />
                </div>
              </div>

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d9140e] text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#b91010] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPasswordMissing || isPending}
                type="submit"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Vérification…
                  </>
                ) : (
                  "Entrer"
                )}
              </button>
            </form>
          </div>

          {/* Bottom accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        <p className="mt-5 text-center text-xs text-white/20">
          Tech-Solution · Espace interne
        </p>
      </div>
    </div>
  );
}
