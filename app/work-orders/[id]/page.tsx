"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import WorkOrderPrint from "@/components/WorkOrderPrint";
import {
  ArrowLeft,
  Printer,
  Play,
  CheckCircle2,
  Search,
  Layers,
  CheckSquare,
  Clock,
  Percent,
  FileText,
  User,
  Settings,
  AlertCircle,
} from "lucide-react";

interface WorkOrder {
  id: number;
  created_at: string;
  wo_number: string;
  tool_id: string;
  tool_number: string;
  tool_name: string;
  scheduled_date: string;
  status: "OPEN" | "IN PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  created_by: string;
  actions_count: number;
  priority?: string;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_comments?: string | null;
  follow_up_findings?: string | null;
}

interface WorkOrderAction {
  id: number;
  work_order_id: number;
  preventive_action_id: number;
  task_description: string;
  frequency: string;
  created_at: string;
  is_completed: boolean;
  completed_at?: string | null;
  workcenter?: string | null;
  equipment?: string | null;
  sub_equipment?: string | null;
  maintenance_equipment?: string | null;
  operation?: string | null;
  control_method?: string | null;
  technician?: string | null;
  estimated_time?: string | null;
  part_reference?: string | null;
  required_material?: string | null;
  remarks?: string | null;
  priority?: string | null;
  action_en?: string | null;
  action_ro?: string | null;
}

type ChecklistFilter = "ALL" | "OPEN" | "COMPLETED";

