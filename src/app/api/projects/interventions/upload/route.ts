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

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function sanitizeProjectId(projectId: string) {
  return projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";
}

function getExtension(file: File) {
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
        { error: "Aucune photo n’a été fournie." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "interventions",
      sanitizeProjectId(projectId)
    );

    await mkdir(uploadDir, { recursive: true });

    const uploadedPaths: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: "Seuls les formats JPG, PNG et WEBP sont autorisés." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Chaque photo doit faire 8 Mo maximum." },
          { status: 400 }
        );
      }

      const filename = `${Date.now()}-${randomUUID()}${getExtension(file)}`;
      const diskPath = path.join(uploadDir, filename);
      const publicPath = `/uploads/interventions/${sanitizeProjectId(projectId)}/${filename}`;

      await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
      uploadedPaths.push(publicPath);
    }

    return NextResponse.json({ success: true, paths: uploadedPaths });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return unauthorizedResponse();
    }

    console.error("Upload intervention photos error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l’envoi des photos." },
      { status: 500 }
    );
  }
}
