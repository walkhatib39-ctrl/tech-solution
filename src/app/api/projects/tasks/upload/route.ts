import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  isProjectsAuthError,
  requireProjectsAuth,
} from "@/lib/projectsAuth";
import {
  getManagedTaskUploadDir,
  getTaskVirtualPath,
} from "@/lib/projectsUploads";
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
const MAX_FILE_SIZE = 12 * 1024 * 1024;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-") || "file";
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
        { error: "Aucun fichier n’a été fourni." },
        { status: 400 }
      );
    }

    const uploadDir = getManagedTaskUploadDir(projectId);

    await mkdir(uploadDir, { recursive: true });

    const attachments: Array<{ mimeType: string; name: string; path: string; size: number }> = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Seuls les PDF, DOC, DOCX, JPG, PNG et WEBP sont autorisés." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Chaque fichier doit faire 12 Mo maximum." },
          { status: 400 }
        );
      }

      const extension = getExtension(file);
      const filename = `${Date.now()}-${randomUUID()}${extension}`;
      const diskPath = path.join(uploadDir, filename);
      const publicPath = getTaskVirtualPath(projectId, filename);

      await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
      attachments.push({
        mimeType: file.type,
        name: sanitizeFilename(file.name || `piece-jointe${extension}`),
        path: publicPath,
        size: file.size,
      });
    }

    return NextResponse.json({ attachments, success: true });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return unauthorizedResponse();
    }

    console.error("Upload task attachments error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l’envoi des pièces jointes." },
      { status: 500 }
    );
  }
}
