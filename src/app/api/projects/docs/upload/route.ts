import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  isProjectsAuthError,
  requireProjectsAuth,
} from "@/lib/projectsAuth";
import { getProjectsDataForUser } from "@/lib/projectsStore";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function sanitizeProjectId(projectId: string) {
  return projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, "-") || "document";
}

function getExtension(file: File) {
  const originalExt = path.extname(file.name || "").toLowerCase();

  if (originalExt) {
    return originalExt;
  }

  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "application/msword") return ".doc";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireProjectsAuth();
    const formData = await request.formData();
    const rawProjectId = formData.get("projectId");

    if (typeof rawProjectId !== "string" || !rawProjectId.trim()) {
      return NextResponse.json(
        { error: "Projet introuvable pour cet envoi." },
        { status: 400 }
      );
    }

    const projectId = rawProjectId.trim();
    const allowedProjects = await getProjectsDataForUser(currentUser);

    if (!allowedProjects.projects.some((project) => project.id === projectId)) {
      return unauthorizedResponse();
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      return NextResponse.json(
        { error: "Aucun document n’a été fourni." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "docs",
      sanitizeProjectId(projectId)
    );

    await mkdir(uploadDir, { recursive: true });

    const documents: Array<{
      assetPath: string;
      mimeType: string;
      size: number;
      title: string;
    }> = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Seuls les PDF, DOC, DOCX, JPG, PNG et WEBP sont autorisés." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Chaque document doit faire 15 Mo maximum." },
          { status: 400 }
        );
      }

      const extension = getExtension(file);
      const filename = `${Date.now()}-${randomUUID()}${extension}`;
      const diskPath = path.join(uploadDir, filename);
      const publicPath = `/uploads/docs/${sanitizeProjectId(projectId)}/${filename}`;

      await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
      documents.push({
        assetPath: publicPath,
        mimeType: file.type,
        size: file.size,
        title: sanitizeFilename(file.name || `document${extension}`),
      });
    }

    return NextResponse.json({ documents, success: true });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return unauthorizedResponse();
    }

    console.error("Upload docs error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l’envoi des documents." },
      { status: 500 }
    );
  }
}
