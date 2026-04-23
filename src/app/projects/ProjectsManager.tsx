"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Columns3,
  Eye,
  Download,
  FileText,
  Filter,
  Folder,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  Loader2,
  LogOut,
  Mail,
  Menu,
  House,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  CurrentProjectUser,
  INTERVENTION_STATUSES,
  InterventionStatus,
  ManagedProject,
  ManagedTask,
  ProjectActivityLog,
  ProjectDocFile,
  ProjectDocFolder,
  ProjectIntervention,
  ProjectTrackingField,
  ProjectTeamUser,
  ProjectUpdate,
  ProjectsData,
  TaskAttachment,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TRACKING_STATUSES,
  TaskPriority,
  TaskSection,
  TaskStatus,
  TrackingStatus,
} from "@/lib/projectsTypes";

// ─── Types ──────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";
type StatusFilter = TaskStatus | "Tous";
type ResponsibleFilter = string | "Tous";
type ProjectTab = "Pilotage" | "Tâches" | "Docs" | "Interventions" | "Suivi";
type WorkspaceView = "home" | "project" | "team";
type ProjectStats = { blocked: number; done: number; overdue: number; progress: number; total: number };
type TaskSectionGroup = { id: string | null; color: string; name: string; tasks: ManagedTask[] };
type InterventionDraft = Omit<ProjectIntervention, "id">;
type PendingTaskFile = { file: File; id: string; previewUrl: string | null };
type PersistedWorkspaceState = {
  activeTab: ProjectTab;
  interventionMode: "edit" | "list" | "preview";
  interventionTargetId: string;
  selectedDocFileId: string;
  selectedProjectId: string;
  taskMode: "edit" | "list" | "preview";
  taskTargetId: string;
  workspaceView: WorkspaceView;
};

const EMPTY_DATA: ProjectsData = {
  projects: [], taskSections: [], tasks: [], docFolders: [], docFiles: [],
  trackingFields: [], updates: [], interventions: [], teamUsers: [], projectAccess: [], activityLogs: [], updatedAt: "",
};

// ─── Style maps ─────────────────────────────────────────────────────────────

const PRIORITY_META: Record<TaskPriority, { cls: string; dot: string }> = {
  Basse:   { cls: "bg-[#dcfce7] text-[#166534]", dot: "bg-[#16a34a]" },
  Moyenne: { cls: "bg-[#fef3c7] text-[#92400e]", dot: "bg-[#d97706]" },
  Haute:   { cls: "bg-[#fee2e2] text-[#991b1b]", dot: "bg-[#dc2626]" },
};

const STATUS_META: Record<TaskStatus, { badge: string; bar: string; dot: string }> = {
  "À faire": { badge: "bg-[#ede9e3] text-[#5a6a7e]",   bar: "bg-[#cfc7bc]", dot: "bg-[#5a6a7e]" },
  "En cours":{ badge: "bg-[#eff6ff] text-[#1d4ed8]",   bar: "bg-[#2563eb]", dot: "bg-[#2563eb]" },
  "Bloqué":  { badge: "bg-[#fef2f2] text-[#dc2626]",   bar: "bg-[#dc2626]", dot: "bg-[#dc2626]" },
  "Terminé": { badge: "bg-[#f0fdf4] text-[#15803d]",   bar: "bg-[#16a34a]", dot: "bg-[#16a34a]" },
};

const STATUS_BADGE_STYLE: Record<TaskStatus, { backgroundColor: string; color: string }> = {
  "À faire": { backgroundColor: "#ede9e3", color: "#5a6a7e" },
  "En cours": { backgroundColor: "#eff6ff", color: "#1d4ed8" },
  Bloqué: { backgroundColor: "#fef2f2", color: "#dc2626" },
  Terminé: { backgroundColor: "#f0fdf4", color: "#15803d" },
};

