import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createProjectsAuthToken,
  getProjectsSession,
  getProjectsPasswordState,
  PROJECTS_AUTH_COOKIE,
  PROJECTS_SESSION_SECONDS,
} from "@/lib/projectsAuth";
import { authenticateProjectsUser } from "@/lib/projectsStore";
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

  const email = formData.get("email");
  const password = formData.get("password");
  const emailValue = typeof email === "string" ? email : "";
  const passwordValue = typeof password === "string" ? password : "";

  if (!emailValue.trim()) {
    return { error: "Saisis ton email." };
  }

  if (!passwordValue.trim()) {
    return { error: "Saisis le mot de passe." };
  }

  const user = await authenticateProjectsUser(emailValue, passwordValue);

  if (!user) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PROJECTS_AUTH_COOKIE, createProjectsAuthToken(user.id), {
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
  const currentUser = await getProjectsSession();

  if (!currentUser) {
    return (
      <ProjectsLogin
        loginAction={loginProjects}
        passwordState={getProjectsPasswordState()}
      />
    );
  }

  return <ProjectsManager currentUser={currentUser} logoutAction={logoutProjects} />;
}
