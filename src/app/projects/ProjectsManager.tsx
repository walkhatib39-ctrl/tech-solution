"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Calendar,
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
  ManagedProject,
  ManagedTask,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  ProjectDocFile,
  ProjectDocFolder,
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
type ProjectTab = "Pilotage" | "Tâches" | "Docs" | "Suivi";
type WorkspaceView = "project" | "team";
type ProjectStats = { blocked: number; done: number; overdue: number; progress: number; total: number };
type TaskSectionGroup = { id: string | null; color: string; name: string; tasks: ManagedTask[] };

const EMPTY_DATA: ProjectsData = {
  projects: [], taskSections: [], tasks: [], docFolders: [], docFiles: [],
  trackingFields: [], updates: [], teamUsers: [], projectAccess: [], updatedAt: "",
};

// ─── Style maps ─────────────────────────────────────────────────────────────

const PRIORITY_META: Record<TaskPriority, { cls: string; dot: string }> = {
  Basse:   { cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  Moyenne: { cls: "bg-amber-50 text-amber-700",  dot: "bg-amber-400" },
  Haute:   { cls: "bg-red-50 text-red-600",      dot: "bg-red-500"   },
};

const STATUS_META: Record<TaskStatus, { badge: string; bar: string; dot: string }> = {
  "À faire": { badge: "bg-slate-100 text-slate-500",  bar: "bg-slate-300",   dot: "bg-slate-400"  },
  "En cours":{ badge: "bg-sky-50 text-sky-700",       bar: "bg-sky-400",     dot: "bg-sky-500"    },
  "Bloqué":  { badge: "bg-red-50 text-red-600",       bar: "bg-red-400",     dot: "bg-red-500"    },
  "Terminé": { badge: "bg-emerald-50 text-emerald-700",bar:"bg-emerald-400", dot: "bg-emerald-500"},
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

const STATUS_DOT: Record<ManagedProject["status"], string> = {
  Actif: "bg-emerald-400", "En pause": "bg-amber-400", Terminé: "bg-slate-400",
};

const PROJECT_TABS: Array<{ label: ProjectTab; icon: React.ElementType }> = [
  { label: "Pilotage", icon: SlidersHorizontal },
  { label: "Tâches",   icon: Columns3          },
  { label: "Docs",     icon: BookOpen          },
  { label: "Suivi",    icon: BarChart3         },
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

  const selectedProject  = useMemo(() => data.projects.find((p) => p.id === selectedProjectId) ?? data.projects[0], [data.projects, selectedProjectId]);
  const projectTasks     = useMemo(() => !selectedProject ? [] : data.tasks.filter((t) => t.projectId === selectedProject.id), [data.tasks, selectedProject]);
  const projectSections  = useMemo(() => !selectedProject ? [] : data.taskSections.filter((s) => s.projectId === selectedProject.id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)), [data.taskSections, selectedProject]);
  const projectFolders   = useMemo(() => !selectedProject ? [] : data.docFolders.filter((f) => f.projectId === selectedProject.id), [data.docFolders, selectedProject]);
  const projectFiles     = useMemo(() => !selectedProject ? [] : data.docFiles.filter((f) => f.projectId === selectedProject.id), [data.docFiles, selectedProject]);
  const selectedDocFile  = useMemo(() => projectFiles.find((f) => f.id === selectedDocFileId) ?? projectFiles[0], [selectedDocFileId, projectFiles]);
  const trackingFields   = useMemo(() => !selectedProject ? [] : data.trackingFields.filter((f) => f.projectId === selectedProject.id).sort((a, b) => a.position - b.position), [data.trackingFields, selectedProject]);
  const projectUpdates   = useMemo(() => !selectedProject ? [] : data.updates.filter((u) => u.projectId === selectedProject.id), [data.updates, selectedProject]);

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
    <div dir="ltr" className="flex h-screen overflow-hidden bg-[#f0f2f5] font-sans text-slate-900 antialiased">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside className="flex w-[248px] shrink-0 flex-col bg-[#0d1b2a] overflow-hidden">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-[18px] border-b border-white/[0.06]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d9140e] shadow-lg shadow-red-900/40">
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Tech-Solution</div>
            <div className="text-[13px] font-bold text-white">Projects</div>
          </div>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-white/25">
            Projets · {data.projects.length}
          </div>
          <div className="space-y-px">
            {data.projects.map((project) => {
              const isActive = workspaceView === "project" && selectedProject?.id === project.id;
              return (
                <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setWorkspaceView("project"); }} type="button"
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all ${isActive ? "bg-white/[0.10] text-white" : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"}`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{project.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[project.status]}`} />
                      <span className={`text-[11px] ${isActive ? "text-white/50" : "text-white/30"}`}>{project.type} · {project.status}</span>
                    </span>
                  </span>
                  {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-white/30" />}
                </button>
              );
            })}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="border-t border-white/[0.06] px-3 py-3">
            <button
              onClick={() => setWorkspaceView("team")}
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${workspaceView === "team" ? "bg-white/[0.10] text-white" : "text-white/45 hover:bg-white/[0.05] hover:text-white/75"}`}
            >
              <Users className="h-4 w-4" />
              <span className="flex-1 text-left font-medium">Équipe</span>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/35">{data.teamUsers.length}</span>
            </button>
          </div>
        )}

        {isSuperAdmin && (
          <div className="border-t border-white/[0.06] px-3 py-3">
            <button onClick={() => setShowAddProject((v) => !v)} type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition hover:bg-white/[0.05] hover:text-white/70">
              <Plus className="h-4 w-4" />
              <span className="flex-1 text-left">Nouveau projet</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAddProject ? "rotate-180" : ""}`} />
            </button>
            {showAddProject && (
              <form onSubmit={handleAddProject} className="mt-2 space-y-2 rounded-xl bg-white/[0.05] p-3">
                <input
                  className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#d9140e]/50 focus:bg-white/10"
                  onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Nom du projet" value={projectForm.name}
                />
                <div className="grid grid-cols-[1fr_34px] gap-2">
                  <select className="h-8 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-sm text-white/70 outline-none" onChange={(e) => setProjectForm((c) => ({ ...c, type: e.target.value as ManagedProject["type"] }))} value={projectForm.type}>
                    {PROJECT_TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1b2a]">{t}</option>)}
                  </select>
                  <input aria-label="Couleur" type="color" className="h-8 rounded-lg border border-white/10 bg-white/[0.07] p-0.5" onChange={(e) => setProjectForm((c) => ({ ...c, color: e.target.value }))} value={projectForm.color} />
                </div>
                <select className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-sm text-white/70 outline-none" onChange={(e) => setProjectForm((c) => ({ ...c, status: e.target.value as ManagedProject["status"] }))} value={projectForm.status}>
                  {PROJECT_STATUSES.map((s) => <option key={s} value={s} className="bg-[#0d1b2a]">{s}</option>)}
                </select>
                <button type="submit" className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#d9140e] text-sm font-semibold text-white hover:bg-[#b91010]">
                  <Plus className="h-3.5 w-3.5" /> Créer
                </button>
              </form>
            )}
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/50">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/70">{currentUser.name}</p>
              <p className="truncate text-[10px] text-white/25">{currentUser.role === "super_admin" ? "Super admin" : "Membre"}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/35 transition hover:bg-white/[0.05] hover:text-white/60">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-6 shadow-sm shadow-slate-200/40">
          <div className="flex items-center gap-2 text-sm min-w-0">
            {workspaceView === "team" ? (
              <>
                <Users className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate font-semibold text-slate-700">Équipe</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span className="font-medium text-slate-400">Accès projets</span>
              </>
            ) : selectedProject && <>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedProject.color }} />
              <span className="truncate font-semibold text-slate-700">{selectedProject.name}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="font-medium text-slate-400">{activeTab}</span>
            </>}
          </div>
          <SaveBadge saveState={saveState} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-[#d9140e]" /> Chargement…
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-[#d9140e]" />
              <p className="font-semibold text-red-900">{loadError}</p>
              <button onClick={() => void loadData()} className="rounded-xl bg-[#d9140e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b91010]">Réessayer</button>
            </div>
          ) : workspaceView === "team" && isSuperAdmin ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d1b2a] text-white shadow-sm">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
                      <p className="mt-1 text-sm text-slate-400">Gérer les membres et les projets visibles par chacun.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
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
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">

              {/* ── Project header ── */}
              <div className="border-b border-slate-100 px-6 pt-5 pb-0">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Title + meta */}
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: selectedProject.color }} />
                    <div>
                      <h1 className="text-xl font-bold text-slate-900">{selectedProject.name}</h1>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <TypeBadge type={selectedProject.type} />
                        <StatusBadge status={selectedProject.status} />
                        <span className="text-xs text-slate-400">{projectTasks.length} tâche{projectTasks.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="flex gap-3">
                    <StatPill label="Total"     value={stats.total}   color="slate"   icon={<Columns3    className="h-3.5 w-3.5" />} />
                    <StatPill label="Terminées" value={stats.done}    color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                    <StatPill label="Bloquées"  value={stats.blocked} color="red"     icon={<AlertCircle className="h-3.5 w-3.5" />} />
                    <StatPill label="En retard" value={stats.overdue} color="amber"   icon={<Clock3      className="h-3.5 w-3.5" />} />
                  </div>
                </div>

                {/* Tab bar */}
                <div className="mt-5 flex items-end justify-between">
                  <nav className="flex">
                    {PROJECT_TABS.map(({ label, icon: Icon }) => {
                      const active = activeTab === label;
                      return (
                        <button key={label} onClick={() => setActiveTab(label)} type="button"
                          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${active ? "border-[#d9140e] text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"}`}>
                          <Icon className="h-3.5 w-3.5" /> {label}
                        </button>
                      );
                    })}
                  </nav>
                  {activeTab === "Tâches" && (
                    <div className="mb-1">
                      <button onClick={() => { setEditingTask(null); setIsTaskEditorOpen(true); }} type="button"
                        className="flex h-8 items-center gap-1.5 rounded-xl bg-[#d9140e] px-3 text-xs font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-[#b91010]">
                        <Plus className="h-3.5 w-3.5" /> Nouvelle tâche
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tab filter bar (Tasks only) ── */}
              {activeTab === "Tâches" && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-6 py-3">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
                    <Filter className="h-3 w-3 text-slate-400" />
                    {(["Tous", ...TASK_STATUSES] as StatusFilter[]).map((s) => (
                      <button key={s} onClick={() => setStatusFilter(s)} type="button"
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${statusFilter === s ? "bg-[#0d1b2a] text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <label className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs shadow-sm">
                    <User className="h-3 w-3 text-slate-400" />
                    <select disabled={!responsibleOptions.length} className="bg-transparent text-xs text-slate-600 outline-none" onChange={(e) => setResponsibleFilter(e.target.value)} value={responsibleFilter}>
                      <option value="Tous">Tous les responsables</option>
                      {responsibleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <form
                    className="ml-auto flex h-8 min-w-[220px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 shadow-sm"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTaskSection(selectedProject.id, taskSectionName);
                      setTaskSectionName("");
                    }}
                  >
                    <Columns3 className="h-3 w-3 text-slate-400" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
                      onChange={(e) => setTaskSectionName(e.target.value)}
                      placeholder="Nouvelle section"
                      value={taskSectionName}
                    />
                    <button
                      type="submit"
                      disabled={!taskSectionName.trim()}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0d1b2a] text-white transition hover:bg-[#1e3a5f] disabled:opacity-35"
                      title="Ajouter la section"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              )}

              {/* ── Tab content ── */}
              {activeTab === "Pilotage" && <PilotageTab nextActionTasks={nextActionTasks} blockedTasks={blockedTasks} project={selectedProject} stats={stats} />}
              {activeTab === "Tâches"   && <TachesTab groups={taskGroups} onChangeStatus={handleChangeTaskStatus} onDeleteSection={handleDeleteTaskSection} onDeleteTask={handleDeleteTask} onEditTask={(t) => { setEditingTask(t); setIsTaskEditorOpen(true); }} />}
              {activeTab === "Docs"     && <DocsTab files={projectFiles} folders={projectFolders} onAddFile={handleAddDocFile} onAddFolder={handleAddDocFolder} onDeleteFile={handleDeleteDocFile} onDeleteFolder={handleDeleteDocFolder} onSelectFile={setSelectedDocFileId} onUpdateFile={handleUpdateDocFile} projectId={selectedProject.id} selectedFile={selectedDocFile} />}
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
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Avancement réel</p>
              <p className="mt-0.5 text-sm text-slate-500">Calculé depuis les tâches terminées</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md shadow-slate-200/60 ring-1 ring-slate-200/60">
              <span className="text-xl font-bold text-slate-800">{stats.progress}<span className="text-sm font-semibold text-slate-400">%</span></span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#d9140e] to-[#f05050] transition-all duration-700"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {stats.done} terminée{stats.done > 1 ? "s" : ""} sur {stats.total} · {stats.blocked > 0 && <><span className="text-red-500 font-medium">{stats.blocked} bloquée{stats.blocked > 1 ? "s" : ""}</span> · </>}{stats.overdue > 0 && <span className="text-amber-500 font-medium">{stats.overdue} en retard</span>}
          </div>
        </div>

        {/* Next actions */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#d9140e]" />
            <h3 className="text-sm font-bold text-slate-800">Prochaines actions</h3>
            {nextActionTasks.length > 0 && (
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{nextActionTasks.length}</span>
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
              <h3 className="text-sm font-bold text-slate-800">Blocages</h3>
              <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{blockedTasks.length}</span>
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
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Synthèse</p>
          <div className="space-y-3">
            {[
              { label: "Santé projet", node: <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${HEALTH_META[project.health].cls}`}>{project.health}</span> },
              { label: "Terminées",   node: <span className="text-sm font-bold text-slate-800">{stats.done}/{stats.total}</span> },
              { label: "Bloquées",    node: <span className={`text-sm font-bold ${stats.blocked > 0 ? "text-red-600" : "text-slate-300"}`}>{stats.blocked}</span> },
              { label: "En retard",   node: <span className={`text-sm font-bold ${stats.overdue > 0 ? "text-amber-600" : "text-slate-300"}`}>{stats.overdue}</span> },
            ].map(({ label, node }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-medium text-slate-500">{label}</span>
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
    <div className={`flex gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200 hover:shadow-md hover:shadow-slate-100`}>
      <div className={`mt-0.5 h-full w-1 shrink-0 self-stretch rounded-full ${sm.bar} opacity-70`} style={{ minHeight: 24 }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{task.title}</p>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sm.badge}`}>{task.status}</span>
        </div>
        {task.note && <p className="mt-1 text-xs leading-relaxed text-slate-400">{task.note}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_META[task.priority].cls}`}>{task.priority}</span>
          {task.responsible && (
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
              <User className="h-2.5 w-2.5" />{task.responsible}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isOverdue(task) ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
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
    <div className="divide-y divide-slate-100">
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
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/70">
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
  const [editorMode, setEditorMode]         = useState<"split" | "edit" | "preview">("split");

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

  return (
    <div className="flex min-h-[600px] border-t border-slate-100" style={{ height: "calc(100vh - 220px)", minHeight: 560 }}>

      {/* ── FILE EXPLORER SIDEBAR ── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-slate-100 bg-[#f8fafc]">

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
                <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={onSelectFile} onDelete={onDeleteFile} />
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
                      <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={onSelectFile} onDelete={onDeleteFile} />
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
                      <div className="flex shrink-0 items-center gap-0 opacity-0 transition group-hover:opacity-100">
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
                          <DocFileRow key={file.id} file={file} selected={selectedFile?.id === file.id} onSelect={onSelectFile} onDelete={onDeleteFile} />
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
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {selectedFile ? (
          <>
            {/* Editor top bar */}
            <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-100 bg-[#f8fafc] px-5">
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
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                {(["edit", "split", "preview"] as const).map((mode) => {
                  const labels = { edit: "Édition", split: "Côte à côte", preview: "Aperçu" };
                  const icons  = { edit: <Pencil className="h-3.5 w-3.5" />, split: <Eye className="h-3.5 w-3.5" />, preview: <BookOpen className="h-3.5 w-3.5" /> };
                  return (
                    <button key={mode} onClick={() => setEditorMode(mode)} type="button"
                      className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${editorMode === mode ? "bg-[#0d1b2a] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      {icons[mode]}
                      <span className="hidden sm:inline">{labels[mode]}</span>
                    </button>
                  );
                })}
              </div>
              {/* Delete */}
              <button onClick={() => onDeleteFile(selectedFile.id)} type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Editor body */}
            <div className={`flex min-h-0 flex-1 ${editorMode === "split" ? "grid grid-cols-2 divide-x divide-slate-100" : ""}`}>
              {/* Textarea */}
              {(editorMode === "edit" || editorMode === "split") && (
                <div className="flex min-h-0 flex-col">
                  {editorMode === "split" && (
                    <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Markdown
                    </div>
                  )}
                  <textarea
                    className="flex-1 resize-none bg-white p-5 font-mono text-[13px] leading-7 text-slate-700 outline-none placeholder-slate-300"
                    placeholder="Commencez à écrire en Markdown…"
                    onChange={(e) => onUpdateFile(selectedFile.id, { contentMarkdown: e.target.value })}
                    value={selectedFile.contentMarkdown}
                  />
                </div>
              )}
              {/* Preview */}
              {(editorMode === "preview" || editorMode === "split") && (
                <div className="flex min-h-0 flex-col overflow-hidden">
                  {editorMode === "split" && (
                    <div className="border-b border-slate-100 bg-[#f8fafc] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Aperçu
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-6">
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
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
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
            <button type="submit" disabled={!fieldLabel.trim()} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#d9140e] px-4 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#b91010]">
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
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#d9140e] text-sm font-semibold text-white transition hover:bg-[#b91010] disabled:opacity-40"
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
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── SHARED ATOMS ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function StatPill({ label, value, color, icon }: { label: string; value: number; color: "slate"|"emerald"|"red"|"amber"; icon: React.ReactNode }) {
  const colors = { slate: "text-slate-400", emerald: "text-emerald-500", red: "text-red-500", amber: "text-amber-500" };
  const numColors = { slate: "text-slate-700", emerald: "text-slate-700", red: value > 0 ? "text-red-600" : "text-slate-300", amber: value > 0 ? "text-amber-600" : "text-slate-300" };
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm shadow-slate-100/60 min-w-[64px]">
      <span className={`${colors[color]}`}>{icon}</span>
      <span className={`text-lg font-bold ${numColors[color]}`}>{value}</span>
      <span className="text-[10px] font-medium text-slate-400">{label}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: ManagedProject["type"] }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{type}</span>;
}

function StatusBadge({ status }: { status: ManagedProject["status"] }) {
  const cls = status === "Actif" ? "bg-emerald-50 text-emerald-700" : status === "En pause" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
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
    error:  { label: "Erreur",        cls: "text-red-500"     },
    idle:   { label: "Prêt",          cls: "text-slate-400"   },
    saved:  { label: "Sauvegardé",    cls: "text-emerald-500" },
    saving: { label: "Sauvegarde…",   cls: "text-slate-400"   },
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[580px] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
            <p className="mt-0.5 text-xs text-slate-400">Sauvegarde automatique après validation.</p>
          </div>
          <button onClick={onClose} type="button" className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...draft, sectionId: selectedSectionId || null }, task?.id); }} className="grid gap-4 px-6 py-5">
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

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button onClick={onClose} type="button" className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button type="submit" className="h-10 rounded-xl bg-[#d9140e] px-6 text-sm font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-[#b91010]">Enregistrer</button>
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
