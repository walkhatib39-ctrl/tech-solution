import fs from "fs";
import { randomUUID } from "crypto";
import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import path from "path";
import {
  ManagedProject,
  ManagedTask,
  PROJECT_HEALTH_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  ProjectDocFile,
  ProjectDocFolder,
  ProjectTrackingField,
  ProjectUpdate,
  ProjectsData,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TRACKING_STATUSES,
  TaskSection,
} from "@/lib/projectsTypes";

const LEGACY_PROJECTS_FILE = path.join(process.cwd(), "data", "projects.json");

const DEFAULT_PROJECTS: ManagedProject[] = [
  {
    id: "project-bouldergain",
    name: "BoulderGain",
    type: "MARKETING",
    color: "#d9140e",
    status: "Actif",
    health: "Bon",
    progress: 0,
    nextAction: "",
    blockers: "",
    lastUpdate: "",
  },
  {
    id: "project-wecleaned",
    name: "WeCleaned",
    type: "DEV",
    color: "#39547c",
    status: "Actif",
    health: "Bon",
    progress: 0,
    nextAction: "",
    blockers: "",
    lastUpdate: "",
  },
  {
    id: "project-pvfs",
    name: "PVFS",
    type: "SEO",
    color: "#0f9f6e",
    status: "Actif",
    health: "Bon",
    progress: 0,
    nextAction: "",
    blockers: "",
    lastUpdate: "",
  },
  {
    id: "project-ftn",
    name: "FTN",
    type: "OPS",
    color: "#d97706",
    status: "En pause",
    health: "Attention",
    progress: 0,
    nextAction: "",
    blockers: "",
    lastUpdate: "",
  },
  {
    id: "project-maison216",
    name: "Maison216",
    type: "MEDIA",
    color: "#6d5dfc",
    status: "Actif",
    health: "Bon",
    progress: 0,
    nextAction: "",
    blockers: "",
    lastUpdate: "",
  },
];

const DEFAULT_DB_NAME = "techsolution";

let poolPromise: Promise<Pool> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getDbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || DEFAULT_DB_NAME,
  };
}

function assertSafeDatabaseName(database: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error("DB_NAME must contain only letters, numbers, and underscores");
  }
}

async function ensureDatabase() {
  const config = getDbConfig();
  assertSafeDatabaseName(config.database);

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    charset: "utf8mb4",
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

async function getPool() {
  if (!poolPromise) {
    poolPromise = ensureDatabase().then(() => {
      const config = getDbConfig();

      return mysql.createPool({
        ...config,
        charset: "utf8mb4",
        connectionLimit: 10,
        dateStrings: true,
        namedPlaceholders: true,
        waitForConnections: true,
      });
    });
  }

  return poolPromise;
}

function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function toNullableDate(value: string) {
  return value ? value : null;
}

function fromDate(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return "";
}

function isValidHexColor(color: unknown): color is string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
}

