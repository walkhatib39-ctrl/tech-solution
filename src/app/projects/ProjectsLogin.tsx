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
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#39547c] via-[#31486a] to-[#39547c] p-4 font-sans antialiased"
    >
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9140e]">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-2 text-[22px] font-bold leading-tight text-[#39547c] sm:text-2xl">
              Espace projets
            </h1>
            <p className="text-gray-600">
              Connexion à votre espace interne
            </p>
          </div>

          {isPasswordMissing && (
            <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <span>
                Mot de passe non configuré. Ajoutez{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                  PROJECTS_PASSWORD
                </code>{" "}
                dans les variables d&apos;environnement.
              </span>
            </div>
          )}

          {state.error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#d9140e]"
                  disabled={isPasswordMissing || isPending}
                  name="email"
                  placeholder="nom@domaine.com"
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#d9140e]"
                  disabled={isPasswordMissing || isPending}
                  name="password"
                  placeholder="••••••••"
                  type="password"
                />
              </div>
            </div>

            <button
              className="w-full rounded-lg bg-[#d9140e] py-3 font-semibold text-white transition-all duration-300 hover:bg-[#b91010] disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="mt-6 text-center text-sm text-gray-500">
            Tech-Solution Projets © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
