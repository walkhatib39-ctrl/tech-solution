export const PROJECT_TYPES = [
  "SEO",
  "DEV",
  "MARKETING",
  "OPS",
  "MEDIA",
  "EVENTS",
  "AUTRE",
] as const;

export const PROJECT_STATUSES = ["Actif", "En pause", "Terminé"] as const;

export const TASK_STATUSES = [
  "À faire",
  "En cours",
  "Bloqué",
  "Terminé",
] as const;

export const TASK_PRIORITIES = ["Basse", "Moyenne", "Haute"] as const;

export const PROJECT_HEALTH_STATUSES = ["Bon", "Attention", "Critique"] as const;

export const TRACKING_STATUSES = [
  "Bon",
  "Attention",
  "Critique",
  "En cours",
] as const;

export const INTERVENTION_STATUSES = [
  "Prévue",
  "Réalisée",
  "Reportée",
  "Annulée",
] as const;

export const PROJECT_USER_ROLES = ["super_admin", "member"] as const;
export const PROJECT_DOC_SOURCE_TYPES = ["markdown", "upload"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type ProjectHealthStatus = (typeof PROJECT_HEALTH_STATUSES)[number];
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];
export type ProjectUserRole = (typeof PROJECT_USER_ROLES)[number];
export type ProjectDocSourceType = (typeof PROJECT_DOC_SOURCE_TYPES)[number];

export interface ManagedProject {
  id: string;
  name: string;
  type: ProjectType;
  color: string;
  status: ProjectStatus;
  health: ProjectHealthStatus;
  progress: number;
  nextAction: string;
  blockers: string;
  lastUpdate: string;
}

export interface ManagedTask {
  id: string;
  title: string;
  projectId: string;
  sectionId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  note: string;
  responsible: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  statusChangedAt: string;
  statusChangedBy: string;
  completedAt: string;
  completedBy: string;
  attachments: TaskAttachment[];
}

export interface TaskAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface TaskSection {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
}

export interface ProjectDocFolder {
  id: string;
  projectId: string;
  name: string;
  parentId: string | null;
}

export interface ProjectDocFile {
  id: string;
  projectId: string;
  folderId: string | null;
  title: string;
  sourceType: ProjectDocSourceType;
  contentMarkdown: string;
  assetPath: string;
  mimeType: string;
  size: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ProjectTrackingField {
  id: string;
  projectId: string;
  label: string;
  value: string;
  target: string;
  unit: string;
  status: TrackingStatus;
  note: string;
  position: number;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  date: string;
  title: string;
  note: string;
}

export interface ProjectIntervention {
  id: string;
  projectId: string;
  interventionDate: string;
  interventionTime: string;
  department: string;
  address: string;
  city: string;
  prestation: string;
  price: number;
  status: InterventionStatus;
  reportDate: string;
  cancellationReason: string;
  photoPaths: string[];
  note: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  statusChangedAt: string;
  statusChangedBy: string;
}

export interface ProjectTeamUser {
  id: string;
  name: string;
  email: string;
  role: ProjectUserRole;
  isActive: boolean;
  password?: string;
}

export interface ProjectAccess {
  userId: string;
  projectId: string;
}

export interface ProjectActivityLog {
  id: string;
  projectId: string;
  entityType: "task" | "intervention" | "doc";
  entityId: string;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "status_changed"
    | "assigned"
    | "unassigned";
  actorUserId: string;
  actorName: string;
  message: string;
  occurredAt: string;
  meta: Record<string, unknown>;
}

export interface CurrentProjectUser {
  id: string;
  name: string;
  email: string;
  role: ProjectUserRole;
  isActive: boolean;
}

export interface ProjectsData {
  projects: ManagedProject[];
  taskSections: TaskSection[];
  tasks: ManagedTask[];
  docFolders: ProjectDocFolder[];
  docFiles: ProjectDocFile[];
  trackingFields: ProjectTrackingField[];
  updates: ProjectUpdate[];
  interventions: ProjectIntervention[];
  teamUsers: ProjectTeamUser[];
  projectAccess: ProjectAccess[];
  activityLogs: ProjectActivityLog[];
  updatedAt: string;
}