const HEALTH_META: Record<ManagedProject["health"], { cls: string; dot: string }> = {
  Bon:      { cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  Attention:{ cls: "bg-amber-50 text-amber-700",     dot: "bg-amber-400"   },
  Critique: { cls: "bg-red-50 text-red-600",         dot: "bg-red-400"     },
};

const TRACKING_META: Record<TrackingStatus, { cls: string; bar: string }> = {
  Bon:      { cls: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-400" },
  Attention:{ cls: "bg-amber-50 text-amber-700",     bar: "bg-amber-400"   },
  Critique: { cls: "bg-red-50 text-red-600",         bar: "bg-red-400"     },
  "En cours":{ cls:"bg-sky-50 text-sky-700",         bar: "bg-sky-400"     },
};

const INTERVENTION_META: Record<InterventionStatus, { cls: string; dot: string }> = {
  Prévue:      { cls: "bg-[#ede9e3] text-[#5a6a7e]", dot: "bg-[#5a6a7e]" },
  Réalisée:    { cls: "bg-[#f0fdf4] text-[#15803d]", dot: "bg-[#16a34a]" },
  Reportée:    { cls: "bg-[#fef3c7] text-[#92400e]", dot: "bg-[#d97706]" },
  Annulée:     { cls: "bg-[#fef2f2] text-[#dc2626]", dot: "bg-[#dc2626]" },
};

const PROJECT_TABS: Array<{ label: ProjectTab; icon: React.ElementType; shortLabel?: string }> = [
  { label: "Pilotage",      icon: SlidersHorizontal },
  { label: "Tâches",        icon: Columns3          },
  { label: "Docs",          icon: BookOpen          },
  { label: "Interventions", icon: Calendar, shortLabel: "Interv." },
  { label: "Suivi",         icon: BarChart3         },
];

const PROJECT_BASE_TABS: ProjectTab[] = ["Pilotage", "Tâches", "Docs"];
const WE_CLEANED_PROJECT_ID = "project-wecleaned";
const WORKSPACE_SESSION_KEY = "techsolution-projects-workspace";

const SECTION_COLORS = ["#d9140e", "#39547c", "#0f9f6e", "#d97706", "#6d5dfc", "#0891b2", "#be123c"];
const PROJECT_TITLE_STYLE = { fontSize: "clamp(1rem, 0.92rem + 0.55vw, 1.35rem)", letterSpacing: 0 };
const TASK_PANEL_TITLE_STYLE = { fontSize: "13px", letterSpacing: 0, lineHeight: 1.2 };

// ─── Utility functions ───────────────────────────────────────────────────────

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isOverdue(task: ManagedTask) {
  if (!task.dueDate || task.status === "Terminé") return false;
  return new Date(`${task.dueDate}T23:59:59`).getTime() < Date.now();
}

function getTaskTimeValue(task: ManagedTask) {
  const d = task.dueDate || task.startDate;
  return d ? new Date(`${d}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function getPriorityWeight(p: TaskPriority) {
  return { Haute: 0, Moyenne: 1, Basse: 2 }[p];
}

function buildBlankTask(projectId: string): Omit<ManagedTask, "id"> {
  return { title: "", projectId, status: "À faire", priority: "Moyenne",
           sectionId: null, startDate: "", dueDate: "", note: "", responsible: "",
           createdAt: "", createdBy: "", updatedAt: "", updatedBy: "",
           statusChangedAt: "", statusChangedBy: "", completedAt: "", completedBy: "",
           attachments: [] };
}

function buildBlankIntervention(projectId: string): Omit<ProjectIntervention, "id"> {
  return {
    projectId,
    interventionDate: new Date().toISOString().slice(0, 10),
    interventionTime: "",
    department: "",
    address: "",
    city: "",
    prestation: "",
    price: 0,
    status: "Prévue",
    reportDate: "",
    cancellationReason: "",
    photoPaths: [],
    note: "",
    createdAt: "",
    createdBy: "",
    updatedAt: "",
    updatedBy: "",
    statusChangedAt: "",
    statusChangedBy: "",
  };
}

function parsePrice(value: string) {
  const normalized = value.replace(",", ".").trim();
  const price = Number(normalized);
  return Number.isFinite(price) ? Math.max(0, Math.round(price * 100) / 100) : 0;
}

function isImageAttachmentMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFilePreviewDataUrl(file: File) {
  if (!isImageAttachmentMimeType(file.type)) {
    return Promise.resolve<string | null>(null);
  }

  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatInterventionDateTime(intervention: ProjectIntervention) {
  return [
    intervention.interventionDate || "Date non définie",
    intervention.interventionTime || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getUserInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "TS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatTaskShortDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
  return formatted.replace(/\.$/, "").replace(/^(\d+\s+)(\p{L})/u, (_, prefix, firstLetter) => `${prefix}${String(firstLetter).toUpperCase()}`);
}

function parseProjectDate(value: string) {
  if (!value) return null;
  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value.includes(" ") && !value.includes("T")
        ? value.replace(" ", "T")
        : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTaskLongDate(value: string) {
  const date = parseProjectDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatProjectDateTime(value: string) {
  const date = parseProjectDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTaskDateRange(task: ManagedTask) {
  const start = formatTaskShortDate(task.startDate);
  const due = formatTaskShortDate(task.dueDate);
  if (start && due) return `${start} — ${due}`;
  return due || start || "Dates à préciser";
}

function applyInterventionStatus(
  draft: InterventionDraft,
  status: InterventionStatus
): InterventionDraft {
  return {
    ...draft,
    status,
    photoPaths: status === "Réalisée" ? draft.photoPaths : [],
    reportDate: status === "Reportée" ? draft.reportDate : "",
    cancellationReason:
      status === "Annulée" ? draft.cancellationReason : "",
  };
}

function sanitizeInterventionDraft(
  draft: InterventionDraft
): InterventionDraft {
  const next = {
    ...draft,
    interventionDate: draft.interventionDate,
    interventionTime: draft.interventionTime,
    department: draft.department.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    prestation: draft.prestation.trim(),
    price: parsePrice(String(draft.price ?? "")),
    note: draft.note.trim(),
    reportDate: draft.reportDate,
    cancellationReason: draft.cancellationReason.trim(),
    photoPaths: draft.photoPaths.filter(Boolean),
  };

  return applyInterventionStatus(next, next.status);
}

function validateInterventionDraft(value: InterventionDraft) {
  if (!value.interventionDate) return "La date d’intervention est obligatoire.";
  if (!value.interventionTime) return "L’heure est obligatoire.";
  if (!value.department) return "Le département est obligatoire.";
  if (!value.address) return "L’adresse est obligatoire.";
  if (!value.city) return "La ville est obligatoire.";
  if (!value.prestation) return "La prestation est obligatoire.";
  if (value.price <= 0) return "Le prix doit être supérieur à 0.";
  if (value.status === "Réalisée" && value.photoPaths.length === 0) {
    return "Ajoutez au moins une photo pour une intervention réalisée.";
  }
  if (value.status === "Reportée" && !value.reportDate) {
    return "Renseignez la nouvelle date pour une intervention reportée.";
  }
  if (value.status === "Annulée" && !value.cancellationReason) {
    return "Renseignez la cause d’annulation.";
  }
  return "";
}

function buildTrackingTemplate(project: ManagedProject): ProjectTrackingField[] {
  const templates: Record<string, Array<[string, string]>> = {
    SEO:       [["Trafic organique","sessions"],["Mots-clés Top 10","mots-clés"],["Pages indexées","pages"],["Backlinks","liens"]],
    DEV:       [["Fonctionnalités livrées","items"],["Bugs ouverts","bugs"],["Bugs corrigés","bugs"],["Version publiée",""]],
    MARKETING: [["Leads","leads"],["Budget dépensé",""],["Campagnes actives","campagnes"],["ROAS",""]],
    MEDIA:     [["Contenus publiés","contenus"],["Portée","vues"],["Engagement","%"],["Créatifs validés","items"]],
    EVENTS:    [["Participants attendus","personnes"],["Invitations envoyées","invitations"],["Prestataires confirmés","prestataires"],["Budget engagé",""]],
    OPS:       [["Process documentés","process"],["Actions ouvertes","actions"],["Incidents","incidents"],["SLA","%"]],
    AUTRE:     [["Objectif principal",""],["Résultat actuel",""],["Avancement réel","%"]],
  };
  return (templates[project.type] ?? templates.AUTRE).map(([label, unit], position) => ({
    id: createId("metric"), projectId: project.id, label, value: "", target: "",
    unit, status: "En cours" as TrackingStatus, note: "", position,
  }));
}

function getEnabledProjectTabs(projectId?: string) {
  if (projectId === WE_CLEANED_PROJECT_ID) {
    return PROJECT_TABS.filter(
      (tab) =>
        tab.label === "Pilotage" ||
        tab.label === "Tâches" ||
        tab.label === "Docs" ||
        tab.label === "Interventions"
    );
  }

  return PROJECT_TABS.filter((tab) => PROJECT_BASE_TABS.includes(tab.label));
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ProjectsManagerProps {
  currentUser: CurrentProjectUser;
  logoutAction: () => Promise<void>;
}
interface ProjectFormState { name: string; color: string }

export default function ProjectsManager({ currentUser: initialUser, logoutAction }: ProjectsManagerProps) {
  const [data, setData] = useState<ProjectsData>(EMPTY_DATA);
  const [currentUser, setCurrentUser] = useState<CurrentProjectUser>(initialUser);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>("Pilotage");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>("Tous");
  const [taskSectionName, setTaskSectionName] = useState("");
  const [selectedDocFileId, setSelectedDocFileId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagedTask | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState("");
  const [isInterventionEditorOpen, setIsInterventionEditorOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<ProjectIntervention | null>(null);
  const [previewInterventionId, setPreviewInterventionId] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ name: "", color: "#1e3a5f" });
  const [isProjectRenameOpen, setIsProjectRenameOpen] = useState(false);
  const [projectRenameDraft, setProjectRenameDraft] = useState("");
  const [isProjectDeleteConfirmOpen, setIsProjectDeleteConfirmOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didRestoreWorkspaceRef = useRef(false);
  const skipProjectResetRef = useRef(false);
  const isSuperAdmin = currentUser.role === "super_admin";

  const persistData = useCallback((nextData: ProjectsData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/projects", {
          body: JSON.stringify(nextData), cache: "no-store",
          headers: { "Content-Type": "application/json" }, method: "PUT",
        });
        if (r.status === 401) { window.location.reload(); return; }
        if (!r.ok) throw new Error("Save failed");
        const p = (await r.json()) as { currentUser?: CurrentProjectUser; data?: ProjectsData; success: boolean };
        if (p.currentUser) setCurrentUser(p.currentUser);
        if (p.data) setData(p.data);
        setSaveState("saved");
      } catch (e) { console.error(e); setSaveState("error"); }
    }, 450);
  }, []);

  const updateData = useCallback((updater: (c: ProjectsData) => ProjectsData) => {
    setData((current) => {
      const next = { ...updater(current), updatedAt: new Date().toISOString() };
      persistData(next);
      return next;
    });
  }, [persistData]);

  const loadData = useCallback(async () => {
    setIsLoading(true); setLoadError("");
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      if (r.status === 401) { window.location.reload(); return; }
      if (!r.ok) throw new Error("Load failed");
      const p = (await r.json()) as { currentUser: CurrentProjectUser; data: ProjectsData; success: boolean };
      setData(p.data);
      setCurrentUser(p.currentUser);
      setSaveState("saved");
    } catch (e) { console.error(e); setLoadError("Impossible de charger les projets."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    void loadData();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [loadData]);

  useEffect(() => {
    if (!didRestoreWorkspaceRef.current) return;
    if (!data.projects.some((p) => p.id === selectedProjectId))
      setSelectedProjectId(data.projects[0]?.id ?? "");
  }, [data.projects, selectedProjectId]);

  useEffect(() => {
    if (!isSuperAdmin && workspaceView === "team") {
      setWorkspaceView("home");
    }
  }, [isSuperAdmin, workspaceView]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const selectedProject  = useMemo(() => data.projects.find((p) => p.id === selectedProjectId) ?? data.projects[0], [data.projects, selectedProjectId]);
  const projectTasks     = useMemo(() => !selectedProject ? [] : data.tasks.filter((t) => t.projectId === selectedProject.id), [data.tasks, selectedProject]);
  const projectSections  = useMemo(() => !selectedProject ? [] : data.taskSections.filter((s) => s.projectId === selectedProject.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)), [data.taskSections, selectedProject]);
  const projectFolders   = useMemo(() => !selectedProject ? [] : data.docFolders.filter((f) => f.projectId === selectedProject.id), [data.docFolders, selectedProject]);
  const projectFiles     = useMemo(() => !selectedProject ? [] : data.docFiles.filter((f) => f.projectId === selectedProject.id), [data.docFiles, selectedProject]);
  const selectedDocFile  = useMemo(() => projectFiles.find((f) => f.id === selectedDocFileId) ?? projectFiles[0], [selectedDocFileId, projectFiles]);
  const trackingFields   = useMemo(() => !selectedProject ? [] : data.trackingFields.filter((f) => f.projectId === selectedProject.id).sort((a, b) => a.position - b.position), [data.trackingFields, selectedProject]);
  const projectUpdates   = useMemo(() => !selectedProject ? [] : data.updates.filter((u) => u.projectId === selectedProject.id), [data.updates, selectedProject]);
  const projectInterventions = useMemo(() => !selectedProject ? [] : data.interventions.filter((intervention) => intervention.projectId === selectedProject.id), [data.interventions, selectedProject]);
  const projectActivityLogs = useMemo(
    () =>
      !selectedProject
        ? []
        : data.activityLogs
            .filter((log) => log.projectId === selectedProject.id)
            .sort(
              (a, b) =>
                new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
            ),
    [data.activityLogs, selectedProject]
  );
  const recentProjectActivityLogs = useMemo(
    () => projectActivityLogs.slice(0, 8),
    [projectActivityLogs]
  );
  const previewTask = useMemo(
    () => projectTasks.find((task) => task.id === previewTaskId) ?? null,
    [previewTaskId, projectTasks]
  );
  const previewIntervention = useMemo(
    () => projectInterventions.find((intervention) => intervention.id === previewInterventionId) ?? null,
    [previewInterventionId, projectInterventions]
  );
  const projectMemberNames = useMemo(() => {
    if (!selectedProject) return [];

    const names = data.teamUsers
      .filter(
        (user) =>
          user.isActive &&
          data.projectAccess.some((access) => access.userId === user.id && access.projectId === selectedProject.id)
      )
      .map((user) => user.name.trim())
      .filter(Boolean);

    if (currentUser.role === "super_admin" && currentUser.isActive && currentUser.name.trim()) {
      names.push(currentUser.name.trim());
    }

    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [currentUser, data.projectAccess, data.teamUsers, selectedProject]);
  const enabledProjectTabs = useMemo(
    () => getEnabledProjectTabs(selectedProject?.id),
    [selectedProject?.id]
  );
  const shouldHideProjectStats =
    activeTab === "Docs" ||
    (activeTab === "Tâches" && (isTaskEditorOpen || previewTask !== null)) ||
    (activeTab === "Interventions" && (isInterventionEditorOpen || previewIntervention !== null));

  const responsibleOptions = useMemo(() =>
    Array.from(new Set(projectTasks.map((t) => t.responsible.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [projectTasks]);

  const visibleTasks = useMemo(() =>
    projectTasks.filter((t) =>
      (statusFilter === "Tous" || t.status === statusFilter) &&
      (responsibleFilter === "Tous" || t.responsible.trim() === responsibleFilter)),
    [responsibleFilter, projectTasks, statusFilter]);

  const taskGroups = useMemo<TaskSectionGroup[]>(() => {
    const sectionIds = new Set(projectSections.map((section) => section.id));
    const groups = projectSections
      .map((section) => ({
        id: section.id,
        color: section.color,
        name: section.name,
        tasks: visibleTasks.filter((task) => task.sectionId === section.id),
      }))
      .filter((group) => group.tasks.length > 0);
    const unclassifiedTasks = visibleTasks.filter((task) => !task.sectionId || !sectionIds.has(task.sectionId));

    return unclassifiedTasks.length > 0
      ? [...groups, { id: null, color: "#94a3b8", name: "Sans section", tasks: unclassifiedTasks }]
      : groups;
  }, [projectSections, visibleTasks]);

  useEffect(() => {
    if (responsibleFilter !== "Tous" && !responsibleOptions.includes(responsibleFilter))
      setResponsibleFilter("Tous");
  }, [responsibleFilter, responsibleOptions]);

  useEffect(() => {
    if (!projectFiles.some((f) => f.id === selectedDocFileId))
      setSelectedDocFileId(projectFiles[0]?.id ?? "");
  }, [selectedDocFileId, projectFiles]);

  useEffect(() => {
    if (!enabledProjectTabs.some((tab) => tab.label === activeTab)) {
      setActiveTab("Pilotage");
    }
  }, [activeTab, enabledProjectTabs]);

  useEffect(() => {
    if (skipProjectResetRef.current) {
      skipProjectResetRef.current = false;
      return;
    }
    setEditingTask(null);
    setIsTaskEditorOpen(false);
    setPreviewTaskId("");
    setIsInterventionEditorOpen(false);
    setEditingIntervention(null);
    setPreviewInterventionId("");
    setSelectedDocFileId("");
  }, [selectedProjectId]);

  useEffect(() => {
    if (isLoading || didRestoreWorkspaceRef.current) return;

    didRestoreWorkspaceRef.current = true;

    const defaultProjectId = data.projects[0]?.id ?? "";
    const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_KEY);

    if (!raw) {
      setWorkspaceView("home");
      setSelectedProjectId(defaultProjectId);
      return;
    }

    try {
      const persisted = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
      const validProjectId =
        typeof persisted.selectedProjectId === "string" &&
        data.projects.some((project) => project.id === persisted.selectedProjectId)
          ? persisted.selectedProjectId
          : defaultProjectId;
      const validTabs = getEnabledProjectTabs(validProjectId).map((tab) => tab.label);
      const nextActiveTab =
        typeof persisted.activeTab === "string" && validTabs.includes(persisted.activeTab as ProjectTab)
          ? (persisted.activeTab as ProjectTab)
          : "Pilotage";
      const nextWorkspaceView: WorkspaceView =
        persisted.workspaceView === "team"
          ? isSuperAdmin
            ? "team"
            : "home"
          : persisted.workspaceView === "project"
            ? validProjectId
              ? "project"
              : "home"
            : "home";

      skipProjectResetRef.current = true;
      setSelectedProjectId(validProjectId);
      setWorkspaceView(nextWorkspaceView);
      setActiveTab(nextActiveTab);
      setSelectedDocFileId(
        typeof persisted.selectedDocFileId === "string" ? persisted.selectedDocFileId : ""
      );

      if (nextWorkspaceView === "project" && nextActiveTab === "Tâches") {
        if (persisted.taskMode === "preview" && typeof persisted.taskTargetId === "string") {
          setPreviewTaskId(persisted.taskTargetId);
        } else if (persisted.taskMode === "edit") {
          setIsTaskEditorOpen(true);
          if (persisted.taskTargetId && persisted.taskTargetId !== "new") {
            const task = data.tasks.find((item) => item.id === persisted.taskTargetId);
            setEditingTask(task ?? null);
          } else {
            setEditingTask(null);
          }
        }
      }

      if (nextWorkspaceView === "project" && nextActiveTab === "Interventions") {
        if (persisted.interventionMode === "preview" && typeof persisted.interventionTargetId === "string") {
          setPreviewInterventionId(persisted.interventionTargetId);
        } else if (persisted.interventionMode === "edit") {
          setIsInterventionEditorOpen(true);
          if (persisted.interventionTargetId && persisted.interventionTargetId !== "new") {
            const intervention = data.interventions.find(
              (item) => item.id === persisted.interventionTargetId
            );
            setEditingIntervention(intervention ?? null);
          } else {
            setEditingIntervention(null);
          }
        }
      }
    } catch {
      setWorkspaceView("home");
      setSelectedProjectId(defaultProjectId);
    }
  }, [data.interventions, data.projects, data.tasks, isLoading, isSuperAdmin]);

  useEffect(() => {
    if (isLoading || !didRestoreWorkspaceRef.current) return;

    const payload: PersistedWorkspaceState = {
      activeTab,
      interventionMode: isInterventionEditorOpen
        ? "edit"
        : previewInterventionId
          ? "preview"
          : "list",
      interventionTargetId: isInterventionEditorOpen
        ? editingIntervention?.id ?? "new"
        : previewInterventionId,
      selectedDocFileId,
      selectedProjectId,
      taskMode: isTaskEditorOpen ? "edit" : previewTaskId ? "preview" : "list",
      taskTargetId: isTaskEditorOpen ? editingTask?.id ?? "new" : previewTaskId,
      workspaceView,
    };

    window.sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(payload));
  }, [
    activeTab,
    editingIntervention?.id,
    editingTask?.id,
    isInterventionEditorOpen,
    isLoading,
    isTaskEditorOpen,
    previewInterventionId,
    previewTaskId,
    selectedDocFileId,
    selectedProjectId,
    workspaceView,
  ]);

  useEffect(() => {
    setIsProjectRenameOpen(false);
    setProjectRenameDraft(selectedProject?.name ?? "");
    setIsProjectDeleteConfirmOpen(false);
  }, [selectedProject?.id, selectedProject?.name]);

  const stats = useMemo(() => {
    const total = projectTasks.length;
    const done = projectTasks.filter((t) => t.status === "Terminé").length;
    const blocked = projectTasks.filter((t) => t.status === "Bloqué").length;
    const overdue = projectTasks.filter(isOverdue).length;
    return { blocked, done, overdue, progress: total > 0 ? Math.round((done / total) * 100) : 0, total };
  }, [projectTasks]);

  const nextActionTasks = useMemo(() =>
    projectTasks.filter((t) => t.status !== "Terminé" && t.status !== "Bloqué")
      .sort((a, b) => {
        const sw = (a.status === "En cours" ? 0 : 1) - (b.status === "En cours" ? 0 : 1);
        if (sw) return sw;
        const tw = getTaskTimeValue(a) - getTaskTimeValue(b);
        if (tw) return tw;
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      }).slice(0, 5),
    [projectTasks]);

  const blockedTasks = useMemo(() =>
    projectTasks.filter((t) => t.status === "Bloqué").sort((a, b) => getTaskTimeValue(a) - getTaskTimeValue(b)),
    [projectTasks]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSuperAdmin || !projectForm.name.trim()) return;
    const proj: ManagedProject = { id: createId("project"), name: projectForm.name.trim(), type: "AUTRE", color: projectForm.color, status: "Actif", health: "Bon", progress: 0, nextAction: "", blockers: "", lastUpdate: "" };
    updateData((c) => ({ ...c, projects: [...c.projects, proj], trackingFields: [...c.trackingFields, ...buildTrackingTemplate(proj)] }));
    setSelectedProjectId(proj.id);
    setWorkspaceView("project");
    setIsSidebarOpen(false);
    setProjectForm({ name: "", color: "#1e3a5f" });
    setShowAddProject(false);
  };

  const handleOpenProject = (projectId: string, tab: ProjectTab = "Pilotage") => {
    const allowedTabs = getEnabledProjectTabs(projectId).map((item) => item.label);
    const nextTab = allowedTabs.includes(tab) ? tab : "Pilotage";

    setSelectedProjectId(projectId);
    setWorkspaceView("project");
    setActiveTab(nextTab);
    setIsSidebarOpen(false);
  };

  const handleRenameProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSuperAdmin || !selectedProject || !projectRenameDraft.trim()) return;

    const nextName = projectRenameDraft.trim();
    updateData((c) => ({
      ...c,
      projects: c.projects.map((project) =>
        project.id === selectedProject.id
          ? { ...project, name: nextName }
          : project
      ),
    }));
    setIsProjectRenameOpen(false);
  };

  const handleDeleteProject = () => {
    if (!isSuperAdmin || !selectedProject) return;

    const projectId = selectedProject.id;
    const nextSelectedProjectId =
      data.projects.find((project) => project.id !== projectId)?.id ?? "";

    setSelectedProjectId(nextSelectedProjectId);
    setActiveTab("Pilotage");
    setEditingTask(null);
    setIsTaskEditorOpen(false);
    setPreviewTaskId("");
    setEditingIntervention(null);
    setIsInterventionEditorOpen(false);
    setPreviewInterventionId("");
    setSelectedDocFileId("");
    setIsProjectRenameOpen(false);
    setIsProjectDeleteConfirmOpen(false);

    updateData((c) => ({
      ...c,
      projects: c.projects.filter((project) => project.id !== projectId),
      taskSections: c.taskSections.filter((section) => section.projectId !== projectId),
      tasks: c.tasks.filter((task) => task.projectId !== projectId),
      docFolders: c.docFolders.filter((folder) => folder.projectId !== projectId),
      docFiles: c.docFiles.filter((file) => file.projectId !== projectId),
      trackingFields: c.trackingFields.filter((field) => field.projectId !== projectId),
      updates: c.updates.filter((update) => update.projectId !== projectId),
      interventions: c.interventions.filter((intervention) => intervention.projectId !== projectId),
      projectAccess: c.projectAccess.filter((access) => access.projectId !== projectId),
      activityLogs: c.activityLogs.filter((log) => log.projectId !== projectId),
    }));
  };

  const handleSaveTask = (draft: Omit<ManagedTask, "id">, taskId?: string) => {
    if (!draft.title.trim()) return;
    const existingTask = taskId ? data.tasks.find((task) => task.id === taskId) : null;
    const now = new Date().toISOString();
    const statusChanged = existingTask ? existingTask.status !== draft.status : true;
    const savedTask: ManagedTask = {
      ...draft,
      id: taskId ?? createId("task"),
      title: draft.title.trim(),
      createdAt: existingTask
        ? existingTask.createdAt || draft.createdAt || ""
        : draft.createdAt || now,
      createdBy: existingTask
        ? existingTask.createdBy || draft.createdBy || ""
        : draft.createdBy || currentUser.name,
      updatedAt: existingTask ? now : draft.updatedAt || now,
      updatedBy: currentUser.name,
      statusChangedAt: statusChanged
        ? now
        : existingTask?.statusChangedAt || draft.statusChangedAt || "",
      statusChangedBy: statusChanged
        ? currentUser.name
        : existingTask?.statusChangedBy || draft.statusChangedBy || "",
      completedAt: draft.status === "Terminé"
        ? statusChanged
          ? now
          : existingTask?.completedAt || draft.completedAt || ""
        : "",
      completedBy: draft.status === "Terminé"
        ? statusChanged
          ? currentUser.name
          : existingTask?.completedBy || draft.completedBy || ""
        : "",
    };
    if (taskId) {
      updateData((c) => ({ ...c, tasks: c.tasks.map((t) => t.id === taskId ? savedTask : t) }));
    } else {
      updateData((c) => ({ ...c, tasks: [...c.tasks, savedTask] }));
    }
    setEditingTask(null);
    setIsTaskEditorOpen(false);
    setPreviewTaskId(savedTask.id);
  };

  const handleDeleteTask        = (id: string) => {
    if (previewTaskId === id) setPreviewTaskId("");
    if (editingTask?.id === id) {
      setEditingTask(null);
      setIsTaskEditorOpen(false);
    }
    updateData((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) }));
  };
  const handleChangeTaskStatus  = (id: string, status: TaskStatus) => updateData((c) => {
    const now = new Date().toISOString();
    return {
      ...c,
      tasks: c.tasks.map((t) => t.id === id ? {
        ...t,
        status,
        updatedAt: now,
        updatedBy: currentUser.name,
        statusChangedAt: now,
        statusChangedBy: currentUser.name,
        completedAt: status === "Terminé" ? now : "",
        completedBy: status === "Terminé" ? currentUser.name : "",
      } : t),
    };
  });
  const handleAddTaskSection    = (pid: string, name: string) => {
    if (!name.trim()) return;
    const position = projectSections.length;
    updateData((c) => ({
      ...c,
      taskSections: [
        ...c.taskSections,
        {
          id: createId("section"),
          projectId: pid,
          name: name.trim(),
          color: SECTION_COLORS[position % SECTION_COLORS.length],
          position,
        },
      ],
    }));
  };
  const handleDeleteTaskSection = (id: string) => updateData((c) => ({
    ...c,
    taskSections: c.taskSections.filter((section) => section.id !== id),
    tasks: c.tasks.map((task) => task.sectionId === id ? { ...task, sectionId: null } : task),
  }));
  const handleAddDocFolder      = (pid: string, name: string) => { if (!name.trim()) return; updateData((c) => ({ ...c, docFolders: [...c.docFolders, { id: createId("folder"), projectId: pid, name: name.trim(), parentId: null }] })); };
  const handleDeleteDocFolder   = (id: string) => updateData((c) => ({ ...c, docFolders: c.docFolders.filter((f) => f.id !== id), docFiles: c.docFiles.filter((f) => f.folderId !== id) }));
  const handleAddDocFile        = (pid: string, fid: string | null, title: string) => {
    if (!title.trim()) return;
    const clean = title.trim();
    const now = new Date().toISOString();
    const file: ProjectDocFile = {
      id: createId("doc"),
      projectId: pid,
      folderId: fid,
      title: clean.endsWith(".md") ? clean : `${clean}.md`,
      sourceType: "markdown",
      contentMarkdown: `# ${clean.replace(/\.md$/i, "")}\n\n`,
      assetPath: "",
      mimeType: "text/markdown",
      size: 0,
      createdAt: now,
      createdBy: currentUser.name,
      updatedAt: now,
      updatedBy: currentUser.name,
    };
    updateData((c) => ({ ...c, docFiles: [file, ...c.docFiles] }));
    setSelectedDocFileId(file.id);
  };
  const handleUpdateDocFile     = (id: string, patch: Partial<ProjectDocFile>) => updateData((c) => ({ ...c, docFiles: c.docFiles.map((f) => f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser.name } : f) }));
  const handleDeleteDocFile     = (id: string) => updateData((c) => ({ ...c, docFiles: c.docFiles.filter((f) => f.id !== id) }));
  const handleUploadDocFiles    = async (pid: string, fid: string | null, filesToUpload: File[]) => {
    if (!filesToUpload.length) return [];

    const formData = new FormData();
    formData.append("projectId", pid);
    filesToUpload.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/projects/docs/upload", {
      body: formData,
      method: "POST",
    });

    if (response.status === 401) {
      window.location.reload();
      return [];
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          documents?: Array<{
            assetPath: string;
            mimeType: string;
            size: number;
            title: string;
          }>;
          error?: string;
        }
      | null;

    if (!response.ok || !payload?.documents) {
      throw new Error(payload?.error || "Erreur lors de l’envoi des documents.");
    }

    const now = new Date().toISOString();
    const createdFiles: ProjectDocFile[] = payload.documents.map((document) => ({
      id: createId("doc"),
      projectId: pid,
      folderId: fid,
      title: document.title,
      sourceType: "upload",
      contentMarkdown: "",
      assetPath: document.assetPath,
      mimeType: document.mimeType,
      size: document.size,
      createdAt: now,
      createdBy: currentUser.name,
      updatedAt: now,
      updatedBy: currentUser.name,
    }));

    updateData((c) => ({ ...c, docFiles: [...createdFiles, ...c.docFiles] }));
    setSelectedDocFileId(createdFiles[0]?.id ?? "");
    return createdFiles;
  };
  const handleAddTracking       = (pid: string, label: string) => { if (!label.trim()) return; updateData((c) => ({ ...c, trackingFields: [...c.trackingFields, { id: createId("metric"), projectId: pid, label: label.trim(), value: "", target: "", unit: "", status: "En cours" as TrackingStatus, note: "", position: trackingFields.length }] })); };
  const handleUpdateTracking    = (id: string, patch: Partial<ProjectTrackingField>) => updateData((c) => ({ ...c, trackingFields: c.trackingFields.map((f) => f.id === id ? { ...f, ...patch } : f) }));
  const handleDeleteTracking    = (id: string) => updateData((c) => ({ ...c, trackingFields: c.trackingFields.filter((f) => f.id !== id) }));
  const handleAddUpdate         = (u: Omit<ProjectUpdate, "id">) => { if (!u.title.trim()) return; updateData((c) => ({ ...c, updates: [{ ...u, id: createId("update"), title: u.title.trim() }, ...c.updates] })); };
  const handleDeleteUpdate      = (id: string) => updateData((c) => ({ ...c, updates: c.updates.filter((u) => u.id !== id) }));
  const handleAddIntervention   = (intervention: Omit<ProjectIntervention, "id">) => {
    const clean = sanitizeInterventionDraft(intervention);
    if (!clean.prestation) return "";
    const now = new Date().toISOString();
    const id = createId("intervention");
    updateData((c) => ({
      ...c,
      interventions: [
        {
          ...clean,
          id,
          createdAt: now,
          createdBy: currentUser.name,
          updatedAt: now,
          updatedBy: currentUser.name,
          statusChangedAt: now,
          statusChangedBy: currentUser.name,
        },
        ...c.interventions,
      ],
    }));
    return id;
  };
  const handleUpdateIntervention = (id: string, patch: Partial<ProjectIntervention>) => {
    const now = new Date().toISOString();
    updateData((c) => ({
      ...c,
      interventions: c.interventions.map((intervention) => {
        if (intervention.id !== id) {
          return intervention;
        }

        const next = sanitizeInterventionDraft({ ...intervention, ...patch });
        const statusChanged = next.status !== intervention.status;
        return {
          ...next,
          id,
          createdAt: intervention.createdAt,
          createdBy: intervention.createdBy,
          updatedAt: now,
          updatedBy: currentUser.name,
          statusChangedAt: statusChanged ? now : intervention.statusChangedAt,
          statusChangedBy: statusChanged ? currentUser.name : intervention.statusChangedBy,
        };
      }),
    }));
    return id;
  };
  const handleDeleteIntervention = (id: string) => {
    if (previewInterventionId === id) setPreviewInterventionId("");
    if (editingIntervention?.id === id) {
      setEditingIntervention(null);
      setIsInterventionEditorOpen(false);
    }
    updateData((c) => ({
      ...c,
      interventions: c.interventions.filter((intervention) => intervention.id !== id),
    }));
  };
  const handleAddTeamUser       = (user: Omit<ProjectTeamUser, "id" | "role" | "isActive">) => {
    if (!isSuperAdmin || !user.name.trim() || !user.email.trim()) return;
    updateData((c) => ({
      ...c,
      teamUsers: [
        ...c.teamUsers,
        {
          id: createId("user"),
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          role: "member",
          isActive: true,
          password: user.password?.trim() || undefined,
        },
      ],
    }));
  };
  const handleUpdateTeamUser    = (id: string, patch: Partial<ProjectTeamUser>) => {
    if (!isSuperAdmin) return;
    updateData((c) => ({
      ...c,
      teamUsers: c.teamUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              ...patch,
              email: patch.email ? patch.email.trim().toLowerCase() : user.email,
              name: patch.name ?? user.name,
              password: patch.password?.trim() || undefined,
            }
          : user
      ),
    }));
  };
  const handleToggleProjectAccess = (userId: string, projectId: string) => {
    if (!isSuperAdmin) return;
    updateData((c) => {
      const exists = c.projectAccess.some((access) => access.userId === userId && access.projectId === projectId);
      return {
        ...c,
        projectAccess: exists
          ? c.projectAccess.filter((access) => !(access.userId === userId && access.projectId === projectId))
          : [...c.projectAccess, { userId, projectId }],
      };
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="ltr" className="projects-app flex h-dvh overflow-hidden text-[13px] text-[var(--tsp-text)] antialiased">

      {isSidebarOpen && (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside
        className={`projects-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[86vw] shrink-0 flex-col overflow-hidden transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[248px] lg:max-w-none lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-[18px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08]">
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-white/[0.45]">Tech-Solution</div>
            <div className="text-[17px] font-bold text-white">Projects</div>
          </div>
          <button
            aria-label="Fermer le menu"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/[0.35] transition hover:bg-white/[0.06] hover:text-white/70 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4">
            <button
              onClick={() => { setWorkspaceView("home"); setIsSidebarOpen(false); }}
              type="button"
              className={`flex w-full items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 text-left transition ${workspaceView === "home" ? "bg-white text-[var(--tsp-text)]" : "bg-white/[0.05] text-white/[0.75] hover:bg-white/[0.08] hover:text-white"}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${workspaceView === "home" ? "bg-[var(--tsp-bg-surface)] text-[var(--tsp-text)]" : "bg-white/[0.08] text-white/[0.75]"}`}>
                <House className="h-4 w-4" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">Accueil</span>
                <span className={`mt-0.5 block text-[11px] ${workspaceView === "home" ? "text-[var(--tsp-text-secondary)]" : "text-white/[0.45]"}`}>
                  Vue générale des projets
                </span>
              </span>
            </button>
          </div>

          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-white/[0.45]">
            Projets · {data.projects.length}
          </div>
          <div className="space-y-2">
            {data.projects.map((project) => {
              const isActive = workspaceView === "project" && selectedProject?.id === project.id;
              const projectTaskCount = data.tasks.filter((task) => task.projectId === project.id).length;
              return (
                <button key={project.id} onClick={() => handleOpenProject(project.id)} type="button"
                  className={`group flex w-full items-center gap-3 rounded-[10px] border border-transparent border-l-[3px] px-3 py-2.5 text-left transition-all ${isActive ? "bg-white text-[var(--tsp-text)]" : "bg-white/[0.05] text-white/[0.75] hover:bg-white/[0.08] hover:text-white"}`}
                  style={{
                    borderColor: isActive ? "var(--tsp-border)" : "transparent",
                    borderLeftColor: project.color,
                  }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{project.name}</span>
                    <span className={`mt-0.5 block text-[11px] ${isActive ? "text-[var(--tsp-text-secondary)]" : "text-white/[0.45]"}`}>
                      {projectTaskCount} tâche{projectTaskCount > 1 ? "s" : ""}
                    </span>
                  </span>
                  {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--tsp-text-secondary)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="border-t border-white/[0.06] px-3 py-3">
            <button
              onClick={() => { setWorkspaceView("team"); setIsSidebarOpen(false); }}
              type="button"
              className={`flex w-full items-center gap-2 rounded-[10px] border border-transparent px-3 py-2.5 text-sm transition ${workspaceView === "team" ? "bg-white text-[var(--tsp-text)]" : "bg-white/[0.05] text-white/[0.60] hover:bg-white/[0.08] hover:text-white"}`}
            >
              <Users className="h-4 w-4" />
              <span className="flex-1 text-left font-medium">Équipe</span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${workspaceView === "team" ? "bg-[var(--tsp-bg-surface)] text-[var(--tsp-text-secondary)]" : "bg-white/10 text-white/[0.45]"}`}>{data.teamUsers.length}</span>
            </button>
          </div>
        )}

        {isSuperAdmin && (
          <div className="border-t border-white/[0.06] px-3 py-3">
            <button onClick={() => setShowAddProject((v) => !v)} type="button"
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-white/[0.55] transition hover:bg-white/[0.08] hover:text-white">
              <Plus className="h-4 w-4" />
              <span className="flex-1 text-left">Nouveau projet</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAddProject ? "rotate-180" : ""}`} />
            </button>
            {showAddProject && (
              <form onSubmit={handleAddProject} className="mt-2 space-y-2 rounded-[10px] border border-white/10 bg-white/[0.06] p-3">
                <input
                  className="h-9 w-full rounded-[10px] border border-white/10 bg-white/10 px-3 text-[13px] text-white placeholder-white/[0.35] outline-none"
                  onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Nom du projet" value={projectForm.name}
                />
                <div className="flex items-center justify-between rounded-[10px] border border-white/10 bg-white/10 px-3 py-2">
                  <span className="text-[12px] font-medium text-white/[0.55]">Couleur</span>
                  <input aria-label="Couleur" type="color" className="h-8 w-10 rounded-[8px] border border-white/10 bg-white/10 p-1" onChange={(e) => setProjectForm((c) => ({ ...c, color: e.target.value }))} value={projectForm.color} />
                </div>
                <button type="submit" className="projects-btn-secondary flex h-9 w-full items-center justify-center gap-1.5 text-[13px] font-semibold">
                  <Plus className="h-3.5 w-3.5" /> Créer
                </button>
              </form>
            )}
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="mb-2 flex min-w-0 items-center gap-2 rounded-[10px] px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.08] text-white/[0.55]">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{currentUser.name}</p>
              <p className="truncate text-[11px] text-white/[0.45]">{currentUser.role === "super_admin" ? "Super admin" : "Membre"}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-white/[0.55] transition hover:bg-white/[0.08] hover:text-white">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="projects-topbar hidden h-[56px] shrink-0 items-center justify-between gap-3 px-3 sm:flex sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <button
              aria-label="Ouvrir le menu"
              className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] text-white/[0.75] transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              <Menu className="h-4 w-4" />
            </button>
            {workspaceView === "team" ? (
              <>
                <Users className="h-4 w-4 shrink-0 text-white/[0.55]" />
                <span className="truncate font-semibold text-white">Équipe</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
                <span className="font-medium text-white/[0.45]">Accès projets</span>
              </>
            ) : workspaceView === "home" ? (
              <>
                <House className="h-4 w-4 shrink-0 text-white/[0.55]" />
                <span className="truncate font-semibold text-white">Accueil</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
                <span className="font-medium text-white/[0.45]">Vue générale</span>
              </>
            ) : selectedProject && <>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedProject.color }} />
              <span className="truncate font-semibold text-white">{selectedProject.name}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <span className="font-medium text-white/[0.45]">{activeTab}</span>
            </>}
          </div>
          <SaveBadge saveState={saveState} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-0 sm:p-4">
          {isLoading ? (
            <div className="projects-shell flex min-h-[400px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--tsp-navy)]" /> Chargement…
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-[var(--tsp-red)]" />
              <p className="font-semibold text-red-900">{loadError}</p>
              <button onClick={() => void loadData()} className="projects-btn-primary px-5 py-2 text-sm font-semibold">Réessayer</button>
            </div>
          ) : workspaceView === "home" ? (
            <div className="projects-shell !rounded-none !border-x-0 !border-t-0 sm:!rounded-[20px] sm:!border-x sm:!border-t">
              <div className="border-b border-[var(--tsp-border)] bg-[var(--tsp-navy)] px-4 py-4 text-white sm:px-5 sm:py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white">
                        <House className="h-4 w-4" />
                      </div>
                      <div>
                        <div aria-level={1} role="heading" className="text-[17px] font-bold text-white">Accueil</div>
                        <p className="mt-1 text-[12px] text-white/[0.45]">Ouvrez un projet ou reprenez votre travail.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:hidden">
                      <SaveBadge saveState={saveState} />
                      <button
                        aria-label="Ouvrir le menu"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white"
                        onClick={() => setIsSidebarOpen(true)}
                        type="button"
                      >
                        <Menu className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="hidden items-start gap-3 sm:flex">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white">
                      <House className="h-4 w-4" />
                    </div>
                    <div>
                      <div aria-level={1} role="heading" className="text-[17px] font-bold text-white">Accueil</div>
                      <p className="mt-1 text-[12px] text-white/[0.45]">Vue générale des projets et point d’entrée de l’espace interne.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <StatPill label="Projets" value={data.projects.length} color="slate" icon={<FolderKanban className="h-3.5 w-3.5" />} />
                    <StatPill label="Tâches" value={data.tasks.length} color="emerald" icon={<Columns3 className="h-3.5 w-3.5" />} />
                    <StatPill label="Bloquées" value={data.tasks.filter((task) => task.status === "Bloqué").length} color="red" icon={<AlertCircle className="h-3.5 w-3.5" />} />
                  </div>
                </div>
              </div>
              <HomeTab
                activityLogs={data.activityLogs}
                currentUser={currentUser}
                onOpenProject={handleOpenProject}
                projects={data.projects}
                tasks={data.tasks}
              />
            </div>
          ) : workspaceView === "team" && isSuperAdmin ? (
            <div className="projects-shell !rounded-none !border-x-0 !border-t-0 sm:!rounded-[20px] sm:!border-x sm:!border-t">
              <div className="border-b border-[var(--tsp-border)] bg-[var(--tsp-navy)] px-4 py-4 text-white sm:px-5 sm:py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white sm:hidden">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div aria-level={1} role="heading" className="text-[17px] font-bold text-white">Équipe</div>
                        <p className="mt-1 text-[12px] text-white/[0.45]">Gérer les membres et les projets visibles par chacun.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:hidden">
                      <SaveBadge saveState={saveState} />
                      <button
                        aria-label="Ouvrir le menu"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white"
                        onClick={() => setIsSidebarOpen(true)}
                        type="button"
                      >
                        <Menu className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="hidden items-start gap-3 sm:flex">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div aria-level={1} role="heading" className="text-[17px] font-bold text-white">Équipe</div>
                      <p className="mt-1 text-[12px] text-white/[0.45]">Gérer les membres et les projets visibles par chacun.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <StatPill label="Membres" value={data.teamUsers.length} color="slate" icon={<Users className="h-3.5 w-3.5" />} />
                    <StatPill label="Actifs" value={data.teamUsers.filter((user) => user.isActive).length} color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                    <StatPill label="Projets" value={data.projects.length} color="amber" icon={<FolderKanban className="h-3.5 w-3.5" />} />
                  </div>
                </div>
              </div>
              <TeamTab
                onAddUser={handleAddTeamUser}
                onToggleProjectAccess={handleToggleProjectAccess}
                onUpdateUser={handleUpdateTeamUser}
                projectAccess={data.projectAccess}
                projects={data.projects}
                users={data.teamUsers}
              />
            </div>
          ) : selectedProject ? (
            <div className="projects-shell !rounded-none !border-x-0 !border-t-0 sm:!rounded-[20px] sm:!border-x sm:!border-t">

              {/* ── Project header ── */}
              <div className="border-b border-white/[0.08] bg-[var(--tsp-navy)] px-4 pt-4 pb-0 text-white sm:px-5 sm:pt-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3" style={{ backgroundColor: selectedProject.color }} />
                        <div className="min-w-0">
                        <div
                          aria-level={1}
                          className="truncate font-bold leading-[1.1] text-white"
                          role="heading"
                          style={PROJECT_TITLE_STYLE}
                        >
                          {selectedProject.name}
                        </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] text-white/[0.55]">{projectTasks.length} tâche{projectTasks.length > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <>
                            <button
                              aria-label="Renommer le projet"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white transition hover:bg-white/12"
                              onClick={() => {
                                setProjectRenameDraft(selectedProject.name);
                                setIsProjectRenameOpen((value) => !value);
                                setIsProjectDeleteConfirmOpen(false);
                              }}
                              type="button"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Supprimer le projet"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white transition hover:border-red-200/30 hover:bg-red-500/12 hover:text-red-100"
                              onClick={() => {
                                setIsProjectDeleteConfirmOpen((value) => !value);
                                setIsProjectRenameOpen(false);
                              }}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          aria-label="Ouvrir le menu"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white sm:hidden"
                          onClick={() => setIsSidebarOpen(true)}
                          type="button"
                        >
                          <Menu className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isSuperAdmin && isProjectRenameOpen && (
                      <form
                        className="mt-3 flex flex-col gap-2 rounded-[10px] border border-white/10 bg-white/[0.06] p-3 sm:max-w-[420px] sm:flex-row sm:items-center"
                        onSubmit={handleRenameProject}
                      >
                        <input
                          className="h-10 min-w-0 flex-1 rounded-[10px] border border-white/10 bg-white text-[13px] text-[var(--tsp-text)] placeholder:text-[var(--tsp-text-secondary)]"
                          onChange={(e) => setProjectRenameDraft(e.target.value)}
                          placeholder="Nom du projet"
                          value={projectRenameDraft}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            className="projects-btn-secondary inline-flex h-10 items-center justify-center px-3 text-[12px] font-semibold"
                            onClick={() => {
                              setIsProjectRenameOpen(false);
                              setProjectRenameDraft(selectedProject.name);
                            }}
                            type="button"
                          >
                            Annuler
                          </button>
                          <button
                            className="projects-btn-primary inline-flex h-10 items-center justify-center px-3 text-[12px] font-semibold"
                            disabled={!projectRenameDraft.trim()}
                            type="submit"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </form>
                    )}

                    {isSuperAdmin && isProjectDeleteConfirmOpen && (
                      <div className="mt-3 max-w-[520px] rounded-[10px] border border-red-200/20 bg-red-500/10 p-3">
                        <p className="text-[13px] font-semibold text-white">
                          Supprimer ce projet ?
                        </p>
                        <p className="mt-1 text-[12px] text-white/[0.7]">
                          Toutes les tâches, documents, interventions, accès et activités liés à ce projet seront supprimés.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="projects-btn-secondary inline-flex h-10 items-center justify-center px-3 text-[12px] font-semibold"
                            onClick={() => setIsProjectDeleteConfirmOpen(false)}
                            type="button"
                          >
                            Annuler
                          </button>
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-red-200/30 bg-[#dc2626] px-3 text-[12px] font-semibold text-white transition hover:bg-[#b91c1c]"
                            onClick={handleDeleteProject}
                            type="button"
                          >
                            Supprimer définitivement
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Stats row */}
                  {!shouldHideProjectStats && (
                    <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-3 lg:justify-end">
                      <StatPill label="Total"     value={stats.total}   color="slate"   icon={<Columns3    className="h-3.5 w-3.5" />} />
                      <StatPill label="Terminées" value={stats.done}    color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                      <StatPill label="Bloquées"  value={stats.blocked} color="red"     icon={<AlertCircle className="h-3.5 w-3.5" />} />
                      <StatPill label="En retard" value={stats.overdue} color="amber"   icon={<Clock3      className="h-3.5 w-3.5" />} />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                  <nav className={`grid gap-1 border-b border-white/10 sm:flex sm:min-w-0 sm:overflow-x-auto sm:border-b-0 ${enabledProjectTabs.length === 3 ? "grid-cols-3" : enabledProjectTabs.length === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
                    {enabledProjectTabs.map(({ label, icon: Icon, shortLabel }) => {
                      const active = activeTab === label;
                      return (
                        <button key={label} onClick={() => setActiveTab(label)} type="button"
                          className={`flex min-w-0 shrink-0 items-center justify-center gap-1 border-b-2 px-1 py-2 text-[11px] font-semibold transition-all sm:justify-start sm:gap-2 sm:px-4 sm:py-3 sm:text-[13px] ${active ? "border-white text-white" : "border-transparent text-white/[0.45] hover:text-white sm:hover:border-white/20"}`}>
                          <Icon className="hidden h-3.5 w-3.5 sm:block" />
                          <span className="truncate sm:hidden">{shortLabel ?? label}</span>
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      );
                    })}
                  </nav>
                  {activeTab === "Tâches" && !isTaskEditorOpen && (
                    <div className="mb-1 hidden sm:block">
                      <button onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }} type="button"
                        className="projects-btn-secondary flex h-9 items-center gap-1.5 px-3 text-[13px] font-semibold">
                        <Plus className="h-3.5 w-3.5" /> Nouvelle tâche
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tab filter bar (Tasks only) ── */}
              {activeTab === "Tâches" && !isTaskEditorOpen && !previewTask && (
                <div className="space-y-2 border-b border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] px-2 py-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0 sm:px-5 sm:py-3">
                  <div className="projects-surface grid w-full grid-cols-5 items-center gap-1 px-1.5 py-1 sm:flex sm:w-auto sm:px-2">
                    <Filter className="hidden h-3 w-3 text-[var(--tsp-text-secondary)] sm:block" />
                    {(["Tous", ...TASK_STATUSES] as StatusFilter[]).map((s) => (
                      <button key={s} onClick={() => setStatusFilter(s)} type="button"
                        className={`min-w-0 rounded-[8px] px-1 py-1 text-[11px] font-semibold transition sm:shrink-0 sm:px-2.5 ${statusFilter === s ? "bg-[var(--tsp-navy)] text-white" : "text-[var(--tsp-text-secondary)] hover:bg-[var(--tsp-bg-surface)]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <label className="projects-surface flex h-9 w-full items-center gap-1.5 px-3 text-[12px] sm:w-auto">
                    <User className="h-3 w-3 text-[var(--tsp-text-secondary)]" />
                    <select disabled={!responsibleOptions.length} className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--tsp-text-secondary)] outline-none sm:flex-none" onChange={(e) => setResponsibleFilter(e.target.value)} value={responsibleFilter}>
                      <option value="Tous">Tous les responsables</option>
                      {responsibleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <form
                    className="projects-surface flex h-9 w-full items-center gap-1.5 px-2 sm:ml-auto sm:min-w-[220px] sm:w-auto"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTaskSection(selectedProject.id, taskSectionName);
                      setTaskSectionName("");
                    }}
                  >
                    <Columns3 className="h-3 w-3 text-[var(--tsp-text-secondary)]" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--tsp-text)] placeholder-[var(--tsp-text-secondary)] outline-none"
                      onChange={(e) => setTaskSectionName(e.target.value)}
                      placeholder="Nouvelle section"
                      value={taskSectionName}
                    />
                    <button
                      type="submit"
                      disabled={!taskSectionName.trim()}
                      className="projects-btn-primary flex h-7 w-7 items-center justify-center rounded-[8px] transition disabled:opacity-35"
                      title="Ajouter la section"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </form>
                  <div className="sm:hidden">
                    <button
                      onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }}
                      type="button"
                      className="projects-btn-secondary flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nouvelle tâche
                    </button>
                  </div>
                </div>
              )}

              {/* ── Tab content ── */}
              {activeTab === "Pilotage" && <PilotageTab activityLogs={recentProjectActivityLogs} nextActionTasks={nextActionTasks} blockedTasks={blockedTasks} project={selectedProject} stats={stats} />}
              {activeTab === "Tâches"   && (
                isTaskEditorOpen ? (
                  <TaskEditorPage
                    defaultProjectId={selectedProject.id}
                    onClose={() => { setEditingTask(null); setIsTaskEditorOpen(false); }}
                    onSave={handleSaveTask}
                    sections={projectSections}
                    task={editingTask}
                    teamMembers={projectMemberNames}
                  />
                ) : previewTask ? (
                  <TaskPreviewPage
                    onBack={() => setPreviewTaskId("")}
                    onDelete={() => handleDeleteTask(previewTask.id)}
                    onEdit={() => {
                      setEditingTask(previewTask);
                      setPreviewTaskId("");
                      setIsTaskEditorOpen(true);
                    }}
                    sectionName={projectSections.find((section) => section.id === previewTask.sectionId)?.name ?? ""}
                    task={previewTask}
                  />
                ) : (
                  <TachesTab
                    groups={taskGroups}
                    onChangeStatus={handleChangeTaskStatus}
                    onDeleteSection={handleDeleteTaskSection}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={(t) => { setEditingTask(t); setIsTaskEditorOpen(true); }}
                    onPreviewTask={(t) => setPreviewTaskId(t.id)}
                  />
                )
              )}
              {activeTab === "Docs"     && <DocsTab files={projectFiles} folders={projectFolders} onAddFile={handleAddDocFile} onAddFolder={handleAddDocFolder} onDeleteFile={handleDeleteDocFile} onDeleteFolder={handleDeleteDocFolder} onSelectFile={setSelectedDocFileId} onUpdateFile={handleUpdateDocFile} onUploadFiles={handleUploadDocFiles} projectId={selectedProject.id} selectedFile={selectedDocFile} />}
              {activeTab === "Interventions" && (
                isInterventionEditorOpen ? (
                  <InterventionEditorPage
                    defaultProjectId={selectedProject.id}
                    intervention={editingIntervention}
                    onClose={() => {
                      setEditingIntervention(null);
                      setIsInterventionEditorOpen(false);
                    }}
                    onSave={(draft, interventionId) => {
                      const savedId = interventionId
                        ? handleUpdateIntervention(interventionId, draft)
                        : handleAddIntervention(draft);
                      if (!savedId) return;
                      setEditingIntervention(null);
                      setIsInterventionEditorOpen(false);
                      setPreviewInterventionId(savedId);
                    }}
                  />
                ) : previewIntervention ? (
                  <InterventionPreviewPage
                    activityLogs={projectActivityLogs}
                    intervention={previewIntervention}
                    onBack={() => setPreviewInterventionId("")}
                    onDelete={() => handleDeleteIntervention(previewIntervention.id)}
                    onEdit={() => {
                      setEditingIntervention(previewIntervention);
                      setPreviewInterventionId("");
                      setIsInterventionEditorOpen(true);
                    }}
                  />
                ) : (
                  <InterventionsTab
                    interventions={projectInterventions}
                    onCreate={() => {
                      setEditingIntervention(null);
                      setIsInterventionEditorOpen(true);
                    }}
                    onDelete={handleDeleteIntervention}
                    onEdit={(intervention) => {
                      setEditingIntervention(intervention);
                      setIsInterventionEditorOpen(true);
                    }}
                    onPreview={(intervention) => setPreviewInterventionId(intervention.id)}
                  />
                )
              )}
              {activeTab === "Suivi"    && <SuiviTab fields={trackingFields} updates={projectUpdates} project={selectedProject} onAddField={handleAddTracking} onUpdateField={handleUpdateTracking} onDeleteField={handleDeleteTracking} onAddUpdate={handleAddUpdate} onDeleteUpdate={handleDeleteUpdate} />}
            </div>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div>
                <CircleDashed className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="font-semibold text-slate-600">Aucun projet</p>
                <p className="mt-1 text-sm text-slate-400">Ajoutez un projet depuis la barre latérale.</p>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── HOME TAB ────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function HomeTab({
  activityLogs,
  currentUser,
  onOpenProject,
  projects,
  tasks,
}: {
  activityLogs: ProjectActivityLog[];
  currentUser: CurrentProjectUser;
  onOpenProject: (projectId: string, tab?: ProjectTab) => void;
  projects: ManagedProject[];
  tasks: ManagedTask[];
}) {
  const recentLogs = useMemo(
    () =>
      [...activityLogs]
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )
        .slice(0, 6),
    [activityLogs]
  );

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] p-3 sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-3">
          <div className="projects-surface p-[14px] sm:p-5">
            <p className="projects-label">Bienvenue</p>
            <p
              className="mt-1 font-bold text-[var(--tsp-text)]"
              style={{ fontSize: "17px", letterSpacing: 0, lineHeight: 1.25 }}
            >
              {currentUser.name}
            </p>
            <p className="mt-2 text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]">
              Cet espace vous sert de point d’entrée. Ouvrez un projet pour continuer,
              consultez les mouvements récents et reprenez rapidement le bon onglet.
            </p>
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="projects-label">Mes projets</p>
                <p className="mt-1 text-[13px] text-[var(--tsp-text-secondary)]">
                  Tous les projets accessibles depuis cet espace.
                </p>
              </div>
              <span className="rounded-md bg-[var(--tsp-bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                {projects.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {projects.map((project) => {
                const projectTasks = tasks.filter((task) => task.projectId === project.id);
                const doneTasks = projectTasks.filter((task) => task.status === "Terminé").length;
                const blockedTasks = projectTasks.filter((task) => task.status === "Bloqué").length;
                const progress = projectTasks.length ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

                return (
                  <button
                    key={project.id}
                    className="projects-surface text-left transition hover:border-[color-mix(in_srgb,var(--tsp-text)_25%,white)]"
                    onClick={() => onOpenProject(project.id)}
                    type="button"
                  >
                    <div className="p-[14px]">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-[var(--tsp-text)]">
                            {project.name}
                          </p>
                          <p className="mt-1 text-[12px] text-[var(--tsp-text-secondary)]">
                            {projectTasks.length} tâche{projectTasks.length > 1 ? "s" : ""} · {doneTasks} terminée{doneTasks > 1 ? "s" : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tsp-text-secondary)]" />
                      </div>

                      <div className="mt-4 h-1 overflow-hidden rounded-[2px] bg-[var(--tsp-bg-surface)]">
                        <div
                          className="h-full rounded-[2px]"
                          style={{
                            backgroundColor: project.color,
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[var(--tsp-bg-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                          Avancement {progress}%
                        </span>
                        {blockedTasks > 0 ? (
                          <span className="rounded-md bg-[#fef2f2] px-2 py-0.5 text-[11px] font-semibold text-[#dc2626]">
                            {blockedTasks} bloquée{blockedTasks > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[17px] font-bold text-[var(--tsp-text)]">Activité récente</p>
              <span className="rounded-md bg-[var(--tsp-bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                {recentLogs.length}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {recentLogs.length ? (
                recentLogs.map((log) => (
                  <ActivityLogItem key={log.id} log={log} />
                ))
              ) : (
                <div className="projects-surface-soft px-3 py-3 text-[12px] text-[var(--tsp-text-secondary)]">
                  Aucune activité récente pour le moment.
                </div>
              )}
            </div>
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <p className="projects-label">Accès rapide</p>
            <div className="mt-3 grid gap-2">
              {projects.slice(0, 4).map((project) => (
                <button
                  key={`${project.id}-quick`}
                  className="projects-surface-soft flex items-center gap-3 px-3 py-3 text-left transition hover:bg-white"
                  onClick={() => onOpenProject(project.id)}
                  type="button"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--tsp-text)]">
                    {project.name}
                  </span>
                  <span className="text-[12px] text-[var(--tsp-text-secondary)]">Ouvrir</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── PILOTAGE TAB ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function PilotageTab({ activityLogs, nextActionTasks, blockedTasks, project, stats }: {
  activityLogs: ProjectActivityLog[];
  nextActionTasks: ManagedTask[];
  blockedTasks: ManagedTask[];
  project: ManagedProject;
  stats: ProjectStats;
}) {
  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">

      {/* Left column */}
      <div className="space-y-5">

        {/* Progress card */}
        <div className="projects-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="projects-label">Avancement réel</p>
              <p className="mt-0.5 text-[13px] text-[var(--tsp-text-secondary)]">Calculé depuis les tâches terminées</p>
            </div>
            <div className="projects-surface-soft flex h-14 w-14 items-center justify-center rounded-[10px]">
              <span className="text-xl font-bold text-[var(--tsp-text)]">{stats.progress}<span className="text-sm font-semibold text-[var(--tsp-text-secondary)]">%</span></span>
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-[2px] bg-[var(--tsp-bg-surface)]">
            <div
              className="h-full rounded-[2px] transition-all duration-700"
              style={{ backgroundColor: project.color, width: `${stats.progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--tsp-text-secondary)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--tsp-green)]" />
            {stats.done} terminée{stats.done > 1 ? "s" : ""} sur {stats.total} · {stats.blocked > 0 && <><span className="font-medium text-[var(--tsp-red)]">{stats.blocked} bloquée{stats.blocked > 1 ? "s" : ""}</span> · </>}{stats.overdue > 0 && <span className="font-medium text-[var(--tsp-amber)]">{stats.overdue} en retard</span>}
          </div>
        </div>

        {/* Next actions */}
        <div>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--tsp-navy)]" />
            <h3 className="font-bold text-[var(--tsp-text)]" style={PROJECT_TITLE_STYLE}>Prochaines actions</h3>
            {nextActionTasks.length > 0 && (
              <span className="ml-auto rounded-md bg-[var(--tsp-bg-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">{nextActionTasks.length}</span>
            )}
          </div>
          <div className="space-y-2">
            {nextActionTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            {!nextActionTasks.length && <EmptyState label="Aucune action en cours" />}
          </div>
        </div>

        {/* Blockers */}
        {blockedTasks.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-bold text-[var(--tsp-text)]" style={PROJECT_TITLE_STYLE}>Blocages</h3>
              <span className="ml-auto rounded-md bg-[#fef2f2] px-2 py-0.5 text-[11px] font-semibold text-[#dc2626]">{blockedTasks.length}</span>
            </div>
            <div className="space-y-2">
              {blockedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>
        )}
      </div>

      {/* Right column – summary */}
      <div className="space-y-4">
        {/* Health card */}
        <div className="projects-surface p-5">
          <p className="projects-label mb-4">Synthèse</p>
          <div className="space-y-3">
            {[
              { label: "Santé projet", node: <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEALTH_META[project.health].cls}`}>{project.health}</span> },
              { label: "Terminées",   node: <span className="text-sm font-bold text-slate-800">{stats.done}/{stats.total}</span> },
              { label: "Bloquées",    node: <span className={`text-sm font-bold ${stats.blocked > 0 ? "text-red-600" : "text-slate-300"}`}>{stats.blocked}</span> },
              { label: "En retard",   node: <span className={`text-sm font-bold ${stats.overdue > 0 ? "text-amber-600" : "text-slate-300"}`}>{stats.overdue}</span> },
            ].map(({ label, node }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-[10px] bg-[var(--tsp-bg-surface)] px-3 py-2.5">
                <span className="text-[12px] font-medium text-[var(--tsp-text-secondary)]">{label}</span>
                {node}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--tsp-border)] pt-3 text-[12px] text-[var(--tsp-text-secondary)]">
            Dernière mise à jour projet : {project.lastUpdate || "Non renseignée"}
          </div>
        </div>

        <div className="projects-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--tsp-navy)]" />
            <h3 className="text-[17px] font-bold text-[var(--tsp-text)]">Activité récente</h3>
            {activityLogs.length > 0 && (
              <span className="ml-auto rounded-md bg-[var(--tsp-bg-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                {activityLogs.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {activityLogs.length > 0 ? (
              activityLogs.map((log) => <ActivityLogItem key={log.id} log={log} />)
            ) : (
              <EmptyState label="Aucune activité récente" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityLogItem({ log }: { log: ProjectActivityLog }) {
  return (
    <div className="projects-surface-soft flex items-start gap-3 px-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tsp-navy)] text-[11px] font-bold text-white">
        {getUserInitials(log.actorName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[1.5] text-[var(--tsp-text)]">{log.message}</p>
        <p className="mt-1 text-[11px] text-[var(--tsp-text-secondary)]">
          {formatProjectDateTime(log.occurredAt)}
        </p>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: ManagedTask }) {
  const sm = STATUS_META[task.status];
  return (
    <div className="projects-surface flex gap-3 p-[14px] transition">
      <div className={`mt-0.5 h-full w-1 shrink-0 self-stretch rounded-full ${sm.bar} opacity-70`} style={{ minHeight: 24 }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-[var(--tsp-text)]">{task.title}</p>
          <span
            className="shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-semibold"
            style={STATUS_BADGE_STYLE[task.status]}
          >
            {task.status}
          </span>
        </div>
        {task.note && <p className="mt-1 text-[12px] leading-relaxed text-[var(--tsp-text-secondary)]">{task.note}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_META[task.priority].cls}`}>{task.priority}</span>
          {task.responsible && (
            <span className="flex items-center gap-1 rounded-md bg-[var(--tsp-bg-surface)] px-2 py-0.5 text-[11px] text-[var(--tsp-text-secondary)]">
              <User className="h-2.5 w-2.5" />{task.responsible}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${isOverdue(task) ? "bg-[#fef2f2] text-[#dc2626]" : "bg-[var(--tsp-bg-surface)] text-[var(--tsp-text-secondary)]"}`}>
              <Calendar className="h-2.5 w-2.5" />{task.dueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── TÂCHES TAB ──────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function TachesTab({ groups, onChangeStatus, onDeleteSection, onDeleteTask, onEditTask, onPreviewTask }: {
  groups: TaskSectionGroup[];
  onChangeStatus: (id: string, s: TaskStatus) => void;
  onDeleteSection: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: ManagedTask) => void;
  onPreviewTask: (t: ManagedTask) => void;
}) {
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSectionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!groups.some((group) => group.tasks.length > 0)) {
    return (
      <div className="p-6">
        <EmptyState label="Aucune tâche pour ce filtre." />
      </div>
    );
  }
  return (
    <>
    <div className="divide-y divide-slate-100 md:hidden">
      {groups.map((group) => {
        const groupKey = group.id ?? "unclassified";
        const isOpen = openSectionIds.has(groupKey);

        return (
          <div key={groupKey}>
            <MobileSectionHeader
              color={group.color}
              count={group.tasks.length}
              isOpen={isOpen}
              name={group.name}
              onToggle={() => toggleSection(groupKey)}
            />
            {isOpen && (
              <div className="space-y-2 bg-[var(--tsp-bg-page)] px-2 py-2.5">
                {group.tasks.map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    onChangeStatus={onChangeStatus}
                    onDeleteTask={onDeleteTask}
                    onEditTask={onEditTask}
                    onPreviewTask={onPreviewTask}
                    task={task}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>

    <div className="hidden overflow-x-auto md:block">
    <div className="min-w-[980px] divide-y divide-slate-100">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_140px_100px_130px_120px_120px_1fr_80px] gap-0 bg-slate-50/80 px-6 py-2.5">
        {["Tâche", "Statut", "Priorité", "Responsable", "Début", "Limite", "Note", ""].map((h) => (
          <div key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</div>
        ))}
      </div>
      {groups.map((group) => {
        const groupKey = group.id ?? "unclassified";
        const isOpen = openSectionIds.has(groupKey);

        return (
        <div key={groupKey} className="divide-y divide-slate-100">
          <div
            className="flex items-center justify-between gap-4 border-y border-slate-100 px-6 py-2.5"
            style={{ background: `linear-gradient(90deg, ${group.color}14 0%, ${group.color}08 42%, transparent 100%)` }}
          >
            <button
              onClick={() => toggleSection(groupKey)}
              type="button"
              aria-expanded={isOpen}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: group.color }} />
              <span className="truncate text-sm font-bold text-slate-800">{group.name}</span>
              <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                {group.tasks.length} tâche{group.tasks.length > 1 ? "s" : ""}
              </span>
            </button>
            {group.id && (
              <button
                onClick={() => onDeleteSection(group.id as string)}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                title="Supprimer la section"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isOpen && group.tasks.map((task) => {
            const isDone = task.status === "Terminé";
            const sm = STATUS_META[task.status];
            return (
              <div key={task.id}
                className={`grid grid-cols-[2fr_140px_100px_130px_120px_120px_1fr_80px] items-center gap-0 px-6 py-3.5 transition-colors hover:bg-slate-50/70 ${isDone ? "opacity-55" : ""}`}
              >
                {/* Title */}
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${sm.dot}`} />
                  <button onClick={() => onPreviewTask(task)} type="button"
                    className={`truncate text-sm font-semibold transition hover:text-[#d9140e] ${isDone ? "line-through decoration-slate-400 decoration-2 text-slate-400" : "text-slate-800"}`}>
                    {task.title}
                  </button>
                </div>
                {/* Status */}
                <div>
                  <select
                    className="h-7 rounded-md border-0 pl-2.5 pr-1 text-xs font-semibold outline-none transition"
                    style={{ ...STATUS_BADGE_STYLE[task.status], appearance: "none" }}
                    onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
                    value={task.status}
                  >
                    {TASK_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-slate-800">{s}</option>)}
                  </select>
                </div>
                {/* Priority */}
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_META[task.priority].cls}`}>{task.priority}</span>
                </div>
                {/* Responsible */}
                <div className={`flex items-center gap-1.5 pr-2 text-xs ${isDone ? "line-through text-slate-300" : "text-slate-500"}`}>
                  {task.responsible ? <><User className="h-3 w-3 text-slate-300 shrink-0" /><span className="truncate">{task.responsible}</span></> : <span className="text-slate-300">—</span>}
                </div>
                {/* Start date */}
                <div className={`text-xs ${isDone ? "line-through text-slate-300" : "text-slate-400"}`}>
                  {task.startDate ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-300" />{task.startDate}</span> : <span className="text-slate-300">—</span>}
                </div>
                {/* Due date */}
                <div>
                  {task.dueDate
                    ? <span className={`flex items-center gap-1 text-xs font-medium ${isDone ? "line-through text-slate-300" : isOverdue(task) ? "text-red-500" : "text-slate-400"}`}><Calendar className="h-3 w-3" />{task.dueDate}</span>
                    : <span className="text-xs text-slate-300">—</span>}
                </div>
                {/* Note */}
                <div className="pr-3">
                  <p className={`line-clamp-2 text-xs leading-relaxed ${isDone ? "line-through text-slate-300" : "text-slate-400"}`}>{task.note || "—"}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEditTask(task)} type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600" title="Modifier">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDeleteTask(task.id)} type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        );
      })}
    </div>
    </div>
    </>
  );
}

function MobileSectionHeader({ color, count, isOpen, name, onToggle }: {
  color: string;
  count: number;
  isOpen: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-3"
      style={{ background: `linear-gradient(90deg, ${color}14 0%, ${color}08 52%, transparent 100%)` }}
    >
      <button
        aria-expanded={isOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--tsp-text)]">{name}</span>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
          {count}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-[var(--tsp-text-secondary)] transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
}

function MobileTaskCard({ onChangeStatus, onDeleteTask, onEditTask, onPreviewTask, task }: {
  onChangeStatus: (id: string, s: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: ManagedTask) => void;
  onPreviewTask: (t: ManagedTask) => void;
  task: ManagedTask;
}) {
  const isDone = task.status === "Terminé";
  const initials = getUserInitials(task.responsible);
  const dateRange = formatTaskDateRange(task);

  return (
    <article className={`projects-surface p-[14px] ${isDone ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button
            className={`block min-w-0 flex-1 text-left text-[13px] font-semibold leading-[1.35] text-[var(--tsp-text)] ${isDone ? "line-through decoration-slate-400 decoration-2" : ""}`}
            onClick={() => onPreviewTask(task)}
            type="button"
          >
            {task.title}
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <button onClick={() => onEditTask(task)} type="button" className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-300" title="Modifier">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDeleteTask(task.id)} type="button" className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-300" title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <select
            className="h-7 appearance-none rounded-md border-0 px-2.5 pr-6 text-[11px] font-semibold outline-none"
            style={STATUS_BADGE_STYLE[task.status]}
            onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
            value={task.status}
          >
            {TASK_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-slate-800">{s}</option>)}
          </select>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_META[task.priority].cls}`}>{task.priority}</span>
        </div>

        {task.note ? (
          <p className={`mt-2 line-clamp-2 text-[12px] leading-[1.45] text-[var(--tsp-text-secondary)] ${isDone ? "line-through" : ""}`}>
            {task.note}
          </p>
        ) : null}

        <div className="mt-3 h-px bg-[var(--tsp-border)]" />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tsp-navy)] text-[10px] font-bold text-white">
              {initials}
            </div>
            <span className="truncate text-[12px] text-[var(--tsp-text-secondary)]">{task.responsible || "Non assignée"}</span>
          </div>
          <div className={`shrink-0 text-[12px] font-medium ${task.dueDate && isOverdue(task) && !isDone ? "text-[var(--tsp-red)]" : "text-[var(--tsp-text-secondary)]"}`}>
            {dateRange}
          </div>
        </div>
      </div>
    </article>
  );
}

function MobileTaskMeta({ className = "", danger, icon, label, value }: { className?: string; danger?: boolean; icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`min-w-0 rounded-xl bg-slate-50 px-2.5 py-2 ${danger ? "bg-red-50 text-red-600" : ""} ${className}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-widest ${danger ? "text-red-400" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-1 flex min-w-0 items-center gap-1.5 font-medium ${danger ? "text-red-600" : "text-slate-600"}`}>
        {icon ? <span className="shrink-0 text-slate-300">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── DOCS TAB ────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function isMarkdownDocFile(file: ProjectDocFile) {
  return file.sourceType !== "upload";
}

function isImageDocFile(file: ProjectDocFile) {
  return file.sourceType === "upload" && file.mimeType.startsWith("image/");
}

function isPdfDocFile(file: ProjectDocFile) {
  return file.sourceType === "upload" && file.mimeType === "application/pdf";
}

function getDocFileTypeLabel(file: ProjectDocFile) {
  if (isMarkdownDocFile(file)) return "MD";
  if (file.mimeType === "application/pdf") return "PDF";
  if (file.mimeType === "application/msword") return "DOC";
  if (
    file.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }
  if (file.mimeType === "image/png") return "PNG";
  if (file.mimeType === "image/webp") return "WEBP";
  if (file.mimeType === "image/jpeg") return "JPG";
  return "FICHIER";
}

function getDocTypeBadgeClass(file: ProjectDocFile) {
  if (isMarkdownDocFile(file)) {
    return "bg-[var(--tsp-bg-surface)] text-[var(--tsp-text-secondary)]";
  }

  if (isImageDocFile(file)) {
    return "bg-[#f0fdf4] text-[#15803d]";
  }

  if (isPdfDocFile(file)) {
    return "bg-[#eff6ff] text-[#1d4ed8]";
  }

  return "bg-[#fef3c7] text-[#92400e]";
}

function getDocFileSummary(file: ProjectDocFile) {
  if (isMarkdownDocFile(file)) {
    return "Note markdown";
  }

  const typeLabel = getDocFileTypeLabel(file);
  return `${typeLabel} · ${formatAttachmentSize(file.size)}`;
}

function DocsTab({ files, folders, onAddFile, onAddFolder, onDeleteFile, onDeleteFolder, onSelectFile, onUpdateFile, onUploadFiles, projectId, selectedFile }: {
  files: ProjectDocFile[]; folders: ProjectDocFolder[];
  onAddFile: (pid: string, fid: string | null, title: string) => void;
  onAddFolder: (pid: string, name: string) => void;
  onDeleteFile: (id: string) => void; onDeleteFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
  onUpdateFile: (id: string, patch: Partial<ProjectDocFile>) => void;
  onUploadFiles: (pid: string, fid: string | null, files: File[]) => Promise<ProjectDocFile[]>;
  projectId: string; selectedFile?: ProjectDocFile;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string | null>>(new Set([null]));
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [addFileTarget, setAddFileTarget] = useState<string | null | "none">("none");
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"read" | "edit">("read");
  const [mobilePanel, setMobilePanel] = useState<"browser" | "reader">("browser");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  const handleSelectFile = (id: string) => {
    onSelectFile(id);
    setViewMode("read");
    setMobilePanel("reader");
  };

  const toggleFolder = (id: string | null) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setViewMode("read");
  }, [selectedFile?.id]);

  useEffect(() => {
    if (!selectedFile) {
      setMobilePanel("browser");
    }
  }, [selectedFile]);

  const orderedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name)),
    [folders]
  );
  const rootFiles = useMemo(
    () => files.filter((file) => file.folderId === null),
    [files]
  );
  const allSearched = useMemo(
    () =>
      searchTerm.trim()
        ? files.filter((file) =>
            file.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
          )
        : null,
    [files, searchTerm]
  );

  const selectedFolder = selectedFile
    ? (selectedFile.folderId ? folders.find((f) => f.id === selectedFile.folderId) : null)
    : null;
  const activeMobilePanel = selectedFile ? mobilePanel : "browser";
  const createdAtLabel = selectedFile ? formatProjectDateTime(selectedFile.createdAt) : "";
  const updatedAtLabel = selectedFile ? formatProjectDateTime(selectedFile.updatedAt) : "";
  const canEditSelectedFile = Boolean(selectedFile && isMarkdownDocFile(selectedFile));

  const openUploadPicker = (folderId: string | null) => {
    setUploadTargetFolderId(folderId);
    fileInputRef.current?.click();
  };

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!selectedFiles.length) {
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const created = await onUploadFiles(
        projectId,
        uploadTargetFolderId,
        selectedFiles
      );
      if (created[0]) {
        onSelectFile(created[0].id);
        setViewMode("read");
        setMobilePanel("reader");
      }
    } catch (error) {
      console.error(error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Impossible d’importer ces documents."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const renderFileComposer = (folderId: string | null) => {
    if (addFileTarget !== folderId) {
      return null;
    }

    return (
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAddFile(projectId, folderId, newFileName);
          setNewFileName("");
          setAddFileTarget("none");
        }}
      >
        <input
          autoFocus
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-[var(--tsp-border)] bg-white px-3 text-[12px] text-[var(--tsp-text)] outline-none"
          onChange={(event) => setNewFileName(event.target.value)}
          placeholder="Nom de la note .md"
          value={newFileName}
        />
        <button
          className="projects-btn-primary flex h-10 w-10 items-center justify-center"
          disabled={!newFileName.trim()}
          type="submit"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="projects-btn-secondary flex h-10 w-10 items-center justify-center"
          onClick={() => setAddFileTarget("none")}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </form>
    );
  };

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] p-3 sm:p-5">
      <input
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        className="hidden"
        multiple
        onChange={handleUploadChange}
        type="file"
      />

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${activeMobilePanel === "browser" ? "block" : "hidden"} xl:block`}>
          <div className="projects-surface overflow-hidden">
            <div className="border-b border-[var(--tsp-border)] p-[14px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[var(--tsp-text-secondary)]" />
                    <p className="text-[15px] font-semibold text-[var(--tsp-text)]">Documents</p>
                    <span className="rounded-full bg-[var(--tsp-bg-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--tsp-text-secondary)]">
                      {files.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--tsp-text-secondary)]">
                    {folders.length} dossier{folders.length > 1 ? "s" : ""} · {files.length} fichier{files.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] transition ${addFolderOpen ? "bg-[var(--tsp-navy)] text-white" : "bg-white text-[var(--tsp-text-secondary)] hover:bg-[var(--tsp-bg-surface)]"}`}
                    onClick={() => setAddFolderOpen((value) => !value)}
                    title="Nouveau dossier"
                    type="button"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                  <button
                    className={`flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] transition ${addFileTarget === null ? "bg-[var(--tsp-navy)] text-white" : "bg-white text-[var(--tsp-text-secondary)] hover:bg-[var(--tsp-bg-surface)]"}`}
                    onClick={() => setAddFileTarget((value) => (value === null ? "none" : null))}
                    title="Nouvelle note"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] bg-white text-[var(--tsp-text-secondary)] transition hover:bg-[var(--tsp-bg-surface)]"
                    disabled={isUploading}
                    onClick={() => openUploadPicker(null)}
                    title="Importer des documents"
                    type="button"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {addFolderOpen ? (
                <form
                  className="mt-3 flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onAddFolder(projectId, newFolderName);
                    setNewFolderName("");
                    setAddFolderOpen(false);
                  }}
                >
                  <input
                    autoFocus
                    className="h-10 min-w-0 flex-1 rounded-[10px] border border-[var(--tsp-border)] bg-white px-3 text-[12px] text-[var(--tsp-text)] outline-none"
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Nom du dossier"
                    value={newFolderName}
                  />
                  <button
                    className="projects-btn-primary flex h-10 w-10 items-center justify-center"
                    disabled={!newFolderName.trim()}
                    type="submit"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </form>
              ) : null}

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tsp-text-secondary)]" />
                <input
                  className="h-10 w-full rounded-[10px] border border-[var(--tsp-border)] bg-white pl-10 pr-3 text-[12px] text-[var(--tsp-text)] outline-none"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher un document..."
                  value={searchTerm}
                />
              </div>

              {uploadError ? (
                <p className="mt-2 text-[12px] text-[var(--tsp-red)]">{uploadError}</p>
              ) : null}
            </div>

            <div className="max-h-[70dvh] overflow-y-auto p-2">
              {allSearched ? (
                <div className="space-y-2">
                  <div className="px-1.5 text-[11px] font-semibold uppercase tracking-[0.45px] text-[var(--tsp-text-secondary)]">
                    Résultats
                  </div>
                  {allSearched.length ? (
                    allSearched.map((file) => (
                      <DocFileRow
                        key={file.id}
                        file={file}
                        onDelete={onDeleteFile}
                        onSelect={handleSelectFile}
                        selected={selectedFile?.id === file.id}
                      />
                    ))
                  ) : (
                    <div className="projects-surface-soft px-3 py-4 text-center text-[12px] text-[var(--tsp-text-secondary)]">
                      Aucun document pour cette recherche.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="projects-surface-soft px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => toggleFolder(null)}
                        type="button"
                      >
                        <ChevronRight className={`h-3.5 w-3.5 text-[var(--tsp-text-secondary)] transition-transform ${expandedFolders.has(null) ? "rotate-90" : ""}`} />
                        <BookOpen className="h-4 w-4 text-[var(--tsp-text-secondary)]" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--tsp-text)]">Racine</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                          {rootFiles.length}
                        </span>
                      </button>
                      <button
                        className={`flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] transition ${addFileTarget === null ? "bg-[var(--tsp-navy)] text-white" : "bg-white text-[var(--tsp-text-secondary)] hover:bg-white"}`}
                        onClick={() => setAddFileTarget((value) => (value === null ? "none" : null))}
                        title="Nouvelle note"
                        type="button"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] bg-white text-[var(--tsp-text-secondary)] transition hover:bg-white"
                        onClick={() => openUploadPicker(null)}
                        title="Importer"
                        type="button"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {expandedFolders.has(null) ? (
                      <div className="mt-2 space-y-1 border-l border-[var(--tsp-border)] pl-3">
                        {rootFiles.map((file) => (
                          <DocFileRow
                            key={file.id}
                            file={file}
                            onDelete={onDeleteFile}
                            onSelect={handleSelectFile}
                            selected={selectedFile?.id === file.id}
                          />
                        ))}
                        {renderFileComposer(null)}
                        {!rootFiles.length && addFileTarget !== null ? (
                          <p className="py-2 text-[12px] text-[var(--tsp-text-secondary)]">
                            Aucun document à la racine.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {orderedFolders.map((folder) => {
                    const folderFiles = files.filter((file) => file.folderId === folder.id);
                    const isOpen = expandedFolders.has(folder.id);

                    return (
                      <div key={folder.id} className="projects-surface-soft px-3 py-2.5">
                        <div className="group flex items-center gap-2">
                          <button
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            onClick={() => toggleFolder(folder.id)}
                            type="button"
                          >
                            <ChevronRight className={`h-3.5 w-3.5 text-[var(--tsp-text-secondary)] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            {isOpen ? (
                              <FolderOpen className="h-4 w-4 text-[var(--tsp-amber)]" />
                            ) : (
                              <Folder className="h-4 w-4 text-[var(--tsp-amber)]" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--tsp-text)]">
                              {folder.name}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                              {folderFiles.length}
                            </span>
                          </button>
                          <div className="flex items-center gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                            <button
                              className={`flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] transition ${addFileTarget === folder.id ? "bg-[var(--tsp-navy)] text-white" : "bg-white text-[var(--tsp-text-secondary)] hover:bg-white"}`}
                              onClick={() => {
                                setAddFileTarget((value) =>
                                  value === folder.id ? "none" : folder.id
                                );
                                setExpandedFolders((prev) => new Set(prev).add(folder.id));
                              }}
                              title="Nouvelle note"
                              type="button"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] bg-white text-[var(--tsp-text-secondary)] transition hover:bg-white"
                              onClick={() => openUploadPicker(folder.id)}
                              title="Importer"
                              type="button"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] bg-white text-[var(--tsp-red)] transition hover:bg-[#fef2f2]"
                              onClick={() => onDeleteFolder(folder.id)}
                              title="Supprimer le dossier"
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-2 space-y-1 border-l border-[var(--tsp-border)] pl-3">
                            {folderFiles.map((file) => (
                              <DocFileRow
                                key={file.id}
                                file={file}
                                onDelete={onDeleteFile}
                                onSelect={handleSelectFile}
                                selected={selectedFile?.id === file.id}
                              />
                            ))}
                            {renderFileComposer(folder.id)}
                            {!folderFiles.length && addFileTarget !== folder.id ? (
                              <p className="py-2 text-[12px] text-[var(--tsp-text-secondary)]">
                                Aucun document dans ce dossier.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className={`${activeMobilePanel === "reader" ? "block" : "hidden"} min-w-0 xl:block`}>
          {selectedFile ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                <div className="projects-surface p-[14px] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        className="projects-btn-secondary flex h-9 w-9 shrink-0 items-center justify-center"
                        onClick={() => setMobilePanel("browser")}
                        type="button"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-[var(--tsp-text-secondary)]">
                          <span className="truncate">Docs</span>
                          <ChevronRight className="h-3 w-3 shrink-0" />
                          <span className="truncate">{selectedFolder?.name || "Racine"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      {canEditSelectedFile ? (
                        <button
                          className="projects-btn-secondary inline-flex h-9 w-9 items-center justify-center"
                          onClick={() => setViewMode((value) => (value === "edit" ? "read" : "edit"))}
                          type="button"
                        >
                          {viewMode === "edit" ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                      ) : selectedFile.assetPath ? (
                        <>
                          <a
                            className="projects-btn-secondary inline-flex h-9 w-9 items-center justify-center"
                            href={selectedFile.assetPath}
                            rel="noreferrer"
                            title="Ouvrir"
                            target="_blank"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <a
                            className="projects-btn-secondary inline-flex h-9 w-9 items-center justify-center"
                            download
                            href={selectedFile.assetPath}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </>
                      ) : null}
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] text-[var(--tsp-red)] transition hover:bg-[#fef2f2]"
                        onClick={() => onDeleteFile(selectedFile.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p
                    className="mt-3 w-full break-words font-semibold text-[var(--tsp-text)]"
                    style={{
                      fontSize: "clamp(0.98rem, 0.94rem + 0.3vw, 1.12rem)",
                      letterSpacing: 0,
                      lineHeight: 1.35,
                    }}
                  >
                    {selectedFile.title}
                  </p>

                  {!isMarkdownDocFile(selectedFile) ? (
                    <p className="mt-2 text-[12px] text-[var(--tsp-text-secondary)]">
                      {formatAttachmentSize(selectedFile.size)}
                    </p>
                  ) : null}
                </div>

                {canEditSelectedFile && viewMode === "edit" ? (
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                    <div className="projects-surface p-[14px] sm:p-5">
                      <label className="projects-label">Nom du fichier</label>
                      <input
                        className="mt-2 h-11 w-full rounded-[10px] border border-[var(--tsp-border)] bg-white px-3 text-[13px] text-[var(--tsp-text)] outline-none"
                        onChange={(event) =>
                          onUpdateFile(selectedFile.id, { title: event.target.value })
                        }
                        value={selectedFile.title}
                      />

                      <label className="projects-label mt-5 block">Contenu markdown</label>
                      <textarea
                        className="mt-2 min-h-[380px] w-full resize-none rounded-[10px] border border-[var(--tsp-border)] bg-white px-3 py-3 font-mono text-[13px] leading-[1.7] text-[var(--tsp-text)] outline-none"
                        onChange={(event) =>
                          onUpdateFile(selectedFile.id, {
                            contentMarkdown: event.target.value,
                          })
                        }
                        placeholder="Commencez à rédiger votre document..."
                        value={selectedFile.contentMarkdown}
                      />
                    </div>

                    <div className="projects-surface p-[14px] sm:p-5">
                      <p className="projects-label">Aperçu</p>
                      <div className="mt-3">
                        <MarkdownPreview content={selectedFile.contentMarkdown} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="projects-surface p-[14px] sm:p-5">
                    {isMarkdownDocFile(selectedFile) ? (
                      <MarkdownPreview content={selectedFile.contentMarkdown} />
                    ) : (
                      <UploadedDocPreview file={selectedFile} />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="projects-surface p-[14px] sm:p-5">
                  <p className="projects-label">Résumé</p>
                  <p className="mt-3 text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]">
                    {isMarkdownDocFile(selectedFile)
                      ? "Cette note est disponible en lecture par défaut et peut être modifiée manuellement si besoin."
                      : `Ce document importé est disponible en consultation directe dans l’espace projet au format ${getDocFileTypeLabel(selectedFile)}.`}{" "}
                    {selectedFolder
                      ? `Il est classé dans le dossier ${selectedFolder.name}.`
                      : "Il est classé à la racine."}{" "}
                    {createdAtLabel
                      ? `Créé le ${createdAtLabel}${selectedFile.createdBy ? ` par ${selectedFile.createdBy}` : ""}.`
                      : ""}{" "}
                    {updatedAtLabel
                      ? `Dernière mise à jour le ${updatedAtLabel}${selectedFile.updatedBy ? ` par ${selectedFile.updatedBy}` : ""}.`
                      : ""}
                  </p>

                  {(selectedFile.createdBy || selectedFile.updatedBy) ? (
                    <div className="projects-surface-soft mt-4 px-3 py-3.5">
                      {selectedFile.createdBy ? (
                        <p className="text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]">
                          Créé par <span className="font-semibold text-[var(--tsp-text)]">{selectedFile.createdBy}</span>
                          {createdAtLabel ? ` le ${createdAtLabel}` : ""}.
                        </p>
                      ) : null}
                      {selectedFile.updatedBy ? (
                        <p className="mt-1 text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]">
                          Dernière modification par <span className="font-semibold text-[var(--tsp-text)]">{selectedFile.updatedBy}</span>
                          {updatedAtLabel ? ` le ${updatedAtLabel}` : ""}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="projects-surface flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="projects-surface-soft flex h-16 w-16 items-center justify-center rounded-[10px]">
                <FileText className="h-7 w-7 text-[var(--tsp-text-secondary)]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--tsp-text)]">Aucun document sélectionné</p>
                <p className="mt-1 text-[12px] text-[var(--tsp-text-secondary)]">
                  Ouvrez un fichier, créez une note markdown ou importez un document.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  className="projects-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-[12px] font-semibold"
                  onClick={() => setAddFileTarget(null)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle note</span>
                </button>
                <button
                  className="projects-btn-primary inline-flex h-10 items-center gap-2 px-3 text-[12px] font-semibold"
                  onClick={() => openUploadPicker(null)}
                  type="button"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer des docs</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DocFileRow({ file, selected, onSelect, onDelete }: {
  file: ProjectDocFile; selected: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-2">
      <button
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-[10px] border px-2.5 py-2.5 text-left transition ${selected ? "border-[var(--tsp-border)] bg-white" : "border-transparent bg-transparent hover:bg-white/75"}`}
        onClick={() => onSelect(file.id)}
        type="button"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${selected ? "bg-[var(--tsp-navy)] text-white" : "bg-white text-[var(--tsp-text-secondary)]"}`}>
          {file.sourceType === "upload" ? (
            <Paperclip className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate text-[13px] font-semibold ${selected ? "text-[var(--tsp-text)]" : "text-[var(--tsp-text)]"}`}>
              {file.title}
            </p>
            <span className={`hidden rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex ${getDocTypeBadgeClass(file)}`}>
              {getDocFileTypeLabel(file)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--tsp-text-secondary)]">
            {getDocFileSummary(file)}
          </p>
        </div>
      </button>
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] text-[var(--tsp-red)] opacity-100 transition hover:bg-[#fef2f2] md:opacity-0 md:group-hover:opacity-100"
        onClick={() => onDelete(file.id)}
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function UploadedDocPreview({ file }: { file: ProjectDocFile }) {
  if (!file.assetPath) {
    return (
      <div className="projects-surface-soft px-4 py-5 text-[13px] text-[var(--tsp-text-secondary)]">
        Le fichier n’est plus disponible à l’affichage.
      </div>
    );
  }

  if (isImageDocFile(file)) {
    return (
      <div className="space-y-3">
        <div className="projects-surface-soft flex items-center justify-between gap-3 px-3 py-3">
          <div>
            <p className="text-[14px] font-semibold text-[var(--tsp-text)]">{file.title}</p>
            <p className="mt-0.5 text-[12px] text-[var(--tsp-text-secondary)]">
              Image importée · {formatAttachmentSize(file.size)}
            </p>
          </div>
          <a
            className="projects-btn-secondary inline-flex h-9 items-center gap-2 px-3 text-[12px] font-semibold"
            href={file.assetPath}
            rel="noreferrer"
            target="_blank"
          >
            <Eye className="h-4 w-4" />
            <span>Ouvrir</span>
          </a>
        </div>
        <div className="relative overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white">
          <div className="relative aspect-[4/3] w-full">
            <Image
              alt={file.title}
              className="object-contain"
              fill
              src={file.assetPath}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isPdfDocFile(file)) {
    return (
      <div className="space-y-3">
        <div className="projects-surface-soft flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <div>
            <p className="text-[14px] font-semibold text-[var(--tsp-text)]">{file.title}</p>
            <p className="mt-0.5 text-[12px] text-[var(--tsp-text-secondary)]">
              PDF · {formatAttachmentSize(file.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="projects-btn-secondary inline-flex h-9 items-center gap-2 px-3 text-[12px] font-semibold"
              href={file.assetPath}
              rel="noreferrer"
              target="_blank"
            >
              <Eye className="h-4 w-4" />
              <span>Ouvrir</span>
            </a>
            <a
              className="projects-btn-secondary inline-flex h-9 w-9 items-center justify-center"
              download
              href={file.assetPath}
              title="Télécharger"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white">
          <iframe
            className="h-[62vh] min-h-[420px] w-full"
            src={`${file.assetPath}#toolbar=0`}
            title={file.title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="projects-surface-soft px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-white text-[var(--tsp-text-secondary)]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--tsp-text)]">{file.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--tsp-text-secondary)]">
            {getDocFileTypeLabel(file)} · {formatAttachmentSize(file.size)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-[1.6] text-[var(--tsp-text-secondary)]">
        Ce document est stocké dans l’espace projet. Ouvrez-le dans un nouvel onglet ou téléchargez-le pour le consulter.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          className="projects-btn-primary inline-flex h-10 items-center gap-2 px-3 text-[12px] font-semibold"
          href={file.assetPath}
          rel="noreferrer"
          target="_blank"
        >
          <Eye className="h-4 w-4" />
          <span>Ouvrir le document</span>
        </a>
        <a
          className="projects-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-[12px] font-semibold"
          download
          href={file.assetPath}
        >
          <Download className="h-4 w-4" />
          <span>Télécharger</span>
        </a>
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="projects-surface-soft px-4 py-5 text-[13px] text-[var(--tsp-text-secondary)]">
        Ce document est vide pour le moment.
      </div>
    );
  }

  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-[13px] leading-[1.75] text-[var(--tsp-text-secondary)]">
      {lines.map((line, i) => {
        if (line.startsWith("# "))
          return <h1 key={i} className="mb-3 mt-6 border-b border-[var(--tsp-border)] pb-2 text-[18px] font-bold tracking-tight text-[var(--tsp-text)] first:mt-0 sm:text-[20px]">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="mb-2 mt-5 text-[15px] font-bold text-[var(--tsp-text)] sm:text-[17px]">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="mb-1.5 mt-4 text-[14px] font-semibold text-[var(--tsp-text)] sm:text-[15px]">{line.slice(4)}</h3>;
        if (line.startsWith("**") && line.endsWith("**"))
          return <p key={i} className="font-semibold text-[var(--tsp-text)]">{line.slice(2, -2)}</p>;
        if (line.startsWith("- "))
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tsp-red)]" />
              <span className="text-[var(--tsp-text-secondary)]">{line.slice(2)}</span>
            </div>
          );
        if (line.match(/^\d+\. /))
          return <div key={i} className="flex gap-2.5 text-[var(--tsp-text-secondary)]"><span className="shrink-0 font-medium text-[var(--tsp-text-secondary)]">{line.match(/^(\d+)\./)?.[1]}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-2 border-[var(--tsp-red)]/30 pl-4 italic text-[var(--tsp-text-secondary)]">{line.slice(2)}</blockquote>;
        if (line.startsWith("---"))
          return <hr key={i} className="border-[var(--tsp-border)]" />;
        if (!line.trim())
          return <div key={i} className="h-2" />;
        return <p key={i} className="whitespace-pre-wrap text-[var(--tsp-text-secondary)]">{line}</p>;
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── INTERVENTIONS TAB ───────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function InterventionsTab({
  interventions,
  onCreate,
  onDelete,
  onEdit,
  onPreview,
}: {
  interventions: ProjectIntervention[];
  onCreate: () => void;
  onDelete: (id: string) => void;
  onEdit: (intervention: ProjectIntervention) => void;
  onPreview: (intervention: ProjectIntervention) => void;
}) {
  const [departmentFilter, setDepartmentFilter] = useState("Tous");
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | "Tous">("Tous");
  const [monthFilter, setMonthFilter] = useState("Tous");

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          interventions
            .map((intervention) => intervention.department.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [interventions]
  );

  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          interventions
            .map((intervention) => intervention.interventionDate.slice(0, 7))
            .filter(Boolean)
        )
      )
        .sort()
        .reverse(),
    [interventions]
  );

  const filteredInterventions = useMemo(
    () =>
      interventions
        .filter(
          (intervention) =>
            (departmentFilter === "Tous" ||
              intervention.department === departmentFilter) &&
            (statusFilter === "Tous" || intervention.status === statusFilter) &&
            (monthFilter === "Tous" ||
              intervention.interventionDate.startsWith(monthFilter))
        )
        .sort((a, b) => {
          const aKey = `${a.interventionDate}T${a.interventionTime || "00:00"}`;
          const bKey = `${b.interventionDate}T${b.interventionTime || "00:00"}`;
          return bKey.localeCompare(aKey);
        }),
    [departmentFilter, interventions, monthFilter, statusFilter]
  );

  const stats = useMemo(() => {
    const doneInterventions = interventions.filter(
      (intervention) => intervention.status === "Réalisée"
    );

    return {
      cancelled: interventions.filter(
        (intervention) => intervention.status === "Annulée"
      ).length,
      done: doneInterventions.length,
      postponed: interventions.filter(
        (intervention) => intervention.status === "Reportée"
      ).length,
      revenue: doneInterventions.reduce(
        (sum, intervention) => sum + intervention.price,
        0
      ),
      total: interventions.length,
    };
  }, [interventions]);

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] p-3 sm:p-5">
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InterventionStat label="Total" value={String(stats.total)} />
            <InterventionStat label="CA réalisé" value={formatCurrency(stats.revenue)} />
            <InterventionStat
              label="Réalisées"
              value={String(stats.done)}
              tone="green"
            />
            <InterventionStat
              danger={stats.postponed > 0 || stats.cancelled > 0}
              label="À surveiller"
              value={String(stats.postponed + stats.cancelled)}
              tone={stats.cancelled > 0 ? "red" : "amber"}
            />
          </div>

          <div className="projects-surface flex flex-col justify-between gap-3 p-[14px] sm:p-5">
            <div>
              <p className="projects-label mb-1">Interventions</p>
              <p className="text-[14px] font-semibold text-[var(--tsp-text)]">
                Planning, exécution et preuves terrain.
              </p>
              <p className="mt-1 text-[12px] leading-[1.6] text-[var(--tsp-text-secondary)]">
                Créez une intervention, suivez son statut et ouvrez sa fiche dédiée
                pour les photos, les reports et l’historique.
              </p>
            </div>
            <button
              className="projects-btn-primary flex h-11 items-center justify-center gap-2 text-[13px] font-semibold"
              onClick={onCreate}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle intervention
            </button>
          </div>
        </div>

        <div className="projects-surface flex flex-col gap-2 p-[14px] sm:flex-row sm:flex-wrap sm:items-center sm:p-3">
          <label className="projects-surface-soft flex h-10 items-center gap-2 px-3 text-[12px] text-[var(--tsp-text-secondary)]">
            <Filter className="h-3.5 w-3.5" />
            <select
              className="min-w-0 bg-transparent outline-none"
              onChange={(e) =>
                setStatusFilter(e.target.value as InterventionStatus | "Tous")
              }
              value={statusFilter}
            >
              <option value="Tous">Tous statuts</option>
              {INTERVENTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="projects-surface-soft flex h-10 items-center gap-2 px-3 text-[12px] text-[var(--tsp-text-secondary)]">
            <Calendar className="h-3.5 w-3.5" />
            <select
              className="min-w-0 bg-transparent outline-none"
              onChange={(e) => setMonthFilter(e.target.value)}
              value={monthFilter}
            >
              <option value="Tous">Tous les mois</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label className="projects-surface-soft flex h-10 items-center gap-2 px-3 text-[12px] text-[var(--tsp-text-secondary)]">
            <FolderKanban className="h-3.5 w-3.5" />
            <select
              className="min-w-0 bg-transparent outline-none"
              onChange={(e) => setDepartmentFilter(e.target.value)}
              value={departmentFilter}
            >
              <option value="Tous">Tous départements</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredInterventions.length ? (
          <>
            <div className="projects-surface hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <div className="min-w-[1120px]">
                  <div className="grid grid-cols-[170px_1.1fr_1.2fr_110px_130px_1.5fr_110px] px-5 py-3">
                    {[
                      "Planning",
                      "Lieu",
                      "Prestation",
                      "Prix",
                      "Statut",
                      "Suivi",
                      "",
                    ].map((header) => (
                      <div
                        key={header}
                        className="projects-label text-[11px]"
                      >
                        {header}
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-[var(--tsp-border)]">
                    {filteredInterventions.map((intervention) => (
                      <InterventionTableRow
                        key={intervention.id}
                        intervention={intervention}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onPreview={onPreview}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredInterventions.map((intervention) => (
                <InterventionMobileCard
                  key={intervention.id}
                  intervention={intervention}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onPreview={onPreview}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState label="Aucune intervention pour ces filtres." small />
        )}
      </div>
    </div>
  );
}

function InterventionStat({
  danger,
  label,
  tone = "slate",
  value,
}: {
  danger?: boolean;
  label: string;
  tone?: "amber" | "green" | "red" | "slate";
  value: string;
}) {
  const tones = {
    amber: "text-[#d97706]",
    green: "text-[#16a34a]",
    red: "text-[#dc2626]",
    slate: "text-[var(--tsp-text)]",
  };

  return (
    <div className="projects-surface p-[14px] text-center">
      <p
        className={`truncate text-[20px] font-bold ${
          danger ? "text-[#dc2626]" : tones[tone]
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-[var(--tsp-text-secondary)]">
        {label}
      </p>
    </div>
  );
}

function InterventionTableRow({
  intervention,
  onDelete,
  onEdit,
  onPreview,
}: {
  intervention: ProjectIntervention;
  onDelete: (id: string) => void;
  onEdit: (intervention: ProjectIntervention) => void;
  onPreview: (intervention: ProjectIntervention) => void;
}) {
  const meta = INTERVENTION_META[intervention.status];

  return (
    <div className="group grid grid-cols-[170px_1.1fr_1.2fr_110px_130px_1.5fr_110px] items-center px-5 py-3 transition hover:bg-white">
      <div className="pr-4">
        <p className="text-[13px] font-semibold text-[var(--tsp-text)]">
          {formatTaskLongDate(intervention.interventionDate) || intervention.interventionDate || "—"}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--tsp-text-secondary)]">
          {intervention.interventionTime || "Heure à définir"}
        </p>
      </div>

      <div className="min-w-0 pr-4">
        <p className="truncate text-[13px] font-semibold text-[var(--tsp-text)]">
          {intervention.address || "Adresse à préciser"}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--tsp-text-secondary)]">
          {[intervention.city, intervention.department].filter(Boolean).join(" · ") || "Ville et département à préciser"}
        </p>
      </div>

      <div className="min-w-0 pr-4">
        <button
          className="truncate text-left text-[13px] font-semibold text-[var(--tsp-text)] hover:text-[var(--tsp-accent-blue)]"
          onClick={() => onPreview(intervention)}
          type="button"
        >
          {intervention.prestation}
        </button>
        <p className="mt-0.5 text-[12px] text-[var(--tsp-text-secondary)]">
          {intervention.photoPaths.length
            ? `${intervention.photoPaths.length} photo${intervention.photoPaths.length > 1 ? "s" : ""}`
            : "Sans photo"}
        </p>
      </div>

      <div className="text-[13px] font-semibold text-[var(--tsp-text)]">
        {formatCurrency(intervention.price)}
      </div>

      <div>
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}
        >
          {intervention.status}
        </span>
      </div>

      <div className="min-w-0 pr-3">
        <p className="line-clamp-2 text-[12px] leading-[1.55] text-[var(--tsp-text-secondary)]">
          {buildInterventionMetaLine(intervention)}
        </p>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          aria-label="Aperçu"
          className="projects-btn-secondary flex h-8 w-8 items-center justify-center opacity-0 transition group-hover:opacity-100 hover:opacity-100"
          onClick={() => onPreview(intervention)}
          type="button"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Modifier"
          className="projects-btn-secondary flex h-8 w-8 items-center justify-center opacity-0 transition group-hover:opacity-100 hover:opacity-100"
          onClick={() => onEdit(intervention)}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Supprimer"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] text-[var(--tsp-red)] opacity-0 transition group-hover:opacity-100 hover:bg-[#fef2f2] hover:opacity-100"
          onClick={() => onDelete(intervention.id)}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function InterventionMobileCard({
  intervention,
  onDelete,
  onEdit,
  onPreview,
}: {
  intervention: ProjectIntervention;
  onDelete: (id: string) => void;
  onEdit: (intervention: ProjectIntervention) => void;
  onPreview: (intervention: ProjectIntervention) => void;
}) {
  const meta = INTERVENTION_META[intervention.status];

  return (
    <article className="projects-surface p-[14px]">
      <button className="block w-full text-left" onClick={() => onPreview(intervention)} type="button">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-[1.45] text-[var(--tsp-text)]">
              {intervention.prestation}
            </p>
            <p className="mt-1 text-[12px] text-[var(--tsp-text-secondary)]">
              {formatInterventionDateTime(intervention)}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}
          >
            {intervention.status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <MobileTaskMeta label="Département" value={intervention.department || "—"} />
          <MobileTaskMeta label="Ville" value={intervention.city || "—"} />
          <MobileTaskMeta className="col-span-2" label="Adresse" value={intervention.address || "—"} />
          <MobileTaskMeta label="Prix" value={formatCurrency(intervention.price)} />
          <MobileTaskMeta
            label="Photos"
            value={`${intervention.photoPaths.length} photo${intervention.photoPaths.length > 1 ? "s" : ""}`}
          />
        </div>

        {buildInterventionMetaLine(intervention) !== "—" ? (
          <div className="projects-surface-soft mt-3 px-3 py-3">
            <p className="text-[12px] leading-[1.6] text-[var(--tsp-text-secondary)]">
              {buildInterventionMetaLine(intervention)}
            </p>
          </div>
        ) : null}
      </button>

      <div className="mt-3 flex gap-2">
        <button
          className="projects-btn-secondary flex h-10 flex-1 items-center justify-center gap-1.5 text-[12px] font-semibold"
          onClick={() => onPreview(intervention)}
          type="button"
        >
          <Eye className="h-3.5 w-3.5" />
          Aperçu
        </button>
        <button
          aria-label="Modifier"
          className="projects-btn-secondary flex h-10 w-10 items-center justify-center"
          onClick={() => onEdit(intervention)}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Supprimer"
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] text-[var(--tsp-red)] transition hover:bg-[#fef2f2]"
          onClick={() => onDelete(intervention.id)}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function buildInterventionMetaLine(intervention: ProjectIntervention) {
  const details = [];

  if (intervention.note.trim()) details.push(intervention.note.trim());
  if (intervention.status === "Reportée" && intervention.reportDate) {
    details.push(`Nouvelle date : ${formatTaskLongDate(intervention.reportDate) || intervention.reportDate}`);
  }
  if (
    intervention.status === "Annulée" &&
    intervention.cancellationReason.trim()
  ) {
    details.push(`Cause : ${intervention.cancellationReason.trim()}`);
  }
  if (
    intervention.status === "Réalisée" &&
    intervention.photoPaths.length > 0
  ) {
    details.push(
      `${intervention.photoPaths.length} photo${intervention.photoPaths.length > 1 ? "s" : ""}`
    );
  }

  return details.join(" · ") || "—";
}

function buildInterventionSummarySentences(intervention: ProjectIntervention) {
  const createdAt = formatProjectDateTime(intervention.createdAt);
  const scheduledDate = formatTaskLongDate(intervention.interventionDate);
  const reportedDate = formatTaskLongDate(intervention.reportDate);

  const scheduleParts = [
    scheduledDate ? `prévue le ${scheduledDate}` : "",
    intervention.interventionTime ? `à ${intervention.interventionTime}` : "",
    intervention.address ? `au ${intervention.address}` : "",
    intervention.city ? `à ${intervention.city}` : "",
    intervention.department ? `(${intervention.department})` : "",
  ].filter(Boolean);

  const sentences = [
    createdAt
      ? `Cette intervention a été créée le ${createdAt}${intervention.createdBy ? ` par ${intervention.createdBy}` : ""}.`
      : "",
    scheduleParts.length
      ? `Elle est ${scheduleParts.join(" ")}.`
      : "",
    intervention.prestation
      ? `La prestation prévue est ${intervention.prestation.toLowerCase()} pour un montant de ${formatCurrency(intervention.price)}.`
      : "",
    `Elle est actuellement marquée comme ${intervention.status.toLowerCase()}.`,
    intervention.status === "Reportée" && reportedDate
      ? `La nouvelle date annoncée est le ${reportedDate}.`
      : "",
    intervention.status === "Annulée" && intervention.cancellationReason.trim()
      ? `La cause d’annulation indiquée est : ${intervention.cancellationReason.trim()}.`
      : "",
    intervention.status === "Réalisée" && intervention.photoPaths.length
      ? `${intervention.photoPaths.length} photo${intervention.photoPaths.length > 1 ? "s ont été ajoutées" : " a été ajoutée"} comme preuve d’exécution.`
      : "",
  ].filter(Boolean);

  return sentences;
}

function InterventionPreviewPage({
  activityLogs,
  intervention,
  onBack,
  onDelete,
  onEdit,
}: {
  activityLogs: ProjectActivityLog[];
  intervention: ProjectIntervention;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const meta = INTERVENTION_META[intervention.status];
  const history = useMemo(
    () =>
      activityLogs
        .filter(
          (log) =>
            log.entityType === "intervention" && log.entityId === intervention.id
        )
        .slice(0, 12),
    [activityLogs, intervention.id]
  );
  const summarySentences = buildInterventionSummarySentences(intervention);

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  aria-label="Retour"
                  className="projects-btn-secondary flex h-8 w-8 shrink-0 items-center justify-center sm:h-9 sm:w-9"
                  onClick={onBack}
                  type="button"
                >
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label="Modifier"
                    className="projects-btn-secondary flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                    onClick={onEdit}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Supprimer"
                    className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] text-[var(--tsp-red)] transition hover:bg-[#fef2f2] sm:h-9 sm:w-9"
                    onClick={onDelete}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <p className="projects-label">Interventions</p>
                <div
                  aria-level={2}
                  className="mt-1 font-bold text-[var(--tsp-text)]"
                  role="heading"
                  style={TASK_PANEL_TITLE_STYLE}
                >
                  Aperçu intervention
                </div>
                <p className="mt-2 break-words text-[15px] font-semibold leading-[1.45] text-[var(--tsp-text)] sm:text-[16px]">
                  {intervention.prestation}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>
                  {intervention.status}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                  {formatInterventionDateTime(intervention)}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                  {formatCurrency(intervention.price)}
                </span>
              </div>
            </div>
          </div>

          {intervention.note.trim() ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <p className="projects-label mb-2">Note</p>
              <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--tsp-text-secondary)]">
                {intervention.note}
              </p>
            </div>
          ) : null}

          {intervention.photoPaths.length ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="projects-label mb-1 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Photos d’intervention
                  </p>
                  <p className="text-[12px] text-[var(--tsp-text-secondary)]">
                    {intervention.photoPaths.length} photo{intervention.photoPaths.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {intervention.photoPaths.map((photoPath) => (
                  <a
                    key={photoPath}
                    className="relative block overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white"
                    href={photoPath}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Image
                      alt="Photo d’intervention"
                      className="h-32 w-full object-cover"
                      height={256}
                      src={photoPath}
                      unoptimized
                      width={256}
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {history.length ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <p className="projects-label mb-3">Historique</p>
              <div className="space-y-2">
                {history.map((log) => (
                  <ActivityLogItem key={log.id} log={log} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <p className="projects-label mb-3">Informations</p>
            <div className="projects-surface-soft px-3 py-3.5">
              <div className="space-y-2">
                {summarySentences.map((sentence, index) => (
                  <p
                    key={`${intervention.id}-summary-${index}`}
                    className="text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]"
                  >
                    {sentence}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterventionEditorPage({
  defaultProjectId,
  intervention,
  onClose,
  onSave,
}: {
  defaultProjectId: string;
  intervention: ProjectIntervention | null;
  onClose: () => void;
  onSave: (draft: Omit<ProjectIntervention, "id">, interventionId?: string) => void;
}) {
  const [draft, setDraft] = useState<InterventionDraft>(
    intervention ?? buildBlankIntervention(defaultProjectId)
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const isEditing = Boolean(intervention);
  const fileInputId = useMemo(() => `intervention-photos-${createId("input")}`, []);

  const handlePhotoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      setError("");
      setIsUploadingPhotos(true);
      try {
        const formData = new FormData();
        formData.append("projectId", defaultProjectId);
        Array.from(files).forEach((file) => formData.append("files", file));

        const response = await fetch("/api/projects/interventions/upload", {
          body: formData,
          method: "POST",
        });

        const payload = (await response.json()) as {
          error?: string;
          paths?: string[];
        };

        if (!response.ok || !payload.paths) {
          throw new Error(payload.error || "Impossible d’envoyer les photos.");
        }

        setDraft((current) => ({
          ...current,
          photoPaths: [...current.photoPaths, ...payload.paths!],
        }));
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Impossible d’envoyer les photos."
        );
      } finally {
        setIsUploadingPhotos(false);
      }
    },
    [defaultProjectId]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      const cleanDraft = sanitizeInterventionDraft({
        ...draft,
        projectId: defaultProjectId,
      });
      const validationError = validateInterventionDraft(cleanDraft);

      if (validationError) {
        setError(validationError);
        setIsSubmitting(false);
        return;
      }

      setError("");
      onSave(cleanDraft, intervention?.id);
      setIsSubmitting(false);
    },
    [defaultProjectId, draft, intervention?.id, onSave]
  );

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)]">
      <form
        className="grid gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  className="projects-btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
                  onClick={onClose}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="projects-label">Interventions</p>
                  <div
                    aria-level={2}
                    className="mt-1 font-bold text-[var(--tsp-text)]"
                    role="heading"
                    style={TASK_PANEL_TITLE_STYLE}
                  >
                    {isEditing ? "Modifier l’intervention" : "Nouvelle intervention"}
                  </div>
                </div>
              </div>
              <span className="hidden rounded-md bg-[var(--tsp-bg-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)] sm:inline-flex">
                {isEditing ? "Mise à jour" : "Création"}
              </span>
            </div>
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="grid gap-3">
              <div>
                <label className="projects-label mb-2 block">Prestation</label>
                <input
                  autoFocus
                  required
                  className="h-11 w-full px-3 text-[13px]"
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      prestation: e.target.value,
                    }))
                  }
                  placeholder="Ex : Nettoyage canapé premium"
                  value={draft.prestation}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="projects-label mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Date d’intervention
                  </label>
                  <input
                    type="date"
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        interventionDate: e.target.value,
                      }))
                    }
                    value={draft.interventionDate}
                  />
                </div>
                <div>
                  <label className="projects-label mb-2 flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Heure
                  </label>
                  <input
                    type="time"
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        interventionTime: e.target.value,
                      }))
                    }
                    value={draft.interventionTime}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="projects-label mb-2 block">Département</label>
                  <input
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        department: e.target.value,
                      }))
                    }
                    placeholder="Ex : 75"
                    value={draft.department}
                  />
                </div>
                <div>
                  <label className="projects-label mb-2 block">Ville</label>
                  <input
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        city: e.target.value,
                      }))
                    }
                    placeholder="Ex : Paris"
                    value={draft.city}
                  />
                </div>
              </div>

              <div>
                <label className="projects-label mb-2 block">Adresse</label>
                <input
                  className="h-11 w-full px-3 text-[13px]"
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Adresse complète"
                  value={draft.address}
                />
              </div>
            </div>
          </div>

          {draft.status === "Réalisée" ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="projects-label mb-1 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Photos d’intervention
                  </p>
                  <p className="text-[12px] text-[var(--tsp-text-secondary)]">
                    Ajoutez les preuves avant/après.
                  </p>
                </div>
                <label className="projects-btn-secondary inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[12px] font-semibold">
                  <Upload className="h-3.5 w-3.5" />
                  Ajouter
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    id={fileInputId}
                    multiple
                    onChange={async (event) => {
                      await handlePhotoUpload(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                </label>
              </div>

              {isUploadingPhotos ? (
                <p className="mt-3 text-[12px] text-[var(--tsp-text-secondary)]">
                  Upload en cours…
                </p>
              ) : null}

              {draft.photoPaths.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {draft.photoPaths.map((photoPath) => (
                    <div
                      key={photoPath}
                      className="relative overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white"
                    >
                      <Image
                        alt="Photo d’intervention"
                        className="h-32 w-full object-cover"
                        height={256}
                        src={photoPath}
                        unoptimized
                        width={256}
                      />
                      <button
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-slate-950/60 text-white"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            photoPaths: current.photoPaths.filter(
                              (path) => path !== photoPath
                            ),
                          }))
                        }
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="projects-surface-soft mt-4 px-3 py-3 text-[12px] text-[var(--tsp-text-secondary)]">
                  Aucune photo ajoutée pour le moment.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <div>
              <label className="projects-label mb-2 block">Statut</label>
              <div className="grid grid-cols-2 gap-2">
                {INTERVENTION_STATUSES.map((status) => {
                  const active = draft.status === status;
                  const meta = INTERVENTION_META[status];
                  return (
                    <button
                      key={status}
                      className={`flex h-10 items-center justify-center rounded-[10px] border text-[11px] font-semibold transition ${
                        active
                          ? meta.cls
                          : "border-[var(--tsp-border)] bg-white text-[var(--tsp-text-secondary)]"
                      }`}
                      onClick={() =>
                        setDraft((current) =>
                          applyInterventionStatus(current, status)
                        )
                      }
                      type="button"
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <label className="projects-label mb-2 block">Prix</label>
              <input
                min="0"
                step="0.01"
                type="number"
                className="h-11 w-full px-3 text-[13px]"
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    price: parsePrice(e.target.value),
                  }))
                }
                placeholder="0"
                value={draft.price || ""}
              />
            </div>

            {draft.status === "Reportée" ? (
              <div className="mt-4">
                <label className="projects-label mb-2 block">Nouvelle date</label>
                <input
                  type="date"
                  className="h-11 w-full px-3 text-[13px]"
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      reportDate: e.target.value,
                    }))
                  }
                  value={draft.reportDate}
                />
              </div>
            ) : null}

            {draft.status === "Annulée" ? (
              <div className="mt-4">
                <label className="projects-label mb-2 block">Cause d’annulation</label>
                <textarea
                  className="min-h-[100px] w-full resize-none px-3 py-3 text-[13px]"
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      cancellationReason: e.target.value,
                    }))
                  }
                  placeholder="Expliquez la cause d’annulation"
                  value={draft.cancellationReason}
                />
              </div>
            ) : null}

            <div className="mt-4">
              <label className="projects-label mb-2 block">Note</label>
              <textarea
                className="min-h-[120px] w-full resize-none px-3 py-3 text-[13px]"
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    note: e.target.value,
                  }))
                }
                placeholder="Contexte, accès, consignes, détails terrain…"
                value={draft.note}
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-[10px] bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#dc2626]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="projects-btn-secondary h-11 flex-1 text-[13px] font-semibold"
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="projects-btn-primary h-11 flex-1 text-[13px] font-semibold"
                disabled={isSubmitting || isUploadingPhotos}
                type="submit"
              >
                {isSubmitting
                  ? "Enregistrement..."
                  : isEditing
                    ? "Enregistrer les changements"
                    : "Créer l’intervention"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── SUIVI TAB ───────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function SuiviTab({ fields, updates, project, onAddField, onUpdateField, onDeleteField, onAddUpdate, onDeleteUpdate }: {
  fields: ProjectTrackingField[]; updates: ProjectUpdate[]; project: ManagedProject;
  onAddField: (pid: string, label: string) => void;
  onUpdateField: (id: string, patch: Partial<ProjectTrackingField>) => void;
  onDeleteField: (id: string) => void;
  onAddUpdate: (u: Omit<ProjectUpdate, "id">) => void;
  onDeleteUpdate: (id: string) => void;
}) {
  const [fieldLabel, setFieldLabel] = useState("");
  const [updateForm, setUpdateForm] = useState({ date: new Date().toISOString().slice(0, 10), title: "", note: "" });

  return (
    <div className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-[1fr_300px]">

      {/* KPIs */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Indicateurs</h2>
            <p className="text-xs text-slate-400">Métriques libres, adaptées au projet</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onAddField(project.id, fieldLabel); setFieldLabel(""); }}>
            <input className="h-9 min-w-[180px] rounded-xl border border-slate-200 px-3 text-sm placeholder-slate-400 outline-none focus:border-[#d9140e]/40 focus:ring-1 focus:ring-[#d9140e]/15" onChange={(e) => setFieldLabel(e.target.value)} placeholder="Nouvel indicateur…" value={fieldLabel} />
            <button type="submit" disabled={!fieldLabel.trim()} className="projects-btn-primary flex h-9 items-center gap-1.5 px-4 text-sm font-semibold disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </form>
        </div>

        {/* KPI cards grid */}
        {fields.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_110px_110px_80px_130px_1fr_40px] gap-0 bg-slate-50/80 px-5 py-2.5">
              {["Indicateur", "Actuel", "Objectif", "Unité", "Statut", "Note", ""].map((h) => (
                <div key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</div>
              ))}
            </div>
            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {fields.map((field) => {
                const tm = TRACKING_META[field.status];
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_110px_110px_80px_130px_1fr_40px] items-center gap-0 px-5 py-3 transition-colors hover:bg-slate-50/60">
                    {/* Label */}
                    <div className="flex items-center gap-2 pr-4">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${tm.bar}`} />
                      <input className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent text-sm font-semibold text-slate-700 outline-none focus:border-slate-200 focus:bg-white focus:px-2" onChange={(e) => onUpdateField(field.id, { label: e.target.value })} value={field.label} />
                    </div>
                    {/* Value */}
                    <div className="pr-2"><input className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-[#d9140e]/40 focus:bg-white" onChange={(e) => onUpdateField(field.id, { value: e.target.value })} value={field.value} /></div>
                    {/* Target */}
                    <div className="pr-2"><input className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-[#d9140e]/40 focus:bg-white" onChange={(e) => onUpdateField(field.id, { target: e.target.value })} value={field.target} /></div>
                    {/* Unit */}
                    <div className="pr-2"><input className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-[#d9140e]/40 focus:bg-white" onChange={(e) => onUpdateField(field.id, { unit: e.target.value })} value={field.unit} /></div>
                    {/* Status */}
                    <div>
                      <select className={`h-7 rounded-full border-0 px-3 text-xs font-semibold outline-none ${tm.cls}`} style={{ appearance: "none" }} onChange={(e) => onUpdateField(field.id, { status: e.target.value as TrackingStatus })} value={field.status}>
                        {TRACKING_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-slate-800">{s}</option>)}
                      </select>
                    </div>
                    {/* Note */}
                    <div className="px-2"><input className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm outline-none focus:border-[#d9140e]/40 focus:bg-white" onChange={(e) => onUpdateField(field.id, { note: e.target.value })} value={field.note} /></div>
                    {/* Delete */}
                    <div className="flex justify-end">
                      <button onClick={() => onDeleteField(field.id)} type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState label="Aucun indicateur. Ajoutez-en un ci-dessus." />
        )}
      </section>

      {/* Updates timeline */}
      <aside className="space-y-4">
        {/* Add update form */}
        <form className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" onSubmit={(e) => { e.preventDefault(); onAddUpdate({ projectId: project.id, ...updateForm }); setUpdateForm({ date: new Date().toISOString().slice(0, 10), title: "", note: "" }); }}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#d9140e]" />
            <p className="text-sm font-bold text-slate-800">Ajouter une note</p>
          </div>
          <div className="space-y-2.5">
            <input type="date" className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setUpdateForm((c) => ({ ...c, date: e.target.value }))} value={updateForm.date} />
            <input className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm placeholder-slate-400 text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setUpdateForm((c) => ({ ...c, title: e.target.value }))} placeholder="Titre de la note" value={updateForm.title} />
            <textarea className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm placeholder-slate-400 text-slate-700 outline-none focus:border-[#d9140e]/40" rows={3} onChange={(e) => setUpdateForm((c) => ({ ...c, note: e.target.value }))} placeholder="Détail…" value={updateForm.note} />
            <button type="submit" className="h-9 w-full rounded-xl bg-[#0d1b2a] text-sm font-semibold text-white hover:bg-[#1e3a5f]">Ajouter</button>
          </div>
        </form>

        {/* Timeline */}
        <div className="space-y-2">
          {updates.map((update, i) => (
            <div key={update.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d9140e]" />
                {i < updates.length - 1 && <div className="mt-1 w-px flex-1 bg-slate-200" />}
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{update.title}</p>
                    <p className="text-xs text-slate-400">{update.date}</p>
                  </div>
                  <button onClick={() => onDeleteUpdate(update.id)} type="button" className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {update.note && <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{update.note}</p>}
              </div>
            </div>
          ))}
          {!updates.length && <EmptyState label="Aucun historique." small />}
        </div>
      </aside>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── TEAM TAB ────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function TeamTab({ onAddUser, onToggleProjectAccess, onUpdateUser, projectAccess, projects, users }: {
  onAddUser: (user: Omit<ProjectTeamUser, "id" | "role" | "isActive">) => void;
  onToggleProjectAccess: (userId: string, projectId: string) => void;
  onUpdateUser: (id: string, patch: Partial<ProjectTeamUser>) => void;
  projectAccess: ProjectsData["projectAccess"];
  projects: ManagedProject[];
  users: ProjectTeamUser[];
}) {
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "" });
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === "super_admin" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-5 border-t border-slate-100 p-5 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <form
          className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            onAddUser(newUser);
            setNewUser({ email: "", name: "", password: "" });
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#d9140e]" />
            <p className="text-sm font-bold text-slate-800">Nouveau membre</p>
          </div>
          <div className="space-y-2.5">
            <input
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40"
              onChange={(e) => setNewUser((c) => ({ ...c, name: e.target.value }))}
              placeholder="Nom"
              value={newUser.name}
            />
            <input
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40"
              onChange={(e) => setNewUser((c) => ({ ...c, email: e.target.value }))}
              placeholder="email@domaine.com"
              type="email"
              value={newUser.email}
            />
            <input
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40"
              onChange={(e) => setNewUser((c) => ({ ...c, password: e.target.value }))}
              placeholder="Mot de passe initial"
              type="password"
              value={newUser.password}
            />
            <button
              type="submit"
              disabled={!newUser.name.trim() || !newUser.email.trim()}
              className="projects-btn-primary flex h-9 w-full items-center justify-center gap-1.5 text-sm font-semibold transition disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Membres actifs</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{users.filter((user) => user.isActive).length}</p>
        </div>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <div className="min-w-[860px]">
        <div className="grid grid-cols-[260px_1fr_110px] gap-0 border-b border-slate-100 bg-slate-50/80 px-5 py-2.5">
          {["Membre", "Projets visibles", "Statut"].map((h) => (
            <div key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {sortedUsers.map((user) => {
            const isAdmin = user.role === "super_admin";
            return (
              <div key={user.id} className="grid grid-cols-[260px_1fr_110px] gap-0 px-5 py-4">
                <div className="min-w-0 pr-5">
                  <input
                    className="mb-1 h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-200 focus:bg-white"
                    disabled={isAdmin}
                    onChange={(e) => onUpdateUser(user.id, { name: e.target.value })}
                    value={user.name}
                  />
                  <div className="flex min-w-0 items-center gap-1.5 px-2 text-xs text-slate-400">
                    <Mail className="h-3 w-3 shrink-0" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none focus:text-slate-600"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateUser(user.id, { email: e.target.value })}
                      value={user.email}
                    />
                  </div>
                  <span className={`ml-2 mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${isAdmin ? "bg-[#0d1b2a] text-white" : "bg-slate-100 text-slate-500"}`}>
                    {isAdmin ? "Super admin" : "Membre"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pr-5">
                  {isAdmin ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Tous les projets</span>
                  ) : projects.map((project) => {
                    const checked = projectAccess.some((access) => access.userId === user.id && access.projectId === project.id);
                    return (
                      <label
                        key={project.id}
                        className={`flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${checked ? "border-[#0d1b2a] bg-[#0d1b2a] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                      >
                        <input
                          checked={checked}
                          className="sr-only"
                          onChange={() => onToggleProjectAccess(user.id, project.id)}
                          type="checkbox"
                        />
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-start justify-end">
                  <label className={`flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"} ${isAdmin ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      checked={user.isActive}
                      className="sr-only"
                      disabled={isAdmin}
                      onChange={(e) => onUpdateUser(user.id, { isActive: e.target.checked })}
                      type="checkbox"
                    />
                    <span className={`h-2 w-2 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />
                    {user.isActive ? "Actif" : "Inactif"}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        </div>
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── SHARED ATOMS ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function StatPill({ label, value, color }: { label: string; value: number; color: "slate"|"emerald"|"red"|"amber"; icon?: React.ReactNode }) {
  const numColors = { slate: "text-white", emerald: "text-white", red: value > 0 ? "text-white" : "text-white/40", amber: value > 0 ? "text-white" : "text-white/40" };
  return (
    <div className="projects-kpi-dark flex min-w-0 flex-col items-center gap-0.5 px-1.5 py-2 sm:min-w-[74px] sm:px-3.5 sm:py-2.5">
      <span className={`text-base font-bold sm:text-lg ${numColors[color]}`}>{value}</span>
      <span className="max-w-full truncate text-[10px] font-medium text-white/[0.45]">{label}</span>
    </div>
  );
}

function EmptyState({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-center ${small ? "py-6" : "py-10"}`}>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function SaveBadge({ saveState }: { saveState: SaveState }) {
  const map: Record<SaveState, { label: string; cls: string }> = {
    error:  { label: "Erreur",        cls: "text-[#f87171]" },
    idle:   { label: "Prêt",          cls: "text-white/[0.45]" },
    saved:  { label: "Sauvegardé",    cls: "text-[#86efac]" },
    saving: { label: "Sauvegarde…",   cls: "text-white/[0.45]" },
  };
  const { label, cls } = map[saveState];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      {label}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── TASK PREVIEW / EDITOR ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function TaskPreviewPage({
  onBack,
  onDelete,
  onEdit,
  sectionName,
  task,
}: {
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  sectionName: string;
  task: ManagedTask;
}) {
  const dateRange = formatTaskDateRange(task);
  const createdDate = formatTaskLongDate(task.createdAt);
  const executionDate = formatTaskLongDate(task.startDate);
  const deadlineDate = formatTaskLongDate(task.dueDate);
  const creationDetails = [
    createdDate ? `créée le ${createdDate}` : "",
    task.createdBy ? `par ${task.createdBy}` : "",
  ].filter(Boolean);
  const executionDetails = [
    task.responsible ? `assignée à ${task.responsible}` : "",
    executionDate ? `prévue pour démarrer le ${executionDate}` : "",
    deadlineDate ? `avec une deadline au ${deadlineDate}` : "",
  ].filter(Boolean);
  const summarySentences = [
    creationDetails.length ? `Cette tâche a été ${creationDetails.join(" ")}.` : "",
    executionDetails.length ? `Elle est ${executionDetails.join(" ")}.` : "",
    `Elle est marquée comme priorité ${task.priority.toLowerCase()} et actuellement ${task.status.toLowerCase()}.`,
    sectionName && sectionName !== "Sans section" ? `Elle appartient à la section ${sectionName}.` : "",
  ].filter(Boolean);

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)] p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  aria-label="Retour"
                  className="projects-btn-secondary flex h-8 w-8 shrink-0 items-center justify-center sm:h-9 sm:w-9"
                  onClick={onBack}
                  type="button"
                >
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label="Modifier"
                    className="projects-btn-secondary flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                    onClick={onEdit}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Supprimer"
                    className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--tsp-border)] text-[var(--tsp-red)] transition hover:bg-[#fef2f2] sm:h-9 sm:w-9"
                    onClick={onDelete}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-w-0 w-full">
                <p className="projects-label">Tâches</p>
                <div
                  aria-level={2}
                  className="mt-1 font-bold text-[var(--tsp-text)]"
                  role="heading"
                  style={TASK_PANEL_TITLE_STYLE}
                >
                  Aperçu de la tâche
                </div>
                <p className="mt-2 w-full break-words text-[15px] font-semibold leading-[1.45] text-[var(--tsp-text)] sm:text-[16px]">
                  {task.title}
                </p>
              </div>
            </div>
          </div>

          {task.note ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <p className="projects-label mb-2">Description</p>
              <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--tsp-text-secondary)]">{task.note}</p>
            </div>
          ) : null}

          {task.attachments.length ? (
            <div className="projects-surface p-[14px] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="projects-label mb-1 flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Pièces jointes</p>
                  <p className="text-[12px] text-[var(--tsp-text-secondary)]">{task.attachments.length} fichier{task.attachments.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {task.attachments.map((attachment) => (
                  <a
                    key={attachment.path}
                    className="projects-surface-soft flex items-center gap-3 px-3 py-3 transition hover:bg-white"
                    href={attachment.path}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white">
                      {isImageAttachmentMimeType(attachment.mimeType) ? (
                        <Image alt={attachment.name} className="object-cover" fill sizes="48px" src={attachment.path} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--tsp-text-secondary)]">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[var(--tsp-text)]">{attachment.name}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--tsp-text-secondary)]">{formatAttachmentSize(attachment.size)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <p className="projects-label mb-3">Informations</p>
            <div className="projects-surface-soft px-3 py-3.5">
              <div className="space-y-2">
                {summarySentences.map((sentence, index) => (
                  <p key={`${task.id}-summary-${index}`} className="text-[13px] leading-[1.65] text-[var(--tsp-text-secondary)]">
                    {sentence}
                  </p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sectionName && sectionName !== "Sans section" ? (
                  <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text)]">
                    {sectionName}
                  </span>
                ) : null}
                <span className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={STATUS_BADGE_STYLE[task.status]}>
                  {task.status}
                </span>
                <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_META[task.priority].cls}`}>
                  {task.priority}
                </span>
                {dateRange !== "Dates à préciser" ? (
                  <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)]">
                    {dateRange}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskEditorPage({ defaultProjectId, onClose, onSave, sections, task, teamMembers }: {
  defaultProjectId: string;
  onClose: () => void;
  onSave: (draft: Omit<ManagedTask, "id">, taskId?: string) => void;
  sections: TaskSection[];
  task: ManagedTask | null;
  teamMembers: string[];
}) {
  const [draft, setDraft] = useState<Omit<ManagedTask, "id">>(task ?? buildBlankTask(defaultProjectId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingTaskFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const availableSections = useMemo(
    () => sections.filter((section) => section.projectId === draft.projectId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [draft.projectId, sections]
  );
  const selectedSectionId = draft.sectionId && availableSections.some((section) => section.id === draft.sectionId)
    ? draft.sectionId
    : "";
  const knownResponsibles = useMemo(() => [...teamMembers].sort((a, b) => a.localeCompare(b)), [teamMembers]);
  const isEditing = Boolean(task);
  const fileInputId = useMemo(() => `task-files-${createId("input")}`, []);

  const handleFileSelection = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;

    const nextFiles = await Promise.all(
      Array.from(files).map(async (file) => ({
        file,
        id: createId("pending-file"),
        previewUrl: await readFilePreviewDataUrl(file),
      }))
    );

    setPendingFiles((current) => [...current, ...nextFiles]);
    setUploadError("");
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setUploadError("");

    try {
      let uploadedAttachments: TaskAttachment[] = [];

      if (pendingFiles.length) {
        const formData = new FormData();
        formData.append("projectId", defaultProjectId);
        pendingFiles.forEach((pendingFile) => formData.append("files", pendingFile.file));

        const response = await fetch("/api/projects/tasks/upload", {
          body: formData,
          method: "POST",
        });

        const payload = (await response.json()) as {
          attachments?: TaskAttachment[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Échec de l’envoi des pièces jointes.");
        }

        uploadedAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
      }

      onSave(
        {
          ...draft,
          projectId: defaultProjectId,
          sectionId: selectedSectionId || null,
          attachments: [...draft.attachments, ...uploadedAttachments],
        },
        task?.id
      );
      setPendingFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Impossible d’envoyer les pièces jointes.");
    } finally {
      setIsSubmitting(false);
    }
  }, [defaultProjectId, draft, onSave, pendingFiles, selectedSectionId, task?.id]);

  return (
    <div className="border-t border-[var(--tsp-border)] bg-[var(--tsp-bg-page)]">
      <form
        className="grid gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  className="projects-btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
                  onClick={onClose}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="projects-label">Tâches</p>
                  <div
                    aria-level={2}
                    className="mt-1 font-bold text-[var(--tsp-text)]"
                    role="heading"
                    style={TASK_PANEL_TITLE_STYLE}
                  >
                    {isEditing ? "Modifier la tâche" : "Nouvelle tâche"}
                  </div>
                </div>
              </div>
              <span className="hidden rounded-md bg-[var(--tsp-bg-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--tsp-text-secondary)] sm:inline-flex">
                {isEditing ? "Mise à jour" : "Création"}
              </span>
            </div>
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <label className="projects-label mb-2 block">Titre</label>
            <input
              autoFocus
              required
              className="h-11 w-full px-3 text-[13px]"
              onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
              placeholder="Ex : Optimiser les pages département IDF"
              value={draft.title}
            />
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="grid gap-3">
              <div>
                <label className="projects-label mb-2 flex items-center gap-1.5"><Columns3 className="h-3.5 w-3.5" />Section</label>
                <FieldSelect onChange={(value) => setDraft((current) => ({ ...current, sectionId: value || null }))} value={selectedSectionId}>
                  <option value="">Sans section</option>
                  {availableSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </FieldSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="projects-label mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Date début</label>
                  <input
                    type="date"
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) => setDraft((current) => ({ ...current, startDate: e.target.value }))}
                    value={draft.startDate}
                  />
                </div>
                <div>
                  <label className="projects-label mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Date limite</label>
                  <input
                    type="date"
                    className="h-11 w-full px-3 text-[13px]"
                    onChange={(e) => setDraft((current) => ({ ...current, dueDate: e.target.value }))}
                    value={draft.dueDate}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="projects-label mb-2 flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Collaborateurs du projet</p>
              {!!knownResponsibles.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {knownResponsibles.map((name) => {
                    const isSelected = draft.responsible.trim() === name;
                    return (
                      <button
                        key={name}
                        className={`flex items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left transition ${
                          isSelected
                            ? "border-[var(--tsp-navy)] bg-[var(--tsp-navy)] text-white"
                            : "border-[var(--tsp-border)] bg-white text-[var(--tsp-text)]"
                        }`}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            responsible: current.responsible.trim() === name ? "" : name,
                          }))
                        }
                        type="button"
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${isSelected ? "bg-white/15 text-white" : "bg-[var(--tsp-navy)] text-white"}`}>
                          {getUserInitials(name)}
                        </span>
                        <span className={`truncate text-[12px] font-medium ${isSelected ? "text-white" : "text-[var(--tsp-text)]"}`}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="projects-surface-soft px-3 py-3 text-[12px] text-[var(--tsp-text-secondary)]">
                  Aucun collaborateur n’est encore assigné à ce projet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="projects-surface p-[14px] sm:p-5">
            <p className="projects-label mb-2">Priorité</p>
            <div className="grid grid-cols-3 gap-2">
              {TASK_PRIORITIES.map((priority) => {
                const active = draft.priority === priority;
                return (
                  <button
                    key={priority}
                    className={`flex h-10 items-center justify-center gap-2 rounded-[10px] border text-[11px] font-semibold transition ${active ? PRIORITY_META[priority].cls : "border-[var(--tsp-border)] bg-white text-[var(--tsp-text-secondary)]"}`}
                    onClick={() => setDraft((current) => ({ ...current, priority }))}
                    type="button"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_META[priority].dot}`} />
                    {priority}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <p className="projects-label mb-2">Statut initial</p>
              <div className="grid grid-cols-2 gap-2">
                {TASK_STATUSES.map((status) => {
                  const active = draft.status === status;
                  return (
                    <button
                      key={status}
                      className="flex h-10 items-center justify-center rounded-[10px] border text-[11px] font-semibold transition"
                      onClick={() => setDraft((current) => ({ ...current, status }))}
                      style={active ? STATUS_BADGE_STYLE[status] : { backgroundColor: "#ffffff", borderColor: "rgba(15, 30, 53, 0.11)", color: "#5a6a7e" }}
                      type="button"
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="projects-label mb-1 flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Pièces jointes</p>
                <p className="text-[12px] text-[var(--tsp-text-secondary)]">PDF, DOC, DOCX, JPG, PNG, WEBP.</p>
              </div>
              <label className="projects-btn-secondary inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[12px] font-semibold">
                <Upload className="h-3.5 w-3.5" />
                Ajouter
                <input
                  accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  id={fileInputId}
                  multiple
                  onChange={async (event) => {
                    await handleFileSelection(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>

            {uploadError ? (
              <p className="mt-3 rounded-[10px] bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#dc2626]">
                {uploadError}
              </p>
            ) : null}

            {!!(draft.attachments.length || pendingFiles.length) ? (
              <div className="mt-4 space-y-2">
                {draft.attachments.map((attachment) => (
                  <TaskAttachmentCard
                    key={attachment.path}
                    attachment={attachment}
                    onRemove={() =>
                      setDraft((current) => ({
                        ...current,
                        attachments: current.attachments.filter((item) => item.path !== attachment.path),
                      }))
                    }
                  />
                ))}
                {pendingFiles.map((pendingFile) => (
                  <TaskAttachmentCard
                    key={pendingFile.id}
                    attachment={{
                      mimeType: pendingFile.file.type,
                      name: pendingFile.file.name,
                      path: pendingFile.previewUrl || "",
                      size: pendingFile.file.size,
                    }}
                    isPending
                    onRemove={() =>
                      setPendingFiles((current) => current.filter((item) => item.id !== pendingFile.id))
                    }
                    previewOverride={pendingFile.previewUrl}
                  />
                ))}
              </div>
            ) : (
              <div className="projects-surface-soft mt-4 px-3 py-3 text-[12px] text-[var(--tsp-text-secondary)]">
                Aucune pièce jointe pour cette tâche.
              </div>
            )}
          </div>

          <div className="projects-surface p-[14px] sm:p-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="projects-btn-secondary h-11 flex-1 text-[13px] font-semibold"
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="projects-btn-primary h-11 flex-1 text-[13px] font-semibold"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Envoi..." : isEditing ? "Enregistrer les changements" : "Créer la tâche"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldSelect({ children, onChange, value }: { children: React.ReactNode; onChange: (v: string) => void; value: string }) {
  return (
    <select className="h-11 w-full px-3 text-[13px]" onChange={(e) => onChange(e.target.value)} value={value}>
      {children}
    </select>
  );
}

function TaskAttachmentCard({
  attachment,
  isPending,
  onRemove,
  previewOverride,
}: {
  attachment: TaskAttachment;
  isPending?: boolean;
  onRemove: () => void;
  previewOverride?: string | null;
}) {
  const previewSrc = previewOverride || attachment.path;
  const isImage = isImageAttachmentMimeType(attachment.mimeType);

  return (
    <div className="projects-surface-soft flex items-center gap-3 px-3 py-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[var(--tsp-border)] bg-white">
        {isImage && previewSrc ? (
          <Image alt={attachment.name} className="object-cover" fill sizes="48px" src={previewSrc} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--tsp-text-secondary)]">
            <FileText className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[var(--tsp-text)]">{attachment.name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--tsp-text-secondary)]">
          {formatAttachmentSize(attachment.size)}{isPending ? " · en attente" : ""}
        </p>
      </div>

      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--tsp-border)] text-[var(--tsp-text-secondary)] transition hover:bg-white"
        onClick={onRemove}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
