import fs from "fs";
import path from "path";

function hasPackageJson(directory: string) {
  return fs.existsSync(path.join(directory, "package.json"));
}

export function getProjectsAppRoot() {
  let currentDirectory = process.cwd();
  let previousDirectory = "";

  while (currentDirectory && currentDirectory !== previousDirectory) {
    if (hasPackageJson(currentDirectory)) {
      return currentDirectory;
    }

    previousDirectory = currentDirectory;
    currentDirectory = path.dirname(currentDirectory);
  }

  return process.cwd();
}

export function sanitizeProjectUploadId(projectId: string) {
  return projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";
}

export function normalizeDocAssetPath(assetPath: string) {
  const rawValue = assetPath.trim();

  if (!rawValue) {
    return "";
  }

  return path.posix.normalize(rawValue.startsWith("/") ? rawValue : `/${rawValue}`);
}

export function getDocVirtualPath(projectId: string, filename: string) {
  return `/uploads/docs/${sanitizeProjectUploadId(projectId)}/${filename}`;
}

export function getManagedDocsUploadDir(projectId: string) {
  return path.join(
    getProjectsAppRoot(),
    "data",
    "uploads",
    "docs",
    sanitizeProjectUploadId(projectId)
  );
}

function getExpectedDocAssetPrefix(projectId: string) {
  return `/uploads/docs/${sanitizeProjectUploadId(projectId)}/`;
}

export function resolveManagedDocUploadPath(projectId: string, assetPath: string) {
  const normalizedPath = normalizeDocAssetPath(assetPath);
  const expectedPrefix = getExpectedDocAssetPrefix(projectId);

  if (!normalizedPath || !normalizedPath.startsWith(expectedPrefix)) {
    return null;
  }

  return path.join(
    getManagedDocsUploadDir(projectId),
    path.posix.basename(normalizedPath)
  );
}

export function resolveLegacyPublicDocUploadPath(
  projectId: string,
  assetPath: string
) {
  const normalizedPath = normalizeDocAssetPath(assetPath);
  const expectedPrefix = getExpectedDocAssetPrefix(projectId);

  if (!normalizedPath || !normalizedPath.startsWith(expectedPrefix)) {
    return null;
  }

  return path.join(
    getProjectsAppRoot(),
    "public",
    ...normalizedPath.split("/").filter(Boolean)
  );
}
