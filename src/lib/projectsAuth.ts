import crypto from "crypto";
import { cookies } from "next/headers";
import type { CurrentProjectUser } from "@/lib/projectsTypes";
import { getProjectUserById } from "@/lib/projectsStore";

export const PROJECTS_AUTH_COOKIE = "ts-projects-auth";
export const PROJECTS_SESSION_SECONDS = 60 * 60 * 24 * 7;

const DEV_PASSWORD = "techsolution";
const AUTH_ERROR = "ProjectsUnauthorized";

export function getProjectsPassword(): string | null {
  const password = process.env.PROJECTS_PASSWORD?.trim();

  if (password) {
    return password;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_PASSWORD;
  }

  return null;
}

export function getProjectsPasswordState() {
  const hasEnvPassword = Boolean(process.env.PROJECTS_PASSWORD?.trim());

  return {
    isConfigured: hasEnvPassword,
    isUsingDevFallback: !hasEnvPassword && process.env.NODE_ENV !== "production",
  };
}

function getSigningSecret(): string | null {
  const password = getProjectsPassword();

  if (!password) {
    return null;
  }

  return process.env.PROJECTS_AUTH_SECRET || process.env.JWT_SECRET || password;
}

function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

export function createProjectsAuthToken(userId: string): string {
  const secret = getSigningSecret();

  if (!secret) {
    throw new Error("Projects password is not configured");
  }

  const issuedAt = Date.now().toString();
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${createSignature(payload, secret)}`;
}

export function verifyProjectsAuthToken(token?: string | null): string | null {
  const secret = getSigningSecret();

  if (!token || !secret) {
    return null;
  }

  const [userId, issuedAt, signature] = token.split(".");

  if (!userId || !issuedAt || !signature) {
    return null;
  }

  const issuedAtNumber = Number(issuedAt);

  if (!Number.isFinite(issuedAtNumber) || issuedAtNumber > Date.now()) {
    return null;
  }

  const isExpired =
    Date.now() - issuedAtNumber > PROJECTS_SESSION_SECONDS * 1000;

  if (isExpired) {
    return null;
  }

  const payload = `${userId}.${issuedAt}`;
  return safeEqual(signature, createSignature(payload, secret)) ? userId : null;
}

export function verifyProjectsPassword(input: string): boolean {
  const password = getProjectsPassword();

  if (!password) {
    return false;
  }

  const inputHash = crypto.createHash("sha256").update(input).digest();
  const passwordHash = crypto.createHash("sha256").update(password).digest();

  return crypto.timingSafeEqual(inputHash, passwordHash);
}

export async function getProjectsSession(): Promise<CurrentProjectUser | null> {
  const cookieStore = await cookies();
  const userId = verifyProjectsAuthToken(
    cookieStore.get(PROJECTS_AUTH_COOKIE)?.value
  );

  return userId ? getProjectUserById(userId) : null;
}

export async function isProjectsAuthenticated(): Promise<boolean> {
  return Boolean(await getProjectsSession());
}

export async function requireProjectsAuth(): Promise<CurrentProjectUser> {
  const user = await getProjectsSession();

  if (!user) {
    throw new Error(AUTH_ERROR);
  }

  return user;
}

export function isProjectsAuthError(error: unknown): boolean {
  return error instanceof Error && error.message === AUTH_ERROR;
}
