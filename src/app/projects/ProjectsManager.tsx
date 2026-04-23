"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
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
  FileText,
  Filter,
  Flag,
  Folder,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
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
  PROJECT_STATUSES,
  PROJECT_TYPES,
  ProjectDocFile,
  ProjectDocFolder,
  ProjectIntervention,
  ProjectTrackingField,
  ProjectTeamUser,
  ProjectUpdate,
  ProjectsData,
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
type WorkspaceView = "project" | "team";
type ProjectStats = { blocked: number; done: number; overdue: number; progress: number; total: number };
type TaskSectionGroup = { id: string | null; color: string; name: string; tasks: ManagedTask[] };
type InterventionDraft = Omit<ProjectIntervention, "id">;

const EMPTY_DATA: ProjectsData = {
  projects: [], taskSections: [], tasks: [], docFolders: [], docFiles: [],
  trackingFields: [], updates: [], interventions: [], teamUsers: [], projectAccess: [], updatedAt: "",
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

const STATUS_DOT: Record<ManagedProject["status"], string> = {
  Actif: "bg-emerald-400", "En pause": "bg-amber-400", Terminé: "bg-slate-400",
};

const PROJECT_TABS: Array<{ label: ProjectTab; icon: React.ElementType; shortLabel?: string }> = [
  { label: "Pilotage",      icon: SlidersHorizontal },
  { label: "Tâches",        icon: Columns3          },
  { label: "Docs",          icon: BookOpen          },
  { label: "Interventions", icon: Calendar, shortLabel: "Interv." },
  { label: "Suivi",         icon: BarChart3         },
];

const SECTION_COLORS = ["#d9140e", "#39547c", "#0f9f6e", "#d97706", "#6d5dfc", "#0891b2", "#be123c"];

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
           sectionId: null, startDate: "", dueDate: "", note: "", responsible: "" };
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
  };
}

