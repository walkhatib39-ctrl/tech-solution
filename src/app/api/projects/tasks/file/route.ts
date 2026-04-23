import { createReadStream } from "fs";
import { access, stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import {
  isProjectsAuthError,
  requireProjectsAuth,
} from "@/lib/projectsAuth";
import {
  resolveLegacyPublicTaskUploadPath,
  resolveManagedTaskUploadPath,
} from "@/lib/projectsUploads";
import { getProjectsDataForUser } from "@/lib/projectsStore";

export const runtime = "nodejs";

function getMimeTypeFromFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function sanitizeDownloadName(name: string | null, fallbackPath: string) {
  const fallbackName = path.basename(fallbackPath);

  if (!name?.trim()) {
    return fallbackName;
  }

  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || fallbackName;
}

async function resolveExistingFilePath(projectId: string, assetPath: string) {
  const candidatePaths = [
    resolveManagedTaskUploadPath(projectId, assetPath),
    resolveLegacyPublicTaskUploadPath(projectId, assetPath),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      // continue
    }
  }

  return null;
}

function createFileHeaders(options: {
  contentDisposition: "attachment" | "inline";
  contentLength: number;
  contentRange?: string;
  contentType: string;
  filename: string;
}) {
  const headers = new Headers();

  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  headers.set("Content-Length", String(options.contentLength));
  headers.set("Content-Type", options.contentType);
  headers.set(
    "Content-Disposition",
    `${options.contentDisposition}; filename*=UTF-8''${encodeURIComponent(options.filename)}`
  );

  if (options.contentRange) {
    headers.set("Content-Range", options.contentRange);
  }

  return headers;
}

async function handleFileRequest(request: NextRequest, includeBody: boolean) {
  try {
    const currentUser = await requireProjectsAuth();
    const projectId = request.nextUrl.searchParams.get("projectId")?.trim() || "";
    const assetPath = request.nextUrl.searchParams.get("path")?.trim() || "";

    if (!projectId || !assetPath) {
      return NextResponse.json(
        { error: "Pièce jointe introuvable." },
        { status: 400 }
      );
    }

    const allowedProjects = await getProjectsDataForUser(currentUser);

    if (!allowedProjects.projects.some((project) => project.id === projectId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const diskPath = await resolveExistingFilePath(projectId, assetPath);

    if (!diskPath) {
      return new NextResponse("Pièce jointe introuvable.", {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
        status: 404,
      });
    }

    const fileStats = await stat(diskPath);
    const rangeHeader = request.headers.get("range");
    const download = request.nextUrl.searchParams.get("download") === "1";
    const filename = sanitizeDownloadName(
      request.nextUrl.searchParams.get("name"),
      diskPath
    );
    const contentType = getMimeTypeFromFilename(filename);

    if (rangeHeader?.startsWith("bytes=")) {
      const [startValue, endValue] = rangeHeader.replace("bytes=", "").split("-");
      const start = Number.parseInt(startValue, 10);
      const requestedEnd = endValue ? Number.parseInt(endValue, 10) : fileStats.size - 1;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(requestedEnd) ||
        start < 0 ||
        requestedEnd < start ||
        requestedEnd >= fileStats.size
      ) {
        return new NextResponse(null, {
          headers: {
            "Content-Range": `bytes */${fileStats.size}`,
          },
          status: 416,
        });
      }

      const headers = createFileHeaders({
        contentDisposition: download ? "attachment" : "inline",
        contentLength: requestedEnd - start + 1,
        contentRange: `bytes ${start}-${requestedEnd}/${fileStats.size}`,
        contentType,
        filename,
      });

      if (!includeBody) {
        return new NextResponse(null, { headers, status: 206 });
      }

      const stream = createReadStream(diskPath, { end: requestedEnd, start });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        headers,
        status: 206,
      });
    }

    const headers = createFileHeaders({
      contentDisposition: download ? "attachment" : "inline",
      contentLength: fileStats.size,
      contentType,
      filename,
    });

    if (!includeBody) {
      return new NextResponse(null, { headers, status: 200 });
    }

    const stream = createReadStream(diskPath);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers,
      status: 200,
    });
  } catch (error) {
    if (isProjectsAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Read task attachment error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la lecture de la pièce jointe." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleFileRequest(request, true);
}

export async function HEAD(request: NextRequest) {
  return handleFileRequest(request, false);
}