function normalizeProgress(progress: unknown) {
  const value = Number(progress);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeProject(project: Partial<ManagedProject>): ManagedProject | null {
  if (!project || typeof project.name !== "string" || !project.name.trim()) {
    return null;
  }

  const type = PROJECT_TYPES.includes(project.type ?? "AUTRE")
    ? project.type ?? "AUTRE"
    : "AUTRE";
  const status = PROJECT_STATUSES.includes(project.status ?? "Actif")
    ? project.status ?? "Actif"
    : "Actif";
  const health = PROJECT_HEALTH_STATUSES.includes(project.health ?? "Bon")
    ? project.health ?? "Bon"
    : "Bon";

  return {
    id:
      typeof project.id === "string" && project.id.trim()
        ? project.id.trim()
        : createId("project"),
    name: project.name.trim(),
    type,
    color: isValidHexColor(project.color) ? project.color : "#39547c",
    status,
    health,
    progress: normalizeProgress(project.progress),
    nextAction:
      typeof project.nextAction === "string" ? project.nextAction.trim() : "",
    blockers: typeof project.blockers === "string" ? project.blockers.trim() : "",
    lastUpdate: typeof project.lastUpdate === "string" ? project.lastUpdate : "",
  };
}

function normalizeTask(task: Partial<ManagedTask>): ManagedTask | null {
  if (
    !task ||
    typeof task.title !== "string" ||
    !task.title.trim() ||
    typeof task.projectId !== "string" ||
    !task.projectId.trim()
  ) {
    return null;
  }

  const status = TASK_STATUSES.includes(task.status ?? "À faire")
    ? task.status ?? "À faire"
    : "À faire";
  const priority = TASK_PRIORITIES.includes(task.priority ?? "Moyenne")
    ? task.priority ?? "Moyenne"
    : "Moyenne";

  return {
    id:
      typeof task.id === "string" && task.id.trim()
        ? task.id.trim()
        : createId("task"),
    title: task.title.trim(),
    projectId: task.projectId.trim(),
    sectionId:
      typeof task.sectionId === "string" && task.sectionId.trim()
        ? task.sectionId.trim()
        : null,
    status,
    priority,
    startDate: typeof task.startDate === "string" ? task.startDate : "",
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    note: typeof task.note === "string" ? task.note : "",
    responsible: typeof task.responsible === "string" ? task.responsible : "",
  };
}

function normalizeTaskSection(
  section: Partial<TaskSection>
): TaskSection | null {
  if (
    !section ||
    typeof section.name !== "string" ||
    !section.name.trim() ||
    typeof section.projectId !== "string" ||
    !section.projectId.trim()
  ) {
    return null;
  }

  return {
    id:
      typeof section.id === "string" && section.id.trim()
        ? section.id.trim()
        : createId("section"),
    projectId: section.projectId.trim(),
    name: section.name.trim(),
    color: isValidHexColor(section.color) ? section.color : "#39547c",
    position: Number.isFinite(Number(section.position))
      ? Number(section.position)
      : 0,
  };
}

function normalizeDocFolder(
  folder: Partial<ProjectDocFolder>
): ProjectDocFolder | null {
  if (
    !folder ||
    typeof folder.name !== "string" ||
    !folder.name.trim() ||
    typeof folder.projectId !== "string" ||
    !folder.projectId.trim()
  ) {
    return null;
  }

  return {
    id:
      typeof folder.id === "string" && folder.id.trim()
        ? folder.id.trim()
        : createId("folder"),
    projectId: folder.projectId.trim(),
    name: folder.name.trim(),
    parentId:
      typeof folder.parentId === "string" && folder.parentId.trim()
        ? folder.parentId.trim()
        : null,
  };
}

function normalizeDocFile(file: Partial<ProjectDocFile>): ProjectDocFile | null {
  if (
    !file ||
    typeof file.title !== "string" ||
    !file.title.trim() ||
    typeof file.projectId !== "string" ||
    !file.projectId.trim()
  ) {
    return null;
  }

  return {
    id:
      typeof file.id === "string" && file.id.trim()
        ? file.id.trim()
        : createId("doc"),
    projectId: file.projectId.trim(),
    folderId:
      typeof file.folderId === "string" && file.folderId.trim()
        ? file.folderId.trim()
        : null,
    title: file.title.trim(),
    contentMarkdown:
      typeof file.contentMarkdown === "string" ? file.contentMarkdown : "",
    updatedAt:
      typeof file.updatedAt === "string" && file.updatedAt
        ? file.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeTrackingField(
  field: Partial<ProjectTrackingField>
): ProjectTrackingField | null {
  if (
    !field ||
    typeof field.label !== "string" ||
    !field.label.trim() ||
    typeof field.projectId !== "string" ||
    !field.projectId.trim()
  ) {
    return null;
  }

  const status = TRACKING_STATUSES.includes(field.status ?? "En cours")
    ? field.status ?? "En cours"
    : "En cours";

  return {
    id:
      typeof field.id === "string" && field.id.trim()
        ? field.id.trim()
        : createId("metric"),
    projectId: field.projectId.trim(),
    label: field.label.trim(),
    value: typeof field.value === "string" ? field.value : "",
    target: typeof field.target === "string" ? field.target : "",
    unit: typeof field.unit === "string" ? field.unit : "",
    status,
    note: typeof field.note === "string" ? field.note : "",
    position: Number.isFinite(Number(field.position))
      ? Number(field.position)
      : 0,
  };
}

function normalizeProjectUpdate(
  update: Partial<ProjectUpdate>
): ProjectUpdate | null {
  if (
    !update ||
    typeof update.title !== "string" ||
    !update.title.trim() ||
    typeof update.projectId !== "string" ||
    !update.projectId.trim()
  ) {
    return null;
  }

  return {
    id:
      typeof update.id === "string" && update.id.trim()
        ? update.id.trim()
        : createId("update"),
    projectId: update.projectId.trim(),
    date: typeof update.date === "string" && update.date ? update.date : "",
    title: update.title.trim(),
    note: typeof update.note === "string" ? update.note : "",
  };
}

function getDefaultTrackingFields(project: ManagedProject): ProjectTrackingField[] {
  const now = Date.now();
  const templates: Record<string, Array<[string, string]>> = {
    SEO: [
      ["Trafic organique", "sessions"],
      ["Mots-clés Top 10", "mots-clés"],
      ["Pages indexées", "pages"],
      ["Backlinks", "liens"],
    ],
    DEV: [
      ["Fonctionnalités livrées", "items"],
      ["Bugs ouverts", "bugs"],
      ["Bugs corrigés", "bugs"],
      ["Version publiée", ""],
    ],
    MARKETING: [
      ["Leads", "leads"],
      ["Budget dépensé", ""],
      ["Campagnes actives", "campagnes"],
      ["ROAS", ""],
    ],
    MEDIA: [
      ["Contenus publiés", "contenus"],
      ["Portée", "vues"],
      ["Engagement", "%"],
      ["Créatifs validés", "items"],
    ],
    EVENTS: [
      ["Participants attendus", "personnes"],
      ["Invitations envoyées", "invitations"],
      ["Prestataires confirmés", "prestataires"],
      ["Budget engagé", ""],
    ],
    OPS: [
      ["Process documentés", "process"],
      ["Actions ouvertes", "actions"],
      ["Incidents", "incidents"],
      ["SLA", "%"],
    ],
    AUTRE: [
      ["Objectif principal", ""],
      ["Résultat actuel", ""],
      ["Avancement réel", "%"],
    ],
  };

  return (templates[project.type] ?? templates.AUTRE).map(
    ([label, unit], index) => ({
      id: `metric-${project.id}-${index}-${now}`,
      projectId: project.id,
      label,
      value: "",
      target: "",
      unit,
      status: "En cours",
      note: "",
      position: index,
    })
  );
}

function normalizeProjectsData(input: Partial<ProjectsData>): ProjectsData {
  const projects = Array.isArray(input.projects)
    ? input.projects
        .map((project) => normalizeProject(project))
        .filter((project): project is ManagedProject => Boolean(project))
    : [];
  const projectIds = new Set(projects.map((project) => project.id));

  const taskSections = Array.isArray(input.taskSections)
    ? input.taskSections
        .map((section) => normalizeTaskSection(section))
        .filter((section): section is TaskSection =>
          Boolean(section && projectIds.has(section.projectId))
        )
    : [];
  const taskSectionIds = new Set(taskSections.map((section) => section.id));

  const tasks = Array.isArray(input.tasks)
    ? input.tasks
        .map((task) => normalizeTask(task))
        .filter((task): task is ManagedTask =>
          Boolean(task && projectIds.has(task.projectId))
        )
        .map((task) => ({
          ...task,
          sectionId:
            task.sectionId && taskSectionIds.has(task.sectionId)
              ? task.sectionId
              : null,
        }))
    : [];
  const docFolders = Array.isArray(input.docFolders)
    ? input.docFolders
        .map((folder) => normalizeDocFolder(folder))
        .filter((folder): folder is ProjectDocFolder =>
          Boolean(folder && projectIds.has(folder.projectId))
        )
    : [];
  const folderIds = new Set(docFolders.map((folder) => folder.id));
  const docFiles = Array.isArray(input.docFiles)
    ? input.docFiles
        .map((file) => normalizeDocFile(file))
        .filter((file): file is ProjectDocFile =>
          Boolean(
            file &&
              projectIds.has(file.projectId) &&
              (!file.folderId || folderIds.has(file.folderId))
          )
        )
    : [];
  const trackingFields = Array.isArray(input.trackingFields)
    ? input.trackingFields
        .map((field) => normalizeTrackingField(field))
        .filter((field): field is ProjectTrackingField =>
          Boolean(field && projectIds.has(field.projectId))
        )
    : [];
  const updates = Array.isArray(input.updates)
    ? input.updates
        .map((update) => normalizeProjectUpdate(update))
        .filter((update): update is ProjectUpdate =>
          Boolean(update && projectIds.has(update.projectId))
        )
    : [];

  return {
    projects,
    taskSections,
    tasks,
    docFolders,
    docFiles,
    trackingFields,
    updates,
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt
        ? input.updatedAt
        : new Date().toISOString(),
  };
}

function readLegacySeed(): ProjectsData {
  if (fs.existsSync(LEGACY_PROJECTS_FILE)) {
    const parsed = JSON.parse(
      fs.readFileSync(LEGACY_PROJECTS_FILE, "utf-8")
    ) as Partial<ProjectsData>;
    return normalizeProjectsData(parsed);
  }

  return normalizeProjectsData({
    projects: DEFAULT_PROJECTS,
    taskSections: [],
    tasks: [],
    docFolders: [],
    docFiles: [],
    trackingFields: [],
    updates: [],
  });
}

async function ensureProjectsSchema() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const pool = await getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        type VARCHAR(40) NOT NULL,
        color VARCHAR(20) NOT NULL,
        status VARCHAR(40) NOT NULL,
        health VARCHAR(40) NOT NULL DEFAULT 'Bon',
        progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
        next_action TEXT NULL,
        blockers TEXT NULL,
        last_update DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_sections (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        name VARCHAR(190) NOT NULL,
        color VARCHAR(20) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_sections_project (project_id),
        CONSTRAINT fk_task_sections_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        section_id VARCHAR(120) NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(40) NOT NULL,
        priority VARCHAR(40) NOT NULL,
        start_date DATE NULL,
        due_date DATE NULL,
        note TEXT NULL,
        responsible VARCHAR(190) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tasks_project (project_id),
        INDEX idx_tasks_section (section_id),
        CONSTRAINT fk_tasks_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [taskSectionColumnRows] = await pool.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'tasks'
         AND COLUMN_NAME = 'section_id'`
    );

    if (taskSectionColumnRows.length === 0) {
      await pool.query(`
        ALTER TABLE tasks
          ADD COLUMN section_id VARCHAR(120) NULL AFTER project_id,
          ADD INDEX idx_tasks_section (section_id)
      `);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_doc_folders (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        name VARCHAR(190) NOT NULL,
        parent_id VARCHAR(120) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_doc_folders_project (project_id),
        CONSTRAINT fk_doc_folders_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_doc_files (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        folder_id VARCHAR(120) NULL,
        title VARCHAR(190) NOT NULL,
        content_markdown MEDIUMTEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_doc_files_project (project_id),
        INDEX idx_doc_files_folder (folder_id),
        CONSTRAINT fk_doc_files_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_tracking_fields (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        label VARCHAR(190) NOT NULL,
        value_text VARCHAR(190) NULL,
        target_text VARCHAR(190) NULL,
        unit VARCHAR(60) NULL,
        status VARCHAR(40) NOT NULL,
        note TEXT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tracking_fields_project (project_id),
        CONSTRAINT fk_tracking_fields_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_updates (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        update_date DATE NULL,
        title VARCHAR(190) NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project_updates_project (project_id),
        CONSTRAINT fk_project_updates_project
          FOREIGN KEY (project_id) REFERENCES projects(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM projects"
    );

    if (Number(rows[0]?.count ?? 0) === 0) {
      const seedData = readLegacySeed();
      seedData.trackingFields =
        seedData.trackingFields.length > 0
          ? seedData.trackingFields
          : seedData.projects.flatMap(getDefaultTrackingFields);
      await saveProjectsDataWithoutSchema(seedData, pool);
    }
  })();

  return schemaReadyPromise;
}

async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveProjectsDataWithoutSchema(
  input: Partial<ProjectsData>,
  queryable: Pool | PoolConnection
): Promise<ProjectsData> {
  const data = normalizeProjectsData({
    docFiles: [],
    docFolders: [],
    taskSections: [],
    trackingFields: [],
    updates: [],
    ...input,
    updatedAt: new Date().toISOString(),
  });

  await queryable.query("DELETE FROM project_updates");
  await queryable.query("DELETE FROM project_tracking_fields");
  await queryable.query("DELETE FROM project_doc_files");
  await queryable.query("DELETE FROM project_doc_folders");
  await queryable.query("DELETE FROM tasks");
  await queryable.query("DELETE FROM task_sections");
  await queryable.query("DELETE FROM projects");

  for (const project of data.projects) {
    await queryable.execute(
      `INSERT INTO projects
        (id, name, type, color, status, health, progress, next_action, blockers, last_update)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.name,
        project.type,
        project.color,
        project.status,
        project.health,
        project.progress,
        project.nextAction,
        project.blockers,
        toNullableDate(project.lastUpdate),
      ]
    );
  }

  for (const section of data.taskSections) {
    await queryable.execute(
      `INSERT INTO task_sections (id, project_id, name, color, position)
       VALUES (?, ?, ?, ?, ?)`,
      [
        section.id,
        section.projectId,
        section.name,
        section.color,
        section.position,
      ]
    );
  }

  for (const task of data.tasks) {
    await queryable.execute(
      `INSERT INTO tasks
        (id, project_id, section_id, title, status, priority, start_date, due_date, note, responsible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.projectId,
        task.sectionId,
        task.title,
        task.status,
        task.priority,
        toNullableDate(task.startDate),
        toNullableDate(task.dueDate),
        task.note,
        task.responsible,
      ]
    );
  }

  for (const folder of data.docFolders) {
    await queryable.execute(
      `INSERT INTO project_doc_folders (id, project_id, name, parent_id)
       VALUES (?, ?, ?, ?)`,
      [folder.id, folder.projectId, folder.name, folder.parentId]
    );
  }

  for (const file of data.docFiles) {
    await queryable.execute(
      `INSERT INTO project_doc_files
        (id, project_id, folder_id, title, content_markdown)
       VALUES (?, ?, ?, ?, ?)`,
      [
        file.id,
        file.projectId,
        file.folderId,
        file.title,
        file.contentMarkdown,
      ]
    );
  }

  for (const field of data.trackingFields) {
    await queryable.execute(
      `INSERT INTO project_tracking_fields
        (id, project_id, label, value_text, target_text, unit, status, note, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        field.id,
        field.projectId,
        field.label,
        field.value,
        field.target,
        field.unit,
        field.status,
        field.note,
        field.position,
      ]
    );
  }

  for (const update of data.updates) {
    await queryable.execute(
      `INSERT INTO project_updates (id, project_id, update_date, title, note)
       VALUES (?, ?, ?, ?, ?)`,
      [
        update.id,
        update.projectId,
        toNullableDate(update.date),
        update.title,
        update.note,
      ]
    );
  }

  return data;
}