export default function WorkOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [actions, setActions] = useState<WorkOrderAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Stări pentru filtre, căutare și formulare
  const [searchQuery, setSearchQuery] = useState("");
  const [checklistFilter, setChecklistFilter] =
    useState<ChecklistFilter>("ALL");
  const [completedBy, setCompletedBy] = useState("");
  const [completionComments, setCompletionComments] = useState("");
  const [followUpFindings, setFollowUpFindings] = useState("");
  const [printLanguage, setPrintLanguage] = useState<"EN" | "RO">("EN");

  useEffect(() => {
    if (id) {
      loadWorkOrderData();
    }
  }, [id]);

  async function loadWorkOrderData() {
    try {
      setIsLoading(true);

      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (woError) throw woError;
      setWorkOrder(woData);

      if (woData.completed_by) setCompletedBy(woData.completed_by);
      if (woData.completion_comments)
        setCompletionComments(woData.completion_comments);
      if (woData.follow_up_findings)
        setFollowUpFindings(woData.follow_up_findings);

      const { data: actionsData, error: actionsError } = await supabase
        .from("work_order_actions")
        .select(
          "id, work_order_id, preventive_action_id, task_description, frequency, created_at, is_completed, completed_at",
        )
        .eq("work_order_id", id)
        .order("id", { ascending: true });

      if (actionsError) throw actionsError;
      const rawActions = actionsData || [];
      const pmTaskIds = Array.from(
        new Set(rawActions.map((a) => a.preventive_action_id).filter(Boolean)),
      );

      let pmTasksMap: Record<number, any> = {};

      if (pmTaskIds.length > 0) {
        const { data: pmTasksData, error: pmTasksError } = await supabase
          .from("pm_tasks")
          .select(
            `
            id, action, actiune, workcenter, equipment, sub_equipment, maintenance_equipment, operation, 
            control_method, technician, estimated_time , part_reference, 
            required_material, remarks, priority
          `,
          )
          .in("id", pmTaskIds);

        if (pmTasksError) throw pmTasksError;

        if (pmTasksData) {
          pmTasksMap = pmTasksData.reduce((acc: Record<number, any>, curr) => {
            acc[curr.id] = curr;
            return acc;
          }, {});
        }
      }

      const combinedActions = rawActions.map((action) => {
        const matchingPmTask = pmTasksMap[action.preventive_action_id] || {};
        return {
          ...action,
          workcenter: matchingPmTask.workcenter || null,
          equipment: matchingPmTask.equipment || null,
          sub_equipment: matchingPmTask.sub_equipment || null,
          maintenance_equipment: matchingPmTask.maintenance_equipment || null,
          operation: matchingPmTask.operation || null,
          control_method: matchingPmTask.control_method || null,
          technician: matchingPmTask.technician || null,
          estimated_time: matchingPmTask.estimated_time || null,
          part_reference: matchingPmTask.part_reference || null,
          required_material: matchingPmTask.required_material || null,
          remarks: matchingPmTask.remarks || null,
          priority: matchingPmTask.priority || null,
          action_en: matchingPmTask.action || null,
          action_ro: matchingPmTask.actiune || null,
        };
      });

      setActions(combinedActions);
    } catch (err: any) {
      alert(err.message || "Error loading work order specifications");
      router.push("/work-orders/list");
    } finally {
      setIsLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };
  async function startWorkOrder() {
    if (!workOrder || workOrder.status !== "OPEN") return;
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "IN PROGRESS",
          started_at: new Date().toISOString(),
        })
        .eq("id", workOrder.id);

      if (error) throw error;
      await loadWorkOrderData();
    } catch (err: any) {
      alert(err.message || "Failed to start the Work Order");
    } finally {
      setIsUpdating(false);
    }
  }

  async function toggleActionChecked(actionId: number, currentStatus: boolean) {
    if (!workOrder || workOrder.status !== "IN PROGRESS") return;
    try {
      const nextStatus = !currentStatus;
      const { error } = await supabase
        .from("work_order_actions")
        .update({
          is_completed: nextStatus,
          completed_at: nextStatus ? new Date().toISOString() : null,
        })
        .eq("id", actionId);

      if (error) throw error;

      setActions(
        actions.map((act) =>
          act.id === actionId
            ? {
                ...act,
                is_completed: nextStatus,
                completed_at: nextStatus ? new Date().toISOString() : null,
              }
            : act,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update task state");
    }
  }

  async function toggleAllActions() {
    if (
      !workOrder ||
      workOrder.status !== "IN PROGRESS" ||
      actions.length === 0
    )
      return;

    try {
      const areAllCompleted = actions.every((act) => act.is_completed);
      const nextStatus = !areAllCompleted;
      const actionIds = actions.map((act) => act.id);
      const timestamp = nextStatus ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("work_order_actions")
        .update({
          is_completed: nextStatus,
          completed_at: timestamp,
        })
        .in("id", actionIds);

      if (error) throw error;

      setActions(
        actions.map((act) => ({
          ...act,
          is_completed: nextStatus,
          completed_at: timestamp,
        })),
      );
    } catch (err: any) {
      alert(err.message || "Failed execution of global checklist transition");
    }
  }
  async function completeWorkOrder() {
    if (!workOrder || workOrder.status !== "IN PROGRESS") return;

    const allChecked = actions.every((act) => act.is_completed);
    if (!allChecked) {
      alert("All preventive actions must be completed.");
      return;
    }

    if (!completedBy.trim()) {
      alert("Please provide the name of the technician completing the work.");
      return;
    }

    try {
      setIsUpdating(true);

      const completionDate = new Date();
      const completionIso = completionDate.toISOString();

      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "COMPLETED",
          completed_at: completionIso,
          completed_by: completedBy.trim(),
          completion_comments: completionComments.trim(),
          follow_up_findings: followUpFindings.trim(),
        })
        .eq("id", workOrder.id);

      if (error) throw error;

      if (followUpFindings.trim() !== "") {
        const { error: followUpError } = await supabase
          .from("follow_up_actions")
          .insert({
            wo_id: workOrder.id,
            tool_number: workOrder.tool_number || workOrder.tool_id,
            title: `PM Follow-Up - ${workOrder.tool_number || workOrder.tool_id}`,
            description: followUpFindings.trim(),
            priority: "MEDIUM",
            status: "OPEN",
            created_by: completedBy.trim(),
          });

        if (followUpError) {
          console.error("Error creating auto follow-up record:", followUpError);
          alert(
            "Work Order closed, but there was an error generating the automatic Follow-Up task.",
          );
        }
      }

      const pmTaskIds = actions
        .map((action) => action.preventive_action_id)
        .filter(Boolean);

      if (pmTaskIds.length > 0) {
        const { data: pmTasks, error: pmTasksError } = await supabase
          .from("pm_tasks")
          .select("id, frequency, days")
          .in("id", pmTaskIds);

        if (pmTasksError) throw pmTasksError;

        for (const task of pmTasks || []) {
          let nextDueAt: string | null = null;
          let nextStatus = "OPEN";

          if (task.frequency === "ON_DEMAND") {
            nextStatus = "COMPLETED";
            nextDueAt = null;
          } else if (task.days) {
            const nextDate = new Date(completionDate);
            nextDate.setDate(nextDate.getDate() + Number(task.days));
            nextDueAt = nextDate.toISOString();
          }

          const { error: updateTaskError } = await supabase
            .from("pm_tasks")
            .update({
              last_completed_at: completionIso,
              next_due_at: nextDueAt,
              status: nextStatus,
            })
            .eq("id", task.id);

          if (updateTaskError) throw updateTaskError;
        }
      }

      alert(
        `Work Order ${workOrder.wo_number} closed successfully as COMPLETED.`,
      );
      await loadWorkOrderData();
    } catch (err: any) {
      alert(err.message || "Failed to complete the Work Order");
    } finally {
      setIsUpdating(false);
    }
  }
  function calculateDuration(): string {
    if (!workOrder?.started_at || !workOrder?.completed_at) return "N/A";
    const start = new Date(workOrder.started_at).getTime();
    const end = new Date(workOrder.completed_at).getTime();
    const diffMs = end - start;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }

  const getPriorityClass = (priority: string | null | undefined) => {
    const normalized = priority?.toUpperCase() || "";
    switch (normalized) {
      case "HIGH":
        return "bg-red-100 text-red-700 border border-red-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "LOW":
        return "bg-green-100 text-green-700 border border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  if (isLoading)
    return (
      <div className="p-6 max-w-7xl mx-auto font-medium text-slate-600 print:hidden">
        Loading specifications...
      </div>
    );
  if (!workOrder)
    return (
      <div className="p-6 max-w-7xl mx-auto font-medium text-red-600 print:hidden">
        Work Order not found.
      </div>
    );

  const totalTasks = actions.length;
  const completedTasks = actions.filter((a) => a.is_completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isAllDone = totalTasks > 0 && completedTasks === totalTasks;

  const getProgressColorClass = (percent: number) => {
    if (percent <= 25) return "bg-red-500";
    if (percent <= 75) return "bg-amber-500";
    if (percent <= 99) return "bg-blue-600";
    return "bg-green-600";
  };

  const countAll = actions.length;
  const countOpen = actions.filter((a) => !a.is_completed).length;
  const countCompleted = actions.filter((a) => a.is_completed).length;

  const filteredActions = actions.filter((action) => {
    if (checklistFilter === "OPEN" && action.is_completed) return false;
    if (checklistFilter === "COMPLETED" && !action.is_completed) return false;

    if (searchQuery.trim() !== "") {
      const normalizedQuery = searchQuery.toLowerCase();
      const matchText = (action.task_description || "").toLowerCase();
      const matchEquip = (action.equipment || "").toLowerCase();
      const matchOper = (action.operation || "").toLowerCase();
      return (
        matchText.includes(normalizedQuery) ||
        matchEquip.includes(normalizedQuery) ||
        matchOper.includes(normalizedQuery)
      );
    }
    return true;
  });
  return (
    <>
      <WorkOrderPrint
        woNumber={workOrder.wo_number}
        toolNumber={workOrder.tool_number || workOrder.tool_id}
        technician={workOrder.completed_by || workOrder.created_by}
        scheduledDate={workOrder.scheduled_date}
        priority={workOrder.priority || "MEDIUM"}
        status={workOrder.status || "OPEN"}
        actions={actions}
        language={printLanguage}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <Link
              href="/work-orders/list"
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to History
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Work Order{" "}
                <span className="text-blue-600 font-extrabold">
                  {workOrder.wo_number}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {workOrder.status === "OPEN" && (
              <button
                onClick={startWorkOrder}
                disabled={isUpdating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{isUpdating ? "Processing..." : "Start Work Order"}</span>
              </button>
            )}
            {workOrder.status === "IN PROGRESS" && (
              <button
                onClick={completeWorkOrder}
                disabled={isUpdating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isUpdating ? "Processing..." : "Complete Work Order"}
                </span>
              </button>
            )}
            {workOrder.status === "COMPLETED" && (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs font-black bg-green-100 text-green-800 border border-green-200 uppercase tracking-wide">
                ✓ COMPLETED
              </span>
            )}
            <select
              value={printLanguage}
              onChange={(e) => setPrintLanguage(e.target.value as "EN" | "RO")}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold bg-white"
            >
              <option value="EN">🇬🇧 English</option>
              <option value="RO">🇷🇴 Română</option>
            </select>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Equipment / Tool
              </span>
              <p className="text-base font-bold text-slate-800">
                {workOrder.tool_number || workOrder.tool_id}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Work Status
              </span>
              <div>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    workOrder.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : workOrder.status === "IN PROGRESS"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {workOrder.status}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Priority
              </span>
              <div>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${getPriorityClass(workOrder.priority)}`}
                >
                  {workOrder.priority || "MEDIUM"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Scheduled Date
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(workOrder.scheduled_date).toLocaleDateString("ro-RO")}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Created Date
              </span>
              <p className="text-sm font-mono text-slate-600">
                {new Date(workOrder.created_at).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Duration
              </span>
              <p className="text-sm font-mono font-bold text-blue-600">
                {calculateDuration()}
              </p>
            </div>
          </div>

          <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
              Execution Status Timeline
            </span>
            <div className="flex items-center w-full justify-between max-w-sm">
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 border border-blue-300 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                <span className="text-[11px] font-bold mt-1 text-blue-600">
                  OPEN
                </span>
              </div>
              <div
                className={`h-0.5 flex-1 mx-2 ${workOrder.status !== "OPEN" ? "bg-amber-500" : "bg-slate-200"}`}
              />

              <div className="flex flex-col items-center">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    workOrder.status === "IN PROGRESS" ||
                    workOrder.status === "COMPLETED"
                      ? "bg-amber-100 text-amber-600 border border-amber-300"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {workOrder.status === "IN PROGRESS" ||
                  workOrder.status === "COMPLETED"
                    ? "✓"
                    : "○"}
                </span>
                <span
                  className={`text-[11px] font-bold mt-1 ${workOrder.status === "IN PROGRESS" ? "text-amber-600" : "text-slate-400"}`}
                >
                  IN PROGRESS
                </span>
              </div>
              <div
                className={`h-0.5 flex-1 mx-2 ${workOrder.status === "COMPLETED" ? "bg-green-500" : "bg-slate-200"}`}
              />

              <div className="flex flex-col items-center">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    workOrder.status === "COMPLETED"
                      ? "bg-green-100 text-green-600 border border-green-300"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {workOrder.status === "COMPLETED" ? "✓" : "○"}
                </span>
                <span
                  className={`text-[11px] font-bold mt-1 ${workOrder.status === "COMPLETED" ? "text-green-600" : "text-slate-400"}`}
                >
                  COMPLETED
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Tasks
              </span>
              <span className="text-xl md:text-2xl font-black text-slate-800 mt-0.5 block">
                {totalTasks}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Completed Tasks
              </span>
              <span className="text-xl md:text-2xl font-black text-green-600 mt-0.5 block">
                {completedTasks}
              </span>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-500">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Remaining Tasks
              </span>
              <span className="text-xl md:text-2xl font-black text-amber-600 mt-0.5 block">
                {remainingTasks}
              </span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Progress Ratio
              </span>
              <span className="text-xl md:text-2xl font-black text-blue-600 mt-0.5 block">
                {progressPercent}%
              </span>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <Percent className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wide">
            <span>Global Checklist Optimization Tracker</span>
            <span className="font-mono text-sm">{progressPercent}% Done</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border">
            <div
              className={`h-full transition-all duration-500 ${getProgressColorClass(progressPercent)}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {workOrder.status === "COMPLETED" && (
          <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-green-100 pb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-green-800">
                Section 3 - Maintenance Closing & Audit Summary
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Completed By Technician
                </span>
                <p className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {workOrder.completed_by}
                </p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Closing Date Timestamp
                </span>
                <p className="text-slate-800 font-mono mt-0.5">
                  {workOrder.completed_at
                    ? new Date(workOrder.completed_at).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">
                  Calculated Execution Duration
                </span>
                <p className="text-blue-600 font-bold font-mono mt-0.5">
                  {calculateDuration()}
                </p>
              </div>
            </div>
            {workOrder.completion_comments && (
              <div className="mt-1 bg-white p-3 border border-green-100 rounded-lg shadow-inner">
                <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Remarks & Field Comments
                </span>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  &ldquo;{workOrder.completion_comments}&rdquo;
                </p>
              </div>
            )}
            {workOrder.follow_up_findings && (
              <div className="mt-1 bg-white p-3 border border-amber-200 rounded-lg shadow-inner bg-amber-50/10">
                <span className="block text-[11px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Follow-Up Findings
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {workOrder.follow_up_findings}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  Digital Execution Checklist
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {workOrder.status === "IN PROGRESS"
                    ? "Bifează sarcinile pe măsură ce le execuți în teren."
                    : "Vizualizare istoric acțiuni preventive."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded">
                  Filtered: {filteredActions.length} / {actions.length} Tasks
                </span>
                {isAllDone && (
                  <span className="text-[11px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded uppercase tracking-wide">
                    ✅ All Done
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-1">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-inner gap-1">
                {(["ALL", "OPEN", "COMPLETED"] as ChecklistFilter[]).map(
                  (tab) => {
                    const isActive = checklistFilter === tab;
                    const countMap = {
                      ALL: countAll,
                      OPEN: countOpen,
                      COMPLETED: countCompleted,
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => setChecklistFilter(tab)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        <span>{tab}</span>
                        <span
                          className={`text-[10px] px-1 rounded ${isActive ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"}`}
                        >
                          {countMap[tab]}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search task, equipment, operation..."
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase bg-slate-50/50">
                  <th className="p-3 w-20 text-center font-mono text-slate-600 bg-slate-100/50 border-r">
                    <label className="flex items-center justify-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={workOrder.status !== "IN PROGRESS"}
                        checked={isAllDone}
                        onChange={toggleAllActions}
                        className="w-4 h-4 rounded cursor-pointer accent-green-600 disabled:cursor-not-allowed opacity-80"
                      />
                      <span className="text-[10px] tracking-tighter">ALL</span>
                    </label>
                  </th>
                  <th className="p-3">Task Description</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Operation</th>
                  <th className="p-3 w-32">Technician</th>
                  <th className="p-3 w-28">Est. Time</th>
                  <th className="p-3 w-28">Priority</th>
                  <th className="p-3 w-24 text-right pr-6">Freq</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredActions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-12 text-center text-slate-400 font-medium italic"
                    >
                      No matching actions found for the current query
                      parameters.
                    </td>
                  </tr>
                ) : (
                  filteredActions.map((action) => (
                    <tr
                      key={action.id}
                      className={`transition-colors duration-150 ${action.is_completed ? "bg-green-50/20 hover:bg-green-50/40" : "hover:bg-slate-50/50"}`}
                    >
                      <td className="p-3 text-center border-r bg-slate-50/20">
                        <input
                          type="checkbox"
                          disabled={workOrder.status !== "IN PROGRESS"}
                          checked={action.is_completed}
                          onChange={() =>
                            toggleActionChecked(action.id, action.is_completed)
                          }
                          className={`w-5 h-5 rounded cursor-pointer accent-green-600 transition-all ${workOrder.status !== "IN PROGRESS" ? "cursor-not-allowed opacity-60" : ""}`}
                        />
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p
                            className={`font-semibold ${action.is_completed ? "text-slate-400 line-through font-normal" : "text-slate-800"}`}
                          >
                            {action.task_description}
                          </p>
                          {action.is_completed && action.completed_at && (
                            <span className="inline-flex items-center text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 border border-green-100 rounded">
                              ✓ Checked at{" "}
                              {new Date(action.completed_at).toLocaleTimeString(
                                "ro-RO",
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        {action.equipment || "—"}
                      </td>
                      <td className="p-3 text-slate-600">
                        {action.operation ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 border rounded">
                            <Settings className="w-3 h-3 text-slate-400" />{" "}
                            {action.operation}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {action.technician ? (
                          <span className="text-xs font-medium flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />{" "}
                            {action.technician}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {action.estimated_time || "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded uppercase ${getPriorityClass(action.priority)}`}
                        >
                          {action.priority || "MEDIUM"}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-6 text-xs font-bold uppercase text-slate-400 font-mono whitespace-nowrap">
                        {action.frequency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(workOrder.status === "IN PROGRESS" ||
          workOrder.status === "COMPLETED") && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 text-sm border-b pb-2 uppercase tracking-wide font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Section 2 - Work Completion Sign-Off</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  Completed By (Technician Name) *
                </label>
                <input
                  type="text"
                  disabled={workOrder.status === "COMPLETED"}
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  placeholder="Introduceți numele tehnicianului"
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors bg-white font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                Completion Comments / Notes
              </label>
              <textarea
                disabled={workOrder.status === "COMPLETED"}
                value={completionComments}
                onChange={(e) => setCompletionComments(e.target.value)}
                placeholder="Specificați componentele înlocuite, defecțiunile găsite sau observații din teren..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 transition-colors bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Follow-Up Findings
              </label>
              <textarea
                disabled={workOrder.status === "COMPLETED"}
                value={followUpFindings}
                onChange={(e) => setFollowUpFindings(e.target.value)}
                placeholder="Issues found during PM that require follow-up actions..."
                rows={3}
                className="w-full border border-amber-200 rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-amber-500 transition-colors bg-white font-medium focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
