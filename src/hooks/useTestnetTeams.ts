/**
 * Testnet mock data for Teams — provides interactive Team Lead experience
 * with pre-populated workspaces, members, tasks, activity log, and status management.
 * Tasks are categorized by order number (workspace transaction_id).
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { TaskAssignment } from "@/components/shared/TeamTaskCard";

type Workspace = {
  id: string; title: string; description: string | null; industry: string;
  status: string; created_at: string; transaction_id: string | null; owner_id: string;
  order_number: string;
};
type Member = {
  id: string; user_id: string; display_name: string | null; role: string;
  can_finalize: boolean; removed_at: string | null; preferred_language?: string;
};
type RolePreset = { id: string; industry: string; role_name: string; role_key: string };
export type ActivityLogEntry = {
  id: string; workspace_id: string; order_number: string; actor: string;
  action: string; detail: string; timestamp: string;
};

const LS_KEY = "tl_testnet_teams";

const MOCK_MEMBERS: Record<string, Member[]> = {
  "ws-mining-1": [
    { id: "m1", user_id: "usr-001", display_name: "Kwame Asante — Site Geologist", role: "geologist", can_finalize: false, removed_at: null, preferred_language: "en" },
    { id: "m2", user_id: "usr-002", display_name: "Fatima Diallo — Assayer", role: "assayer", can_finalize: false, removed_at: null, preferred_language: "fr" },
    { id: "m3", user_id: "usr-003", display_name: "David Okonkwo — Logistics Lead", role: "logistics", can_finalize: true, removed_at: null, preferred_language: "en" },
    { id: "m4", user_id: "usr-004", display_name: "Amina Bello — Compliance Officer", role: "compliance", can_finalize: false, removed_at: null, preferred_language: "en" },
  ],
  "ws-agri-1": [
    { id: "m5", user_id: "usr-005", display_name: "Grace Nyambura — Farm Manager", role: "farm_manager", can_finalize: true, removed_at: null, preferred_language: "sw" },
    { id: "m6", user_id: "usr-006", display_name: "Pierre Dumont — Quality Inspector", role: "quality", can_finalize: false, removed_at: null, preferred_language: "fr" },
    { id: "m7", user_id: "usr-007", display_name: "Ahmed Hassan — Export Agent", role: "export", can_finalize: false, removed_at: null, preferred_language: "ar" },
  ],
  "ws-constr-1": [
    { id: "m8", user_id: "usr-008", display_name: "Carlos Silva — Site Foreman", role: "foreman", can_finalize: true, removed_at: null, preferred_language: "pt" },
    { id: "m9", user_id: "usr-009", display_name: "Sarah Mensah — Structural Engineer", role: "engineer", can_finalize: false, removed_at: null, preferred_language: "en" },
    { id: "m10", user_id: "usr-010", display_name: "Ibrahim Toure — Procurement", role: "procurement", can_finalize: false, removed_at: null, preferred_language: "fr" },
  ],
  "ws-realestate-1": [
    { id: "m11", user_id: "usr-011", display_name: "Elena Kofi — Property Manager", role: "property_manager", can_finalize: true, removed_at: null, preferred_language: "en" },
    { id: "m12", user_id: "usr-012", display_name: "James Otieno — Legal Counsel", role: "legal", can_finalize: false, removed_at: null, preferred_language: "en" },
  ],
};

const MOCK_TASKS: Record<string, TaskAssignment[]> = {
  "ws-mining-1": [
    { id: "t1", member_id: "m1", milestone_key: "geological_survey", milestone_label: "Complete Geological Survey", instructions: "Submit survey report with GPS coordinates and mineral composition data.", status: "completed", sort_order: 0, sla_hours: 72, evidence_url: "survey_report.pdf" },
    { id: "t2", member_id: "m2", milestone_key: "assay_report", milestone_label: "Submit Assay Report", instructions: "Lab analysis of ore samples — include grade percentages for gold, copper.", status: "completed", sort_order: 1, sla_hours: 48, evidence_url: "assay_cert.pdf" },
    { id: "t3", member_id: "m4", milestone_key: "environmental_clearance", milestone_label: "Environmental Compliance Check", instructions: "Verify EPA clearance and water table impact assessment.", status: "pending", sort_order: 2, sla_hours: 96 },
    { id: "t4", member_id: "m3", milestone_key: "transport_logistics", milestone_label: "Arrange Ore Transport", instructions: "Coordinate trucking from mine to port. Insure cargo.", status: "pending", sort_order: 3, sla_hours: 120 },
    { id: "t5", member_id: "m4", milestone_key: "export_docs", milestone_label: "Prepare Export Documentation", instructions: "Certificate of origin, ECOWAS transit docs, customs clearance.", status: "pending", sort_order: 4, sla_hours: 48 },
  ],
  "ws-agri-1": [
    { id: "t6", member_id: "m5", milestone_key: "harvest_prep", milestone_label: "Confirm Harvest Schedule", instructions: "Coordinate harvest dates and labor allocation.", status: "completed", sort_order: 0, sla_hours: 48 },
    { id: "t7", member_id: "m6", milestone_key: "quality_inspection", milestone_label: "Quality & Grade Inspection", instructions: "Test moisture, aflatoxin levels. Issue phytosanitary certificate.", status: "pending", sort_order: 1, sla_hours: 72, deadline_at: new Date(Date.now() + 3 * 86400000).toISOString() },
    { id: "t8", member_id: "m7", milestone_key: "export_booking", milestone_label: "Book Export Container", instructions: "Arrange 20ft reefer container. Confirm shipping line and ETD.", status: "pending", sort_order: 2, sla_hours: 96 },
  ],
  "ws-constr-1": [
    { id: "t9", member_id: "m10", milestone_key: "material_procurement", milestone_label: "Procure Building Materials", instructions: "Source cement, rebar, and aggregate per BOM. Get 3 quotes.", status: "completed", sort_order: 0, sla_hours: 120, evidence_url: "purchase_orders.pdf" },
    { id: "t10", member_id: "m8", milestone_key: "foundation_pour", milestone_label: "Foundation Pour & Cure", instructions: "Complete foundation pour. Upload photos + cube test results.", status: "pending", sort_order: 1, sla_hours: 168 },
    { id: "t11", member_id: "m9", milestone_key: "structural_inspection", milestone_label: "Structural Integrity Report", instructions: "Inspect foundation + rebar placement. Submit engineer's sign-off.", status: "pending", sort_order: 2, sla_hours: 48 },
  ],
  "ws-realestate-1": [
    { id: "t12", member_id: "m12", milestone_key: "title_search", milestone_label: "Title Search & Verification", instructions: "Verify land title, check encumbrances, confirm ownership chain.", status: "completed", sort_order: 0, sla_hours: 96, evidence_url: "title_report.pdf" },
    { id: "t13", member_id: "m11", milestone_key: "property_inspection", milestone_label: "Property Condition Inspection", instructions: "Full inspection report with photos — structural, plumbing, electrical.", status: "pending", sort_order: 1, sla_hours: 72 },
    { id: "t14", member_id: "m12", milestone_key: "contract_draft", milestone_label: "Draft Purchase Agreement", instructions: "Prepare sale agreement with agreed terms and escrow references.", status: "pending", sort_order: 2, sla_hours: 48 },
  ],
};

const INITIAL_WORKSPACES: Workspace[] = [
  { id: "ws-mining-1", title: "Gold Export — Obuasi Mine Lot #7", description: "25-ton gold ore shipment from Obuasi to Rotterdam via Tema Port.", industry: "mining", status: "active", created_at: new Date(Date.now() - 5 * 86400000).toISOString(), transaction_id: "tx-mining-001", owner_id: "testnet-owner", order_number: "ORD-MIN-2026-0047" },
  { id: "ws-agri-1", title: "Cocoa Export — Kumasi Cooperative", description: "500 bags premium cocoa beans for Swiss buyer.", industry: "agriculture", status: "active", created_at: new Date(Date.now() - 3 * 86400000).toISOString(), transaction_id: "tx-agri-001", owner_id: "testnet-owner", order_number: "ORD-AGR-2026-0112" },
  { id: "ws-constr-1", title: "Office Complex — Phase 1 Foundation", description: "Commercial property build in Accra. Foundation stage.", industry: "construction", status: "active", created_at: new Date(Date.now() - 10 * 86400000).toISOString(), transaction_id: "tx-constr-001", owner_id: "testnet-owner", order_number: "ORD-CON-2026-0023" },
  { id: "ws-realestate-1", title: "Property Sale — Lekki Peninsula", description: "Residential property transfer. Title verification in progress.", industry: "real_estate", status: "active", created_at: new Date(Date.now() - 7 * 86400000).toISOString(), transaction_id: "tx-re-001", owner_id: "testnet-owner", order_number: "ORD-RE-2026-0089" },
  { id: "ws-complete-1", title: "Shea Butter Export — Completed", description: "Successfully exported 10 tons of refined shea butter.", industry: "agriculture", status: "complete", created_at: new Date(Date.now() - 30 * 86400000).toISOString(), transaction_id: "tx-shea-001", owner_id: "testnet-owner", order_number: "ORD-AGR-2026-0098" },
  { id: "ws-dissolved-1", title: "Textile Order — Dissolved", description: "Client cancelled order before production started.", industry: "retail", status: "dissolved", created_at: new Date(Date.now() - 20 * 86400000).toISOString(), transaction_id: null, owner_id: "testnet-owner", order_number: "ORD-RET-2026-0054" },
];

const INITIAL_ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: "log-1", workspace_id: "ws-mining-1", order_number: "ORD-MIN-2026-0047", actor: "Kwame Asante", action: "task_completed", detail: "Completed: Geological Survey — evidence: survey_report.pdf", timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "log-2", workspace_id: "ws-mining-1", order_number: "ORD-MIN-2026-0047", actor: "Fatima Diallo", action: "task_completed", detail: "Completed: Assay Report — evidence: assay_cert.pdf", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "log-3", workspace_id: "ws-agri-1", order_number: "ORD-AGR-2026-0112", actor: "Grace Nyambura", action: "task_completed", detail: "Completed: Harvest Schedule confirmed", timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "log-4", workspace_id: "ws-constr-1", order_number: "ORD-CON-2026-0023", actor: "Ibrahim Toure", action: "task_completed", detail: "Completed: Material Procurement — evidence: purchase_orders.pdf", timestamp: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: "log-5", workspace_id: "ws-realestate-1", order_number: "ORD-RE-2026-0089", actor: "James Otieno", action: "task_completed", detail: "Completed: Title Search — evidence: title_report.pdf", timestamp: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: "log-6", workspace_id: "ws-mining-1", order_number: "ORD-MIN-2026-0047", actor: "Team Lead", action: "member_added", detail: "Added Amina Bello as Compliance Officer", timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
];

const MOCK_PRESETS: Record<string, RolePreset[]> = {
  mining: [
    { id: "rp1", industry: "mining", role_name: "Site Geologist", role_key: "geologist" },
    { id: "rp2", industry: "mining", role_name: "Assayer", role_key: "assayer" },
    { id: "rp3", industry: "mining", role_name: "Logistics Coordinator", role_key: "logistics" },
    { id: "rp4", industry: "mining", role_name: "Compliance Officer", role_key: "compliance" },
    { id: "rp5", industry: "mining", role_name: "Safety Inspector", role_key: "safety" },
  ],
  agriculture: [
    { id: "rp6", industry: "agriculture", role_name: "Farm Manager", role_key: "farm_manager" },
    { id: "rp7", industry: "agriculture", role_name: "Quality Inspector", role_key: "quality" },
    { id: "rp8", industry: "agriculture", role_name: "Export Agent", role_key: "export" },
    { id: "rp9", industry: "agriculture", role_name: "Warehouse Supervisor", role_key: "warehouse" },
  ],
  construction: [
    { id: "rp10", industry: "construction", role_name: "Site Foreman", role_key: "foreman" },
    { id: "rp11", industry: "construction", role_name: "Structural Engineer", role_key: "engineer" },
    { id: "rp12", industry: "construction", role_name: "Procurement Officer", role_key: "procurement" },
    { id: "rp13", industry: "construction", role_name: "HSE Officer", role_key: "hse" },
  ],
  real_estate: [
    { id: "rp14", industry: "real_estate", role_name: "Property Manager", role_key: "property_manager" },
    { id: "rp15", industry: "real_estate", role_name: "Legal Counsel", role_key: "legal" },
    { id: "rp16", industry: "real_estate", role_name: "Surveyor", role_key: "surveyor" },
  ],
  logistics: [
    { id: "rp17", industry: "logistics", role_name: "Dispatch Manager", role_key: "dispatch" },
    { id: "rp18", industry: "logistics", role_name: "Fleet Supervisor", role_key: "fleet" },
    { id: "rp19", industry: "logistics", role_name: "Customs Agent", role_key: "customs" },
  ],
  tourism: [
    { id: "rp20", industry: "tourism", role_name: "Tour Coordinator", role_key: "coordinator" },
    { id: "rp21", industry: "tourism", role_name: "Safety Officer", role_key: "safety" },
  ],
  freelance: [
    { id: "rp22", industry: "freelance", role_name: "Project Manager", role_key: "pm" },
    { id: "rp23", industry: "freelance", role_name: "QA Reviewer", role_key: "qa" },
  ],
  education: [
    { id: "rp24", industry: "education", role_name: "Course Lead", role_key: "course_lead" },
    { id: "rp25", industry: "education", role_name: "Content Reviewer", role_key: "reviewer" },
  ],
  retail: [
    { id: "rp26", industry: "retail", role_name: "Inventory Manager", role_key: "inventory" },
    { id: "rp27", industry: "retail", role_name: "Shipping Coordinator", role_key: "shipping" },
  ],
  project_management: [
    { id: "rp28", industry: "project_management", role_name: "Scrum Master", role_key: "scrum" },
    { id: "rp29", industry: "project_management", role_name: "Delivery Lead", role_key: "delivery" },
  ],
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(ws: Workspace[], members: Record<string, Member[]>, tasks: Record<string, TaskAssignment[]>, log: ActivityLogEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ws, members, tasks, log }));
}

let orderCounter = 200;

export function useTestnetTeams(role: "vendor" | "buyer" = "vendor") {
  const saved = loadState();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(saved?.ws || INITIAL_WORKSPACES);
  const [allMembers, setAllMembers] = useState<Record<string, Member[]>>(saved?.members || MOCK_MEMBERS);
  const [allTasks, setAllTasks] = useState<Record<string, TaskAssignment[]>>(saved?.tasks || MOCK_TASKS);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(saved?.log || INITIAL_ACTIVITY_LOG);

  const persist = useCallback((ws: Workspace[], m: Record<string, Member[]>, t: Record<string, TaskAssignment[]>, l: ActivityLogEntry[]) => {
    saveState(ws, m, t, l);
  }, []);

  const addLog = useCallback((wsId: string, orderNum: string, actor: string, action: string, detail: string) => {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspace_id: wsId, order_number: orderNum, actor, action, detail,
      timestamp: new Date().toISOString(),
    };
    setActivityLog(prev => {
      const updated = [entry, ...prev];
      return updated;
    });
    return entry;
  }, []);

  const getMembers = useCallback((wsId: string) => allMembers[wsId] || [], [allMembers]);
  const getTasks = useCallback((wsId: string) => allTasks[wsId] || [], [allTasks]);
  const getPresets = useCallback((industry: string) => MOCK_PRESETS[industry] || [], []);
  const getActivityLog = useCallback((wsId?: string) => {
    if (!wsId) return activityLog;
    return activityLog.filter(e => e.workspace_id === wsId);
  }, [activityLog]);

  const createWorkspace = useCallback((title: string, industry: string, description: string, txId?: string) => {
    orderCounter++;
    const prefix = industry.slice(0, 3).toUpperCase();
    const orderNumber = `ORD-${prefix}-2026-${String(orderCounter).padStart(4, "0")}`;
    const ws: Workspace = {
      id: `ws-${Date.now()}`, title, description, industry, status: "active",
      created_at: new Date().toISOString(), transaction_id: txId || `tx-${Date.now()}`, owner_id: "testnet-owner",
      order_number: orderNumber,
    };
    const updated = [ws, ...workspaces];
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: ws.id, order_number: orderNumber,
      actor: "Team Lead", action: "workspace_created", detail: `Created workspace: ${title} (${orderNumber})`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setWorkspaces(updated);
    setActivityLog(updatedLog);
    persist(updated, allMembers, allTasks, updatedLog);
    toast.success(`Workspace created — ${orderNumber}`);
    return ws;
  }, [workspaces, allMembers, allTasks, activityLog, persist]);

  const addMember = useCallback((wsId: string, name: string, roleKey: string, lang: string) => {
    const ws = workspaces.find(w => w.id === wsId);
    const member: Member = {
      id: `m-${Date.now()}`, user_id: `usr-${Date.now()}`, display_name: name,
      role: roleKey, can_finalize: false, removed_at: null, preferred_language: lang,
    };
    const updated = { ...allMembers, [wsId]: [...(allMembers[wsId] || []), member] };
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: wsId, order_number: ws?.order_number || "",
      actor: "Team Lead", action: "member_added", detail: `Added ${name} as ${roleKey}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setAllMembers(updated);
    setActivityLog(updatedLog);
    persist(workspaces, updated, allTasks, updatedLog);
    toast.success("Member added");
  }, [allMembers, workspaces, allTasks, activityLog, persist]);

  const removeMember = useCallback((wsId: string, memberId: string) => {
    const ws = workspaces.find(w => w.id === wsId);
    const member = (allMembers[wsId] || []).find(m => m.id === memberId);
    const updated = {
      ...allMembers,
      [wsId]: (allMembers[wsId] || []).map(m => m.id === memberId ? { ...m, removed_at: new Date().toISOString() } : m),
    };
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: wsId, order_number: ws?.order_number || "",
      actor: "Team Lead", action: "member_removed", detail: `Removed ${member?.display_name || "member"}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setAllMembers(updated);
    setActivityLog(updatedLog);
    persist(workspaces, updated, allTasks, updatedLog);
    toast.success("Member removed");
  }, [allMembers, workspaces, allTasks, activityLog, persist]);

  const toggleFinalize = useCallback((wsId: string, memberId: string) => {
    const updated = {
      ...allMembers,
      [wsId]: (allMembers[wsId] || []).map(m => m.id === memberId ? { ...m, can_finalize: !m.can_finalize } : m),
    };
    setAllMembers(updated);
    persist(workspaces, updated, allTasks, activityLog);
    toast.success("Finalizer toggled");
  }, [allMembers, workspaces, allTasks, activityLog, persist]);

  const assignTask = useCallback((wsId: string, memberId: string, key: string, label: string, instructions: string, slaHours?: number, deadline?: string) => {
    const ws = workspaces.find(w => w.id === wsId);
    const member = (allMembers[wsId] || []).find(m => m.id === memberId);
    const existing = allTasks[wsId] || [];
    const task: TaskAssignment = {
      id: `t-${Date.now()}`, member_id: memberId, milestone_key: key,
      milestone_label: label, instructions, status: "pending",
      sort_order: existing.length, sla_hours: slaHours || null, deadline_at: deadline || null,
    };
    const updated = { ...allTasks, [wsId]: [...existing, task] };
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: wsId, order_number: ws?.order_number || "",
      actor: "Team Lead", action: "task_assigned", detail: `Assigned "${label}" to ${member?.display_name || "member"}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setAllTasks(updated);
    setActivityLog(updatedLog);
    persist(workspaces, allMembers, updated, updatedLog);
    toast.success("Task assigned");
  }, [allTasks, workspaces, allMembers, activityLog, persist]);

  const completeTask = useCallback((wsId: string, taskId: string, evidenceUrl?: string, completedBy?: string) => {
    const ws = workspaces.find(w => w.id === wsId);
    const task = (allTasks[wsId] || []).find(t => t.id === taskId);
    const member = task ? (allMembers[wsId] || []).find(m => m.id === task.member_id) : null;
    const evUrl = evidenceUrl || "evidence_uploaded.pdf";
    const updated = {
      ...allTasks,
      [wsId]: (allTasks[wsId] || []).map(t =>
        t.id === taskId ? { ...t, status: "completed", evidence_url: evUrl } : t
      ),
    };
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: wsId, order_number: ws?.order_number || "",
      actor: completedBy || member?.display_name || "Team Member", action: "task_completed",
      detail: `Completed: ${task?.milestone_label || task?.milestone_key || "Task"} — evidence: ${evUrl}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setAllTasks(updated);
    setActivityLog(updatedLog);
    persist(workspaces, allMembers, updated, updatedLog);
    toast.success(`✅ Task completed — ${task?.milestone_label || "Task"}`);
  }, [allTasks, workspaces, allMembers, activityLog, persist]);

  const updateWorkspaceStatus = useCallback((wsId: string, status: string) => {
    const ws = workspaces.find(w => w.id === wsId);
    const updated = workspaces.map(w => w.id === wsId ? { ...w, status } : w);
    const logEntry: ActivityLogEntry = {
      id: `log-${Date.now()}`, workspace_id: wsId, order_number: ws?.order_number || "",
      actor: "Team Lead", action: `workspace_${status}`,
      detail: `Work order ${ws?.order_number || ""} marked as ${status}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLog = [logEntry, ...activityLog];
    setWorkspaces(updated);
    setActivityLog(updatedLog);
    persist(updated, allMembers, allTasks, updatedLog);
    toast.success(`Work order marked as ${status}`);
  }, [workspaces, allMembers, allTasks, activityLog, persist]);

  const resetTeams = useCallback(() => {
    setWorkspaces(INITIAL_WORKSPACES);
    setAllMembers(MOCK_MEMBERS);
    setAllTasks(MOCK_TASKS);
    setActivityLog(INITIAL_ACTIVITY_LOG);
    saveState(INITIAL_WORKSPACES, MOCK_MEMBERS, MOCK_TASKS, INITIAL_ACTIVITY_LOG);
    toast.success("🔄 Teams data reset");
  }, []);

  return {
    workspaces, getMembers, getTasks, getPresets, getActivityLog,
    createWorkspace, addMember, removeMember, toggleFinalize,
    assignTask, completeTask, updateWorkspaceStatus, resetTeams,
  };
}