function parsePrice(value: string) {
  const normalized = value.replace(",", ".").trim();
  const price = Number(normalized);
  return Number.isFinite(price) ? Math.max(0, Math.round(price * 100) / 100) : 0;
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

// ─── Main component ──────────────────────────────────────────────────────────

interface ProjectsManagerProps {
  currentUser: CurrentProjectUser;
  logoutAction: () => Promise<void>;
}
interface ProjectFormState { name: string; type: ManagedProject["type"]; color: string; status: ManagedProject["status"] }

export default function ProjectsManager({ currentUser: initialUser, logoutAction }: ProjectsManagerProps) {
  const [data, setData] = useState<ProjectsData>(EMPTY_DATA);
  const [currentUser, setCurrentUser] = useState<CurrentProjectUser>(initialUser);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("project");
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
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ name: "", type: "DEV", color: "#1e3a5f", status: "Actif" });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setSelectedProjectId(p.data.projects[0]?.id ?? "");
      setSaveState("saved");
    } catch (e) { console.error(e); setLoadError("Impossible de charger les projets."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    void loadData();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [loadData]);

  useEffect(() => {
    if (!data.projects.some((p) => p.id === selectedProjectId))
      setSelectedProjectId(data.projects[0]?.id ?? "");
  }, [data.projects, selectedProjectId]);

  useEffect(() => {
    if (!isSuperAdmin && workspaceView === "team") {
      setWorkspaceView("project");
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
    const proj: ManagedProject = { id: createId("project"), name: projectForm.name.trim(), type: projectForm.type, color: projectForm.color, status: projectForm.status, health: "Bon", progress: 0, nextAction: "", blockers: "", lastUpdate: "" };
    updateData((c) => ({ ...c, projects: [...c.projects, proj], trackingFields: [...c.trackingFields, ...buildTrackingTemplate(proj)] }));
    setSelectedProjectId(proj.id);
    setWorkspaceView("project");
    setIsSidebarOpen(false);
    setProjectForm({ name: "", type: "DEV", color: "#1e3a5f", status: "Actif" });
    setShowAddProject(false);
  };

  const handleSaveTask = (draft: Omit<ManagedTask, "id">, taskId?: string) => {
    if (!draft.title.trim()) return;
    if (taskId) {
      updateData((c) => ({ ...c, tasks: c.tasks.map((t) => t.id === taskId ? { ...t, ...draft, title: draft.title.trim() } : t) }));
    } else {
      updateData((c) => ({ ...c, tasks: [...c.tasks, { ...draft, id: createId("task"), title: draft.title.trim() }] }));
    }
    setEditingTask(null); setIsTaskEditorOpen(false);
  };

  const handleDeleteTask        = (id: string) => updateData((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) }));
  const handleChangeTaskStatus  = (id: string, status: TaskStatus) => updateData((c) => ({ ...c, tasks: c.tasks.map((t) => t.id === id ? { ...t, status } : t) }));
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
    const file: ProjectDocFile = { id: createId("doc"), projectId: pid, folderId: fid, title: clean.endsWith(".md") ? clean : `${clean}.md`, contentMarkdown: `# ${clean.replace(/\.md$/i, "")}\n\n`, updatedAt: new Date().toISOString() };
    updateData((c) => ({ ...c, docFiles: [file, ...c.docFiles] }));
    setSelectedDocFileId(file.id);
  };
  const handleUpdateDocFile     = (id: string, patch: Partial<ProjectDocFile>) => updateData((c) => ({ ...c, docFiles: c.docFiles.map((f) => f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f) }));
  const handleDeleteDocFile     = (id: string) => updateData((c) => ({ ...c, docFiles: c.docFiles.filter((f) => f.id !== id) }));
  const handleAddTracking       = (pid: string, label: string) => { if (!label.trim()) return; updateData((c) => ({ ...c, trackingFields: [...c.trackingFields, { id: createId("metric"), projectId: pid, label: label.trim(), value: "", target: "", unit: "", status: "En cours" as TrackingStatus, note: "", position: trackingFields.length }] })); };
  const handleUpdateTracking    = (id: string, patch: Partial<ProjectTrackingField>) => updateData((c) => ({ ...c, trackingFields: c.trackingFields.map((f) => f.id === id ? { ...f, ...patch } : f) }));
  const handleDeleteTracking    = (id: string) => updateData((c) => ({ ...c, trackingFields: c.trackingFields.filter((f) => f.id !== id) }));
  const handleAddUpdate         = (u: Omit<ProjectUpdate, "id">) => { if (!u.title.trim()) return; updateData((c) => ({ ...c, updates: [{ ...u, id: createId("update"), title: u.title.trim() }, ...c.updates] })); };
  const handleDeleteUpdate      = (id: string) => updateData((c) => ({ ...c, updates: c.updates.filter((u) => u.id !== id) }));
  const handleAddIntervention   = (intervention: Omit<ProjectIntervention, "id">) => {
    const clean = sanitizeInterventionDraft(intervention);
    if (!clean.prestation) return;
    updateData((c) => ({
      ...c,
      interventions: [
        { ...clean, id: createId("intervention") },
        ...c.interventions,
      ],
    }));
  };
  const handleUpdateIntervention = (id: string, patch: Partial<ProjectIntervention>) => updateData((c) => ({
    ...c,
    interventions: c.interventions.map((intervention) =>
      intervention.id === id
        ? { ...sanitizeInterventionDraft({ ...intervention, ...patch }), id }
        : intervention
    ),
  }));
  const handleDeleteIntervention = (id: string) => updateData((c) => ({
    ...c,
    interventions: c.interventions.filter((intervention) => intervention.id !== id),
  }));
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
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-white/[0.45]">
            Projets · {data.projects.length}
          </div>
          <div className="space-y-2">
            {data.projects.map((project) => {
              const isActive = workspaceView === "project" && selectedProject?.id === project.id;
              return (
                <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setWorkspaceView("project"); setIsSidebarOpen(false); }} type="button"
                  className={`group flex w-full items-center gap-3 rounded-[10px] border border-transparent border-l-[3px] px-3 py-2.5 text-left transition-all ${isActive ? "bg-white text-[var(--tsp-text)]" : "bg-white/[0.05] text-white/[0.75] hover:bg-white/[0.08] hover:text-white"}`}
                  style={{
                    borderColor: isActive ? "var(--tsp-border)" : "transparent",
                    borderLeftColor: project.color,
                  }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{project.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[project.status]}`} />
                      <span className={`text-[11px] ${isActive ? "text-[var(--tsp-text-secondary)]" : "text-white/[0.45]"}`}>{project.type} · {project.status}</span>
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
                <div className="grid grid-cols-[1fr_34px] gap-2">
                  <select className="h-9 rounded-[10px] border border-white/10 bg-white/10 px-2 text-[13px] text-white/80 outline-none" onChange={(e) => setProjectForm((c) => ({ ...c, type: e.target.value as ManagedProject["type"] }))} value={projectForm.type}>
                    {PROJECT_TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1b2a]">{t}</option>)}
                  </select>
                  <input aria-label="Couleur" type="color" className="h-9 rounded-[10px] border border-white/10 bg-white/10 p-1" onChange={(e) => setProjectForm((c) => ({ ...c, color: e.target.value }))} value={projectForm.color} />
                </div>
                <select className="h-9 w-full rounded-[10px] border border-white/10 bg-white/10 px-2 text-[13px] text-white/80 outline-none" onChange={(e) => setProjectForm((c) => ({ ...c, status: e.target.value as ManagedProject["status"] }))} value={projectForm.status}>
                  {PROJECT_STATUSES.map((s) => <option key={s} value={s} className="bg-[#0d1b2a]">{s}</option>)}
                </select>
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
          ) : workspaceView === "team" && isSuperAdmin ? (
            <div className="projects-shell rounded-none border-x-0 border-t-0 sm:rounded-[20px] sm:border-x sm:border-t">
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
            <div className="projects-shell rounded-none border-x-0 border-t-0 sm:rounded-[20px] sm:border-x sm:border-t">

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
                            style={{ fontSize: "clamp(1rem, 0.95rem + 0.8vw, 1.6rem)", letterSpacing: 0 }}
                          >
                            {selectedProject.name}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <TypeBadge type={selectedProject.type} />
                            <StatusBadge status={selectedProject.status} />
                            <span className="text-[12px] text-white/[0.55]">{projectTasks.length} tâche{projectTasks.length > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:hidden">
                        <SaveBadge saveState={saveState} />
                        <button
                          aria-label="Ouvrir le menu"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.08] text-white"
                          onClick={() => setIsSidebarOpen(true)}
                          type="button"
                        >
                          <Menu className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-3 lg:justify-end">
                    <StatPill label="Total"     value={stats.total}   color="slate"   icon={<Columns3    className="h-3.5 w-3.5" />} />
                    <StatPill label="Terminées" value={stats.done}    color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                    <StatPill label="Bloquées"  value={stats.blocked} color="red"     icon={<AlertCircle className="h-3.5 w-3.5" />} />
                    <StatPill label="En retard" value={stats.overdue} color="amber"   icon={<Clock3      className="h-3.5 w-3.5" />} />
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                  <nav className="grid grid-cols-5 gap-1 border-b border-white/10 sm:flex sm:min-w-0 sm:overflow-x-auto sm:border-b-0">
                    {PROJECT_TABS.map(({ label, icon: Icon, shortLabel }) => {
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
                  {activeTab === "Tâches" && (
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
              {activeTab === "Tâches" && (
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
              {activeTab === "Pilotage" && <PilotageTab nextActionTasks={nextActionTasks} blockedTasks={blockedTasks} project={selectedProject} stats={stats} />}
              {activeTab === "Tâches"   && <TachesTab groups={taskGroups} onChangeStatus={handleChangeTaskStatus} onDeleteSection={handleDeleteTaskSection} onDeleteTask={handleDeleteTask} onEditTask={(t) => { setEditingTask(t); setIsTaskEditorOpen(true); }} />}
              {activeTab === "Docs"     && <DocsTab files={projectFiles} folders={projectFolders} onAddFile={handleAddDocFile} onAddFolder={handleAddDocFolder} onDeleteFile={handleDeleteDocFile} onDeleteFolder={handleDeleteDocFolder} onSelectFile={setSelectedDocFileId} onUpdateFile={handleUpdateDocFile} projectId={selectedProject.id} selectedFile={selectedDocFile} />}
              {activeTab === "Interventions" && <InterventionsTab key={selectedProject.id} interventions={projectInterventions} onAdd={handleAddIntervention} onDelete={handleDeleteIntervention} onUpdate={handleUpdateIntervention} projectId={selectedProject.id} />}
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

      {/* Task editor modal */}
      {isTaskEditorOpen && selectedProject && (
        <TaskEditor
          defaultProjectId={selectedProject.id}
          onClose={() => { setEditingTask(null); setIsTaskEditorOpen(false); }}
          onSave={handleSaveTask}
          projects={data.projects}
          sections={data.taskSections}
          task={editingTask}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── PILOTAGE TAB ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function PilotageTab({ nextActionTasks, blockedTasks, project, stats }: {
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
            <h3 className="text-[15px] font-semibold text-[var(--tsp-text)]">Prochaines actions</h3>
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
              <h3 className="text-[15px] font-semibold text-[var(--tsp-text)]">Blocages</h3>
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
        </div>

        {/* Last update */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Calendar className="h-3.5 w-3.5" /> Dernière mise à jour
          </div>
          <p className="text-sm font-medium text-slate-600">{project.lastUpdate || "Non renseignée"}</p>
        </div>
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
          <span className={`shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${sm.badge}`}>{task.status}</span>
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

function TachesTab({ groups, onChangeStatus, onDeleteSection, onDeleteTask, onEditTask }: {
  groups: TaskSectionGroup[];
  onChangeStatus: (id: string, s: TaskStatus) => void;
  onDeleteSection: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: ManagedTask) => void;
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
              <div className="space-y-2 bg-slate-50/70 px-2 py-2.5">
                {group.tasks.map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    onChangeStatus={onChangeStatus}
                    onDeleteTask={onDeleteTask}
                    onEditTask={onEditTask}
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
                  <button onClick={() => onEditTask(task)} type="button"
                    className={`truncate text-sm font-semibold transition hover:text-[#d9140e] ${isDone ? "line-through decoration-slate-400 decoration-2 text-slate-400" : "text-slate-800"}`}>
                    {task.title}
                  </button>
                </div>
                {/* Status */}
                <div>
                  <select
                    className={`h-7 rounded-full border-0 bg-white pl-2.5 pr-1 text-xs font-semibold outline-none transition ${sm.badge}`}
                    style={{ appearance: "none" }}
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

function MobileTaskCard({ onChangeStatus, onDeleteTask, onEditTask, task }: {
  onChangeStatus: (id: string, s: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: ManagedTask) => void;
  task: ManagedTask;
}) {
  const isDone = task.status === "Terminé";
  const sm = STATUS_META[task.status];
  const initials = getUserInitials(task.responsible);
  const dateRange = formatTaskDateRange(task);

  return (
    <article className={`projects-surface p-[14px] ${isDone ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button
            className={`block min-w-0 flex-1 text-left text-[13px] font-semibold leading-[1.35] text-[var(--tsp-text)] ${isDone ? "line-through decoration-slate-400 decoration-2" : ""}`}
            onClick={() => onEditTask(task)}
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
            className={`h-7 appearance-none rounded-md border-0 px-2.5 pr-6 text-[11px] font-semibold outline-none ${sm.badge}`}
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

function DocsTab({ files, folders, onAddFile, onAddFolder, onDeleteFile, onDeleteFolder, onSelectFile, onUpdateFile, projectId, selectedFile }: {
  files: ProjectDocFile[]; folders: ProjectDocFolder[];
  onAddFile: (pid: string, fid: string | null, title: string) => void;
  onAddFolder: (pid: string, name: string) => void;
  onDeleteFile: (id: string) => void; onDeleteFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
  onUpdateFile: (id: string, patch: Partial<ProjectDocFile>) => void;
  projectId: string; selectedFile?: ProjectDocFile;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string | null>>(new Set([null]));
  const [newFolderName, setNewFolderName]   = useState("");
  const [newFileName, setNewFileName]       = useState("");
  const [addFileTarget, setAddFileTarget]   = useState<string | null | "none">("none");
  const [addFolderOpen, setAddFolderOpen]   = useState(false);
  const [searchTerm, setSearchTerm]         = useState("");
  const [editorMode, setEditorMode]         = useState<"split" | "edit" | "preview">("edit");
  const [mobilePanel, setMobilePanel]       = useState<"browser" | "editor">("browser");

  const handleSelectFile = (id: string) => {
    onSelectFile(id);
    setMobilePanel("editor");
  };

  const toggleFolder = (id: string | null) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const rootFiles   = files.filter((f) => f.folderId === null);
  const allSearched = searchTerm.trim()
    ? files.filter((f) => f.title.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : null;

  const selectedFolder = selectedFile
    ? (selectedFile.folderId ? folders.find((f) => f.id === selectedFile.folderId) : null)
    : null;
  const activeMobilePanel = selectedFile ? mobilePanel : "browser";

  return (
    <div className="border-t border-slate-100 md:flex md:h-[calc(100vh-220px)] md:min-h-[560px]">

      {/* ── FILE EXPLORER SIDEBAR ── */}
      <aside className={`${activeMobilePanel === "browser" ? "flex" : "hidden"} min-h-[520px] flex-col bg-[#f8fafc] md:flex md:w-[260px] md:shrink-0 md:border-r md:border-slate-100`}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Documents</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{files.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAddFolderOpen((v) => !v)}
              type="button" title="Nouveau dossier"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${addFolderOpen ? "bg-[#0d1b2a] text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"}`}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setAddFileTarget((v) => v === null ? "none" : null); }}
              type="button" title="Nouveau fichier à la racine"
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${addFileTarget === null ? "bg-[#d9140e] text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* New folder form */}
        {addFolderOpen && (
          <form
            className="border-b border-slate-100 bg-white px-3 py-2.5"
            onSubmit={(e) => { e.preventDefault(); onAddFolder(projectId, newFolderName); setNewFolderName(""); setAddFolderOpen(false); }}
          >
            <div className="flex gap-2">
              <input
                autoFocus
                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#0d1b2a]/40 focus:bg-white"
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier…"
                value={newFolderName}
              />
              <button type="submit" disabled={!newFolderName.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d1b2a] text-white disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="border-b border-slate-100 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/30"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un fichier…"
              value={searchTerm}
            />
          </div>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {allSearched ? (
            /* Search results */
            <div className="px-2">
              <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {allSearched.length} résultat{allSearched.length > 1 ? "s" : ""}
              </div>
              {allSearched.map((file) => (
                <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={handleSelectFile} onDelete={onDeleteFile} />
              ))}
              {!allSearched.length && <p className="px-3 py-4 text-center text-xs text-slate-400">Aucun résultat.</p>}
            </div>
          ) : (
            /* Tree view */
            <>
              {/* Root files */}
              <div className="px-2">
                <button
                  onClick={() => toggleFolder(null)}
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform text-slate-400 ${expandedFolders.has(null) ? "rotate-90" : ""}`} />
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span className="flex-1 truncate">Racine</span>
                  <span className="rounded px-1 text-[10px] text-slate-400">{rootFiles.length}</span>
                </button>

                {expandedFolders.has(null) && (
                  <div className="ml-4 border-l border-slate-200 pl-2">
                    {rootFiles.map((file) => (
                      <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={handleSelectFile} onDelete={onDeleteFile} />
                    ))}
                    {/* New file in root */}
                    {addFileTarget === null ? (
                      <form className="py-1" onSubmit={(e) => { e.preventDefault(); onAddFile(projectId, null, newFileName); setNewFileName(""); setAddFileTarget("none"); }}>
                        <div className="flex gap-1.5">
                          <input autoFocus className="h-7 min-w-0 flex-1 rounded-lg border border-[#d9140e]/30 bg-white px-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/60" onChange={(e) => setNewFileName(e.target.value)} placeholder="nom-fichier.md" value={newFileName} />
                          <button type="submit" disabled={!newFileName.trim()} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d9140e] text-white disabled:opacity-40"><ChevronRight className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setAddFileTarget("none")} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-3 w-3" /></button>
                        </div>
                      </form>
                    ) : (
                      !rootFiles.length && <p className="py-2 text-center text-[11px] text-slate-400">Vide</p>
                    )}
                  </div>
                )}
              </div>

              {/* Folders */}
              {folders.map((folder) => {
                const folderFiles = files.filter((f) => f.folderId === folder.id);
                const isExpanded  = expandedFolders.has(folder.id);
                const isTarget    = addFileTarget === folder.id;
                return (
                  <div key={folder.id} className="px-2">
                    <div className="group flex items-center gap-0">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        type="button"
                        className="flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-700"
                      >
                        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform text-slate-400 ${isExpanded ? "rotate-90" : ""}`} />
                        {isExpanded
                          ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        }
                        <span className="flex-1 truncate">{folder.name}</span>
                        <span className="rounded px-1 text-[10px] text-slate-400">{folderFiles.length}</span>
                      </button>
                      {/* Folder actions */}
                      <div className="flex shrink-0 items-center gap-0 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                        <button
                          onClick={() => { setAddFileTarget(isTarget ? "none" : folder.id); if (!isExpanded) toggleFolder(folder.id); }}
                          type="button" title="Nouveau fichier"
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${isTarget ? "bg-[#d9140e] text-white" : "text-slate-400 hover:bg-slate-200"}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => onDeleteFolder(folder.id)} type="button" title="Supprimer le dossier" className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ml-4 border-l border-slate-200 pl-2">
                        {folderFiles.map((file) => (
                          <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={handleSelectFile} onDelete={onDeleteFile} />
                        ))}
                        {/* New file in folder */}
                        {isTarget ? (
                          <form className="py-1" onSubmit={(e) => { e.preventDefault(); onAddFile(projectId, folder.id, newFileName); setNewFileName(""); setAddFileTarget("none"); }}>
                            <div className="flex gap-1.5">
                              <input autoFocus className="h-7 min-w-0 flex-1 rounded-lg border border-[#d9140e]/30 bg-white px-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/60" onChange={(e) => setNewFileName(e.target.value)} placeholder="nom-fichier.md" value={newFileName} />
                              <button type="submit" disabled={!newFileName.trim()} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d9140e] text-white disabled:opacity-40"><ChevronRight className="h-3 w-3" /></button>
                              <button type="button" onClick={() => setAddFileTarget("none")} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-3 w-3" /></button>
                            </div>
                          </form>
                        ) : (
                          !folderFiles.length && <p className="py-2 text-center text-[11px] text-slate-400">Vide</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* ── EDITOR ── */}
      <div className={`${activeMobilePanel === "editor" ? "flex" : "hidden"} min-h-[560px] min-w-0 flex-1 flex-col bg-white md:flex md:min-h-0`}>
        {selectedFile ? (
          <>
            {/* Editor top bar */}
            <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-[#f8fafc] px-3 py-2 md:h-12 md:flex-nowrap md:gap-3 md:px-5 md:py-0">
              <button
                onClick={() => setMobilePanel("browser")}
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 md:hidden"
                title="Retour aux documents"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              {/* Breadcrumb */}
              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-400">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {selectedFolder && (
                  <>
                    <span className="truncate font-medium text-slate-500">{selectedFolder.name}</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </>
                )}
                <input
                  className="h-7 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 font-semibold text-slate-700 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#d9140e]/30 focus:bg-white"
                  onChange={(e) => onUpdateFile(selectedFile.id, { title: e.target.value })}
                  value={selectedFile.title}
                />
              </div>
              {/* View toggle */}
              <div className="order-3 flex w-full items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 md:order-none md:w-auto">
                {(["edit", "split", "preview"] as const).map((mode) => {
                  const labels = { edit: "Édition", split: "Côte à côte", preview: "Aperçu" };
                  const icons  = { edit: <Pencil className="h-3.5 w-3.5" />, split: <Eye className="h-3.5 w-3.5" />, preview: <BookOpen className="h-3.5 w-3.5" /> };
                  return (
                    <button key={mode} onClick={() => setEditorMode(mode)} type="button"
                      className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition md:flex-none ${mode === "split" ? "hidden md:flex" : ""} ${editorMode === mode ? "bg-[#0d1b2a] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      {icons[mode]}
                      <span className="hidden sm:inline">{labels[mode]}</span>
                    </button>
                  );
                })}
              </div>
              {/* Delete */}
              <button onClick={() => onDeleteFile(selectedFile.id)} type="button"
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 md:px-3">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Editor body */}
            <div className={`flex min-h-0 flex-1 flex-col ${editorMode === "split" ? "md:grid md:grid-cols-2 md:divide-x md:divide-slate-100" : ""}`}>
              {/* Textarea */}
              {(editorMode === "edit" || editorMode === "split") && (
                <div className="flex min-h-0 flex-col">
                  {editorMode === "split" && (
                    <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Markdown
                    </div>
                  )}
                  <textarea
                    className="min-h-[420px] flex-1 resize-none bg-white p-4 font-mono text-[13px] leading-7 text-slate-700 outline-none placeholder-slate-300 md:min-h-0 md:p-5"
                    placeholder="Commencez à écrire en Markdown…"
                    onChange={(e) => onUpdateFile(selectedFile.id, { contentMarkdown: e.target.value })}
                    value={selectedFile.contentMarkdown}
                  />
                </div>
              )}
              {/* Preview */}
              {(editorMode === "preview" || editorMode === "split") && (
                <div className={`${editorMode === "split" ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden`}>
                  {editorMode === "split" && (
                    <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Aperçu
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <MarkdownPreview content={selectedFile.contentMarkdown} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <FileText className="h-7 w-7 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">Aucun fichier ouvert</p>
              <p className="mt-1 text-xs text-slate-400">Sélectionnez un fichier dans l&apos;explorateur ou créez-en un nouveau.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocFileRow({ file, selected, onSelect, onDelete }: {
  file: ProjectDocFile; selected: boolean;
  onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-0">
      <button onClick={() => onSelect(file.id)} type="button"
        className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${selected ? "bg-white font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"}`}>
        <FileText className={`h-3.5 w-3.5 shrink-0 ${selected ? "text-[#d9140e]" : "text-slate-300 group-hover:text-slate-400"}`} />
        <span className="truncate">{file.title}</span>
      </button>
      <button onClick={() => onDelete(file.id)} type="button"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="prose-like space-y-1 text-sm leading-7 text-slate-600">
      {lines.map((line, i) => {
        if (line.startsWith("# "))
          return <h1 key={i} className="mb-3 mt-6 border-b border-slate-100 pb-2 text-2xl font-bold tracking-tight text-slate-900 first:mt-0">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="mb-2 mt-5 text-xl font-bold text-slate-800">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="mb-1.5 mt-4 text-base font-semibold text-slate-700">{line.slice(4)}</h3>;
        if (line.startsWith("**") && line.endsWith("**"))
          return <p key={i} className="font-semibold text-slate-800">{line.slice(2, -2)}</p>;
        if (line.startsWith("- "))
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9140e]" />
              <span className="text-slate-600">{line.slice(2)}</span>
            </div>
          );
        if (line.match(/^\d+\. /))
          return <div key={i} className="flex gap-2.5 text-slate-600"><span className="shrink-0 font-medium text-slate-400">{line.match(/^(\d+)\./)?.[1]}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-2 border-[#d9140e]/30 pl-4 italic text-slate-500">{line.slice(2)}</blockquote>;
        if (line.startsWith("---"))
          return <hr key={i} className="border-slate-200" />;
        if (!line.trim())
          return <div key={i} className="h-2" />;
        return <p key={i} className="whitespace-pre-wrap text-slate-600">{line}</p>;
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── INTERVENTIONS TAB ───────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function InterventionsTab({ interventions, onAdd, onDelete, onUpdate, projectId }: {
  interventions: ProjectIntervention[];
  onAdd: (intervention: InterventionDraft) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ProjectIntervention>) => void;
  projectId: string;
}) {
  const [draft, setDraft] = useState<InterventionDraft>(() => buildBlankIntervention(projectId));
  const [departmentFilter, setDepartmentFilter] = useState("Tous");
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | "Tous">("Tous");
  const [monthFilter, setMonthFilter] = useState("Tous");
  const [formError, setFormError] = useState("");
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<ProjectIntervention | null>(null);

  const departmentOptions = useMemo(() =>
    Array.from(new Set(interventions.map((intervention) => intervention.department.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [interventions]
  );

  const monthOptions = useMemo(() =>
    Array.from(new Set(interventions.map((intervention) => intervention.interventionDate.slice(0, 7)).filter(Boolean))).sort().reverse(),
    [interventions]
  );

  const filteredInterventions = useMemo(() =>
    interventions
      .filter((intervention) =>
        (departmentFilter === "Tous" || intervention.department === departmentFilter) &&
        (statusFilter === "Tous" || intervention.status === statusFilter) &&
        (monthFilter === "Tous" || intervention.interventionDate.startsWith(monthFilter))
      )
      .sort((a, b) => (b.interventionDate || "").localeCompare(a.interventionDate || "")),
    [departmentFilter, interventions, monthFilter, statusFilter]
  );

  const stats = useMemo(() => {
    const billable = interventions.filter((intervention) => intervention.status === "Réalisée");
    return {
      total: interventions.length,
      revenue: billable.reduce((sum, intervention) => sum + intervention.price, 0),
      done: interventions.filter((intervention) => intervention.status === "Réalisée").length,
      postponed: interventions.filter((intervention) => intervention.status === "Reportée").length,
      cancelled: interventions.filter((intervention) => intervention.status === "Annulée").length,
    };
  }, [interventions]);

  const uploadPhotos = useCallback(async (files: FileList | File[]) => {
    const nextFiles = Array.from(files).filter((file) => file.size > 0);
    if (!nextFiles.length) return [];

    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      nextFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/projects/interventions/upload", {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string; paths?: string[] };
      if (!response.ok || !payload.paths) {
        throw new Error(payload.error || "Impossible d’envoyer les photos.");
      }

      return payload.paths;
    } finally {
      setIsUploadingPhotos(false);
    }
  }, [projectId]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanDraft = sanitizeInterventionDraft(draft);
    const error = validateInterventionDraft(cleanDraft);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    onAdd({ ...cleanDraft, projectId });
    setDraft(buildBlankIntervention(projectId));
  };

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-2.5 sm:p-5">
      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-3">
        <InterventionStat label="Total" value={String(stats.total)} />
        <InterventionStat label="CA" value={formatCurrency(stats.revenue)} />
        <InterventionStat label="Réalisées" value={String(stats.done)} />
        <InterventionStat label="Reportées" value={String(stats.postponed)} danger={stats.postponed > 0} />
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Nouvelle intervention</p>
            <p className="text-xs text-slate-400">Date, lieu, prestation, statut et justificatifs.</p>
          </div>
          <button type="submit" className="projects-btn-primary hidden h-9 items-center gap-1.5 px-4 text-sm font-semibold sm:flex" disabled={isUploadingPhotos}>
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[150px_110px_110px_1.2fr_0.9fr_1.2fr_120px_150px]">
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, interventionDate: e.target.value }))} value={draft.interventionDate} />
          <input type="time" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, interventionTime: e.target.value }))} value={draft.interventionTime} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, department: e.target.value }))} placeholder="Département" value={draft.department} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, address: e.target.value }))} placeholder="Adresse" value={draft.address} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, city: e.target.value }))} placeholder="Ville" value={draft.city} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, prestation: e.target.value }))} placeholder="Prestation" value={draft.prestation} />
          <input type="number" min="0" step="0.01" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, price: parsePrice(e.target.value) }))} placeholder="Prix" value={draft.price || ""} />
          <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((current) => applyInterventionStatus(current, e.target.value as InterventionStatus))} value={draft.status}>
            {INTERVENTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        {draft.status === "Reportée" && (
          <div className="mt-2 grid gap-2 sm:grid-cols-[180px_1fr]">
            <input type="date" className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-800 outline-none focus:border-amber-400" onChange={(e) => setDraft((c) => ({ ...c, reportDate: e.target.value }))} value={draft.reportDate} />
            <div className="flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs text-amber-700">
              Nouvelle date obligatoire pour une intervention reportée.
            </div>
          </div>
        )}
        {draft.status === "Annulée" && (
          <input className="mt-2 h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-700 placeholder-red-300 outline-none focus:border-red-400" onChange={(e) => setDraft((c) => ({ ...c, cancellationReason: e.target.value }))} placeholder="Cause d’annulation" value={draft.cancellationReason} />
        )}
        {draft.status === "Réalisée" && (
          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-emerald-800">Photos d’intervention</p>
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200">
                <Camera className="h-3.5 w-3.5" /> Ajouter des photos
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files?.length) return;
                    setFormError("");
                    try {
                      const paths = await uploadPhotos(e.target.files);
                      setDraft((current) => ({ ...current, photoPaths: [...current.photoPaths, ...paths] }));
                    } catch (error) {
                      setFormError(error instanceof Error ? error.message : "Impossible d’envoyer les photos.");
                    } finally {
                      e.currentTarget.value = "";
                    }
                  }}
                  type="file"
                />
              </label>
            </div>
            {isUploadingPhotos && <p className="mb-2 text-xs text-emerald-700">Upload en cours…</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {draft.photoPaths.map((photoPath) => (
                <div key={photoPath} className="relative overflow-hidden rounded-xl border border-emerald-200 bg-white">
                  <Image alt="Photo d’intervention" className="h-24 w-full object-cover" height={160} src={photoPath} unoptimized width={240} />
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, photoPaths: current.photoPaths.filter((path) => path !== photoPath) }))} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/60 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <textarea className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-[#d9140e]/40" rows={2} onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))} placeholder="Note optionnelle..." value={draft.note} />
        {formError && <p className="mt-2 text-sm font-medium text-red-600">{formError}</p>}
        <button type="submit" className="projects-btn-primary mt-2 flex h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold sm:hidden" disabled={isUploadingPhotos}>
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </form>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm sm:flex-row sm:items-center">
        <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs text-slate-500">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select className="min-w-0 bg-transparent outline-none" onChange={(e) => setStatusFilter(e.target.value as InterventionStatus | "Tous")} value={statusFilter}>
            <option value="Tous">Tous statuts</option>
            {INTERVENTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <select className="min-w-0 bg-transparent outline-none" onChange={(e) => setMonthFilter(e.target.value)} value={monthFilter}>
            <option value="Tous">Tous les mois</option>
            {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs text-slate-500">
          <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
          <select className="min-w-0 bg-transparent outline-none" onChange={(e) => setDepartmentFilter(e.target.value)} value={departmentFilter}>
            <option value="Tous">Tous départements</option>
            {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
        <div className="min-w-[1280px]">
        <div className="grid grid-cols-[120px_90px_90px_1.2fr_0.9fr_1.2fr_110px_130px_1.5fr_80px] bg-slate-50/80 px-5 py-2.5">
          {["Date", "Heure", "Dépt.", "Adresse", "Ville", "Prestation", "Prix", "Statut", "Note", ""].map((header) => (
            <div key={header} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{header}</div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {filteredInterventions.map((intervention) => (
            <InterventionTableRow key={intervention.id} intervention={intervention} onDelete={onDelete} onEdit={setEditingIntervention} />
          ))}
        </div>
        </div>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {filteredInterventions.map((intervention) => (
          <InterventionMobileCard key={intervention.id} intervention={intervention} onDelete={onDelete} onEdit={setEditingIntervention} />
        ))}
      </div>

      {!filteredInterventions.length && <EmptyState label="Aucune intervention pour ces filtres." small />}

      {editingIntervention && (
        <InterventionEditor
          intervention={editingIntervention}
          onClose={() => setEditingIntervention(null)}
          onSave={(patch) => onUpdate(editingIntervention.id, patch)}
          onUploadPhotos={uploadPhotos}
        />
      )}
    </div>
  );
}

function InterventionStat({ danger, label, value }: { danger?: boolean; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white px-2 py-2 text-center shadow-sm sm:min-w-[120px] sm:px-4 sm:py-3">
      <p className={`truncate text-base font-bold sm:text-lg ${danger ? "text-red-600" : "text-slate-800"}`}>{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</p>
    </div>
  );
}

function InterventionTableRow({ intervention, onDelete, onEdit }: {
  intervention: ProjectIntervention;
  onDelete: (id: string) => void;
  onEdit: (intervention: ProjectIntervention) => void;
}) {
  const meta = INTERVENTION_META[intervention.status];

  return (
    <div className="grid grid-cols-[120px_90px_90px_1.2fr_0.9fr_1.2fr_110px_130px_1.5fr_80px] items-center px-5 py-3">
      <div className="text-sm text-slate-600">{intervention.interventionDate || "—"}</div>
      <div className="text-sm text-slate-600">{intervention.interventionTime || "—"}</div>
      <div className="text-sm font-semibold text-slate-700">{intervention.department || "—"}</div>
      <div className="truncate text-sm text-slate-600">{intervention.address || "—"}</div>
      <div className="truncate text-sm text-slate-600">{intervention.city || "—"}</div>
      <div className="truncate text-sm font-semibold text-slate-800">{intervention.prestation}</div>
      <div className="text-sm font-semibold text-slate-700">{formatCurrency(intervention.price)}</div>
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>{intervention.status}</span>
      </div>
      <div className="min-w-0 pr-3">
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{buildInterventionMetaLine(intervention)}</p>
      </div>
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => onEdit(intervention)} type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(intervention.id)} type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function InterventionMobileCard({ intervention, onDelete, onEdit }: {
  intervention: ProjectIntervention;
  onDelete: (id: string) => void;
  onEdit: (intervention: ProjectIntervention) => void;
}) {
  const meta = INTERVENTION_META[intervention.status];

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <p className="truncate text-sm font-bold text-slate-900">{intervention.prestation}</p>
          </div>
          <p className="text-xs text-slate-400">{formatInterventionDateTime(intervention)}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.cls}`}>{intervention.status}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileTaskMeta label="Département" value={intervention.department || "—"} />
        <MobileTaskMeta label="Ville" value={intervention.city || "—"} />
        <MobileTaskMeta className="col-span-2" label="Adresse" value={intervention.address || "—"} />
        <MobileTaskMeta label="Prix" value={formatCurrency(intervention.price)} />
        <MobileTaskMeta label="Photos" value={String(intervention.photoPaths.length)} />
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Détails</p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{buildInterventionMetaLine(intervention)}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onEdit(intervention)} type="button" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </button>
        <button onClick={() => onDelete(intervention.id)} type="button" className="flex h-9 w-11 items-center justify-center rounded-xl border border-red-100 text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function buildInterventionMetaLine(intervention: ProjectIntervention) {
  const details = [];

  if (intervention.note.trim()) details.push(intervention.note.trim());
  if (intervention.status === "Reportée" && intervention.reportDate) details.push(`Nouvelle date : ${intervention.reportDate}`);
  if (intervention.status === "Annulée" && intervention.cancellationReason.trim()) details.push(`Cause : ${intervention.cancellationReason.trim()}`);
  if (intervention.status === "Réalisée" && intervention.photoPaths.length > 0) details.push(`${intervention.photoPaths.length} photo${intervention.photoPaths.length > 1 ? "s" : ""}`);

  return details.join(" · ") || "—";
}

function InterventionEditor({ intervention, onClose, onSave, onUploadPhotos }: {
  intervention: ProjectIntervention;
  onClose: () => void;
  onSave: (patch: Partial<ProjectIntervention>) => void;
  onUploadPhotos: (files: FileList | File[]) => Promise<string[]>;
}) {
  const [draft, setDraft] = useState<InterventionDraft>({
    projectId: intervention.projectId,
    interventionDate: intervention.interventionDate,
    interventionTime: intervention.interventionTime,
    department: intervention.department,
    address: intervention.address,
    city: intervention.city,
    prestation: intervention.prestation,
    price: intervention.price,
    status: intervention.status,
    reportDate: intervention.reportDate,
    cancellationReason: intervention.cancellationReason,
    photoPaths: intervention.photoPaths,
    note: intervention.note,
  });
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanDraft = sanitizeInterventionDraft(draft);
    const validationError = validateInterventionDraft(cleanDraft);
    if (validationError) return setError(validationError);
    setError("");
    onSave(cleanDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Modifier l’intervention</h2>
              <p className="mt-0.5 text-xs text-slate-400">Mettez à jour les détails, le statut et les preuves.</p>
            </div>
            <button onClick={onClose} type="button" className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-3 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:gap-4 sm:px-6">
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40 sm:col-span-1" onChange={(e) => setDraft((c) => ({ ...c, interventionDate: e.target.value }))} value={draft.interventionDate} />
          <input type="time" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40 sm:col-span-1" onChange={(e) => setDraft((c) => ({ ...c, interventionTime: e.target.value }))} value={draft.interventionTime} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, department: e.target.value }))} placeholder="Département" value={draft.department} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, city: e.target.value }))} placeholder="Ville" value={draft.city} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40 sm:col-span-2" onChange={(e) => setDraft((c) => ({ ...c, address: e.target.value }))} placeholder="Adresse" value={draft.address} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40 sm:col-span-2" onChange={(e) => setDraft((c) => ({ ...c, prestation: e.target.value }))} placeholder="Prestation" value={draft.prestation} />
          <input type="number" min="0" step="0.01" className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((c) => ({ ...c, price: parsePrice(e.target.value) }))} placeholder="Prix" value={draft.price || ""} />
          <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/40" onChange={(e) => setDraft((current) => applyInterventionStatus(current, e.target.value as InterventionStatus))} value={draft.status}>
            {INTERVENTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {draft.status === "Reportée" && (
            <input type="date" className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-800 outline-none sm:col-span-2" onChange={(e) => setDraft((c) => ({ ...c, reportDate: e.target.value }))} value={draft.reportDate} />
          )}
          {draft.status === "Annulée" && (
            <input className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-700 outline-none sm:col-span-2" onChange={(e) => setDraft((c) => ({ ...c, cancellationReason: e.target.value }))} placeholder="Cause d’annulation" value={draft.cancellationReason} />
          )}
          {draft.status === "Réalisée" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-800">Photos d’intervention</p>
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200">
                  <Camera className="h-3.5 w-3.5" /> Ajouter
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    multiple
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      setError("");
                      setIsUploading(true);
                      try {
                        const paths = await onUploadPhotos(e.target.files);
                        setDraft((current) => ({ ...current, photoPaths: [...current.photoPaths, ...paths] }));
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : "Impossible d’envoyer les photos.");
                      } finally {
                        setIsUploading(false);
                        e.currentTarget.value = "";
                      }
                    }}
                    type="file"
                  />
                </label>
              </div>
              {isUploading && <p className="mb-2 text-xs text-emerald-700">Upload en cours…</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {draft.photoPaths.map((photoPath) => (
                  <div key={photoPath} className="relative overflow-hidden rounded-xl border border-emerald-200 bg-white">
                    <Image alt="Photo d’intervention" className="h-24 w-full object-cover" height={160} src={photoPath} unoptimized width={240} />
                    <button type="button" onClick={() => setDraft((current) => ({ ...current, photoPaths: current.photoPaths.filter((path) => path !== photoPath) }))} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/60 text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <textarea className="min-h-[96px] resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none sm:col-span-2" onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))} placeholder="Note" value={draft.note} />
          {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:col-span-2 sm:m-0 sm:flex-row sm:justify-end sm:border-t-0 sm:bg-transparent sm:p-0">
            <button onClick={onClose} type="button" className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="projects-btn-primary h-10 px-6 text-sm font-semibold" disabled={isUploading}>Enregistrer</button>
          </div>
        </form>
      </div>
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
            <h2 className="text-base font-bold text-slate-800">Indicateurs · {project.type}</h2>
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

function TypeBadge({ type }: { type: ManagedProject["type"] }) {
  return <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/[0.75]">{type}</span>;
}

function StatusBadge({ status }: { status: ManagedProject["status"] }) {
  const cls = status === "Actif" ? "bg-[#f0fdf4] text-[#15803d]" : status === "En pause" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#ede9e3] text-[#5a6a7e]";
  return <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>;
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
// ── TASK EDITOR MODAL ───────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function TaskEditor({ defaultProjectId, onClose, onSave, projects, sections, task }: {
  defaultProjectId: string;
  onClose: () => void;
  onSave: (draft: Omit<ManagedTask, "id">, taskId?: string) => void;
  projects: ManagedProject[];
  sections: TaskSection[];
  task: ManagedTask | null;
}) {
  const [draft, setDraft] = useState<Omit<ManagedTask, "id">>(task ?? buildBlankTask(defaultProjectId));
  const availableSections = useMemo(
    () => sections.filter((section) => section.projectId === draft.projectId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [draft.projectId, sections]
  );
  const selectedSectionId = draft.sectionId && availableSections.some((section) => section.id === draft.sectionId)
    ? draft.sectionId
    : "";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
            <p className="mt-0.5 text-xs text-slate-400">Sauvegarde automatique après validation.</p>
          </div>
          <button onClick={onClose} type="button" className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...draft, sectionId: selectedSectionId || null }, task?.id); }} className="grid gap-3 overflow-y-auto px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Titre</label>
            <input autoFocus required
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10"
              onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
              placeholder="Ex : Préparer l'audit SEO" value={draft.title}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSelect icon={<FolderKanban className="h-3.5 w-3.5" />} label="Projet" onChange={(v) => setDraft((c) => ({ ...c, projectId: v, sectionId: null }))} value={draft.projectId}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FieldSelect>
            <FieldSelect icon={<Columns3 className="h-3.5 w-3.5" />} label="Section" onChange={(v) => setDraft((c) => ({ ...c, sectionId: v || null }))} value={selectedSectionId}>
              <option value="">Sans section</option>
              {availableSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </FieldSelect>
            <FieldSelect icon={<Columns3 className="h-3.5 w-3.5" />} label="Statut" onChange={(v) => setDraft((c) => ({ ...c, status: v as TaskStatus }))} value={draft.status}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </FieldSelect>
            <FieldSelect icon={<Flag className="h-3.5 w-3.5" />} label="Priorité" onChange={(v) => setDraft((c) => ({ ...c, priority: v as TaskPriority }))} value={draft.priority}>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </FieldSelect>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><User className="h-3.5 w-3.5" /> Responsable</label>
              <input className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10" onChange={(e) => setDraft((c) => ({ ...c, responsible: e.target.value }))} placeholder="Nom ou équipe" value={draft.responsible} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Calendar className="h-3.5 w-3.5" /> Date début</label>
              <input type="date" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10" onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value }))} value={draft.startDate} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Calendar className="h-3.5 w-3.5" /> Date limite</label>
              <input type="date" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10" onChange={(e) => setDraft((c) => ({ ...c, dueDate: e.target.value }))} value={draft.dueDate} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Note</label>
            <textarea rows={3} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10" onChange={(e) => setDraft((c) => ({ ...c, note: e.target.value }))} placeholder="Contexte, blocage, prochaine action…" value={draft.note} />
          </div>

          <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:m-0 sm:flex-row sm:justify-end sm:border-t-0 sm:bg-transparent sm:p-0">
            <button onClick={onClose} type="button" className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="projects-btn-primary h-10 px-6 text-sm font-semibold">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldSelect({ children, icon, label, onChange, value }: { children: React.ReactNode; icon: React.ReactNode; label: string; onChange: (v: string) => void; value: string }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{icon}{label}</label>
      <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#d9140e]/50 focus:ring-2 focus:ring-[#d9140e]/10" onChange={(e) => onChange(e.target.value)} value={value}>
        {children}
      </select>
    </div>
  );
}