export async function getProjectsData(): Promise<ProjectsData> {
  await ensureProjectsSchema();
  const pool = await getPool();

  const [projectRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id, name, type, color, status, health, progress,
      next_action AS nextAction,
      blockers,
      last_update AS lastUpdate,
      updated_at AS updatedAt
     FROM projects
     ORDER BY created_at ASC, name ASC`
  );
  const [taskSectionRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id,
      project_id AS projectId,
      name,
      color,
      position
     FROM task_sections
     ORDER BY position ASC, created_at ASC`
  );
  const [taskRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id,
      project_id AS projectId,
      section_id AS sectionId,
      title,
      status,
      priority,
      start_date AS startDate,
      due_date AS dueDate,
      note,
      responsible
     FROM tasks
     ORDER BY created_at ASC`
  );
  const [folderRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, project_id AS projectId, name, parent_id AS parentId
     FROM project_doc_folders
     ORDER BY created_at ASC, name ASC`
  );
  const [fileRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id,
      project_id AS projectId,
      folder_id AS folderId,
      title,
      content_markdown AS contentMarkdown,
      updated_at AS updatedAt
     FROM project_doc_files
     ORDER BY updated_at DESC`
  );
  const [fieldRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id,
      project_id AS projectId,
      label,
      value_text AS value,
      target_text AS target,
      unit,
      status,
      note,
      position
     FROM project_tracking_fields
     ORDER BY position ASC, created_at ASC`
  );
  const [updateRows] = await pool.query<RowDataPacket[]>(
    `SELECT
      id,
      project_id AS projectId,
      update_date AS date,
      title,
      note
     FROM project_updates
     ORDER BY update_date DESC, created_at DESC`
  );

  const data = normalizeProjectsData({
    projects: projectRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: row.type,
      color: String(row.color),
      status: row.status,
      health: row.health,
      progress: Number(row.progress ?? 0),
      nextAction: String(row.nextAction ?? ""),
      blockers: String(row.blockers ?? ""),
      lastUpdate: fromDate(row.lastUpdate),
    })),
    taskSections: taskSectionRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      name: String(row.name),
      color: String(row.color),
      position: Number(row.position ?? 0),
    })),
    tasks: taskRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      sectionId: row.sectionId ? String(row.sectionId) : null,
      title: String(row.title),
      status: row.status,
      priority: row.priority,
      startDate: fromDate(row.startDate),
      dueDate: fromDate(row.dueDate),
      note: String(row.note ?? ""),
      responsible: String(row.responsible ?? ""),
    })),
    docFolders: folderRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      name: String(row.name),
      parentId: row.parentId ? String(row.parentId) : null,
    })),
    docFiles: fileRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      folderId: row.folderId ? String(row.folderId) : null,
      title: String(row.title),
      contentMarkdown: String(row.contentMarkdown ?? ""),
      updatedAt:
        typeof row.updatedAt === "string"
          ? row.updatedAt
          : new Date().toISOString(),
    })),
    trackingFields: fieldRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      label: String(row.label),
      value: String(row.value ?? ""),
      target: String(row.target ?? ""),
      unit: String(row.unit ?? ""),
      status: row.status,
      note: String(row.note ?? ""),
      position: Number(row.position ?? 0),
    })),
    updates: updateRows.map((row) => ({
      id: String(row.id),
      projectId: String(row.projectId),
      date: fromDate(row.date),
      title: String(row.title),
      note: String(row.note ?? ""),
    })),
    updatedAt: new Date().toISOString(),
  });

  return data;
}

export async function saveProjectsData(
  input: Partial<ProjectsData>
): Promise<ProjectsData> {
  await ensureProjectsSchema();

  await withTransaction((connection) =>
    saveProjectsDataWithoutSchema(input, connection)
  );

  return getProjectsData();
}
