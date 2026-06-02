const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const PROJECT_NAME = "Azur Private Driver";

const TARGET_SECTIONS = [
  { color: "#2563eb", name: "Site web", position: 0 },
  { color: "#16a34a", name: "SEO & Marketing", position: 1 },
];

const SITE_WEB_SOURCE_SECTIONS = new Set([
  "Technique",
  "Homepage",
  "Flotte",
  "Multilingue",
  "UI/UX",
  "Navigation",
  "Pages",
  "Documentation",
  "Formulaires",
  "CRM léger",
  "Performance",
  "Email domaine",
]);

function loadEnvFile(filename) {
  const fullPath = path.join(process.cwd(), filename);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildId(prefix, value) {
  const hash = crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
  const slug = slugify(value).slice(0, 70) || "item";
  return `${prefix}-${slug}-${hash}`;
}

function getDbConfig() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");

  return {
    database: process.env.DB_NAME || "techsolution",
    host: process.env.DB_HOST || "localhost",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
  };
}

function classifySection(sectionName) {
  return SITE_WEB_SOURCE_SECTIONS.has(sectionName) ? "Site web" : "SEO & Marketing";
}

async function ensureSection(connection, projectId, target) {
  const [existingRows] = await connection.query(
    "SELECT id FROM task_sections WHERE project_id = ? AND name = ? ORDER BY position ASC, id ASC LIMIT 1",
    [projectId, target.name]
  );

  const sectionId = existingRows[0]?.id
    ? String(existingRows[0].id)
    : buildId(`section-${projectId}`, target.name);

  await connection.execute(
    `INSERT INTO task_sections (id, project_id, name, color, position)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       color = VALUES(color),
       position = VALUES(position)`,
    [sectionId, projectId, target.name, target.color, target.position]
  );

  return sectionId;
}

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
    namedPlaceholders: true,
  });

  await connection.beginTransaction();

  try {
    const [projectRows] = await connection.query(
      "SELECT id FROM projects WHERE name = ? ORDER BY created_at ASC LIMIT 1",
      [PROJECT_NAME]
    );

    if (!projectRows[0]) {
      throw new Error(`Project not found: ${PROJECT_NAME}`);
    }

    const projectId = String(projectRows[0].id);
    const targetIdsByName = new Map();

    for (const target of TARGET_SECTIONS) {
      targetIdsByName.set(target.name, await ensureSection(connection, projectId, target));
    }

    const [tasks] = await connection.query(
      `SELECT t.id, t.section_id AS sectionId, s.name AS sectionName
       FROM tasks t
       LEFT JOIN task_sections s ON s.id = t.section_id
       WHERE t.project_id = ?`,
      [projectId]
    );

    let movedTasks = 0;

    for (const task of tasks) {
      const targetName = classifySection(String(task.sectionName || ""));
      const targetId = targetIdsByName.get(targetName);

      if (String(task.sectionId || "") === targetId) {
        continue;
      }

      await connection.execute(
        "UPDATE tasks SET section_id = ? WHERE id = ?",
        [targetId, task.id]
      );
      movedTasks += 1;
    }

    const targetIds = [...targetIdsByName.values()];
    const placeholders = targetIds.map(() => "?").join(", ");

    const [deleteResult] = await connection.execute(
      `DELETE FROM task_sections
       WHERE project_id = ?
         AND id NOT IN (${placeholders})`,
      [projectId, ...targetIds]
    );

    await connection.commit();

    const [summaryRows] = await connection.query(
      `SELECT s.name, COUNT(t.id) AS tasks
       FROM task_sections s
       LEFT JOIN tasks t ON t.section_id = s.id
       WHERE s.project_id = ?
       GROUP BY s.id, s.name, s.position
       ORDER BY s.position ASC`,
      [projectId]
    );

    console.table(summaryRows);
    console.log(
      `Azur sections reclassified for ${projectId}: ${movedTasks} tasks moved, ${deleteResult.affectedRows} old sections deleted.`
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
