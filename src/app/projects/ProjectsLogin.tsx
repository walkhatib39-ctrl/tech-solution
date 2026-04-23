"use client";

import { useActionState } from "react";
import { AlertCircle, Lock, Mail } from "lucide-react";

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
      className="projects-app projects-login-grid flex min-h-screen items-center justify-center p-4 antialiased"
    >
      <div className="relative z-10 w-full max-w-md">
        <div className="projects-shell bg-white p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[10px] bg-[var(--tsp-navy)]">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div
              aria-level={1}
              className="mb-2 font-bold text-[var(--tsp-text)]"
              role="heading"
              style={{ fontSize: "17px", letterSpacing: 0, lineHeight: 1.2 }}
            >
              Espace projets
            </div>
            <p className="text-[13px] text-[var(--tsp-text-secondary)]">
              Connexion à votre espace interne
            </p>
          </div>

          {isPasswordMissing && (
            <div className="mb-6 flex gap-3 rounded-[10px] border border-[var(--tsp-border)] bg-[var(--tsp-bg-surface)] p-4 text-[13px] text-[var(--tsp-text)]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tsp-amber)]" />
              <span>
                Mot de passe non configuré. Ajoutez{" "}
                <code className="rounded-[6px] bg-white px-1 py-0.5 font-mono text-[11px]">
                  PROJECTS_PASSWORD
                </code>{" "}
                dans les variables d&apos;environnement.
              </span>
            </div>
          )}

          {state.error && (
            <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-[var(--tsp-border)] bg-[#fef2f2] p-4 text-[#dc2626]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-[13px]">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div>
              <label className="projects-label mb-2 block">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--tsp-text-secondary)]" />
                <input
                  autoComplete="email"
                  className="w-full py-3 pl-10 pr-4 text-[13px] outline-none transition-all"
                  disabled={isPasswordMissing || isPending}
                  name="email"
                  placeholder="nom@domaine.com"
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className="projects-label mb-2 block">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--tsp-text-secondary)]" />
                <input
                  autoComplete="current-password"
                  className="w-full py-3 pl-10 pr-4 text-[13px] outline-none transition-all"
                  disabled={isPasswordMissing || isPending}
                  name="password"
                  placeholder="••••••••"
                  type="password"
                />
              </div>
            </div>

            <button
              className="projects-btn-primary w-full py-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPasswordMissing || isPending}
              type="submit"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-[12px] text-[var(--tsp-text-secondary)]">
            Tech-Solution Projets © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
