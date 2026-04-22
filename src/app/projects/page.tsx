import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createProjectsAuthToken,
  getProjectsPasswordState,
  PROJECTS_AUTH_COOKIE,
  PROJECTS_SESSION_SECONDS,
  verifyProjectsAuthToken,
  verifyProjectsPassword,
} from "@/lib/projectsAuth";
import ProjectsLogin, { ProjectLoginState } from "./ProjectsLogin";
import ProjectsManager from "./ProjectsManager";

export const metadata: Metadata = {
  title: "Projects | Tech-Solution",
  description: "Mini application de gestion de projets Tech-Solution.",
};

async function loginProjects(
  previousState: ProjectLoginState,
  formData: FormData
): Promise<ProjectLoginState> {
  "use server";

  const password = formData.get("password");
  const passwordValue = typeof password === "string" ? password : "";

  if (!passwordValue.trim()) {
    return { error: "Saisis le mot de passe." };
  }

  if (!verifyProjectsPassword(passwordValue)) {
    return { error: "Mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PROJECTS_AUTH_COOKIE, createProjectsAuthToken(), {
    httpOnly: true,
    maxAge: PROJECTS_SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/projects");
}

async function logoutProjects() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.set(PROJECTS_AUTH_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/projects");
}

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const isAuthenticated = verifyProjectsAuthToken(
    cookieStore.get(PROJECTS_AUTH_COOKIE)?.value
  );

  if (!isAuthenticated) {
    return (
      <ProjectsLogin
        loginAction={loginProjects}
        passwordState={getProjectsPasswordState()}
      />
    );
  }

  return <ProjectsManager logoutAction={logoutProjects} />;
}
