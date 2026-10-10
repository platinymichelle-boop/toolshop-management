"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import WorkOrderPrint from "@/components/WorkOrderPrint";

interface WorkOrder {
  id: number;
  created_at: string;
  wo_number: string;
  tool_id: string;
  tool_number: string;
  tool_name: string;
  scheduled_date: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  created_by: string;
  actions_count: number;
  priority?: string;
  started_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completion_comments?: string | null;
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
}

export default function WorkOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [actions, setActions] = useState<WorkOrderAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Stări reactive pentru formularul de finalizare (Completion Section)
  const [completedBy, setCompletedBy] = useState("");
  const [completionComments, setCompletionComments] = useState("");

  useEffect(() => {
    if (id) {
      loadWorkOrderData();
    }
  }, [id]);
  async function loadWorkOrderData() {
    try {
      setIsLoading(true);

      // 1. Încarcă metadatele extinse ale ordinului de lucru din tabela părinte
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (woError) throw woError;
      setWorkOrder(woData);

      // Pre-populează câmpurile formularului dacă ordinul este deja închis
      if (woData.completed_by) setCompletedBy(woData.completed_by);
      if (woData.completion_comments)
        setCompletionComments(woData.completion_comments);

      // 2. Încarcă acțiunile corelate (inclusiv is_completed) din tabela copil
      const { data: actionsData, error: actionsError } = await supabase
        .from("work_order_actions")
        .select("*")
        .eq("work_order_id", id)
        .order("id", { ascending: true });

      if (actionsError) throw actionsError;
      setActions(actionsData || []);
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
  // ==========================================================
  // [MODIFICARE PASUL 6] - TRANZIȚIE STATUS: OPEN -> IN_PROGRESS
  // ==========================================================
  async function startWorkOrder() {
    if (!workOrder || workOrder.status !== "OPEN") return;
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "IN_PROGRESS",
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

  // ==========================================================
  // [MODIFICARE PASUL 6] - SALVARE CONTEXT DIGITAL TASK INDIVIDUAL
  // ==========================================================
  async function toggleActionChecked(actionId: number, currentStatus: boolean) {
    if (!workOrder || workOrder.status !== "IN_PROGRESS") return;
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

      // Actualizare optimistă locală în interfață pentru performanță
      setActions(
        actions.map((act) =>
          act.id === actionId ? { ...act, is_completed: nextStatus } : act,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update task state");
    }
  }

  // ==========================================================
  // [MODIFICARE PASUL 6] - TRANZIȚIE STATUS: IN_PROGRESS -> COMPLETED
  // ==========================================================
  async function completeWorkOrder() {
    if (!workOrder || workOrder.status !== "IN_PROGRESS") return;

    // 1. Validare: Toate taskurile trebuie să fie bifate obligatoriu
    const allChecked = actions.every((act) => act.is_completed);
    if (!allChecked) {
      alert("All preventive actions must be completed.");
      return;
    }

    // 2. Validare: Numele tehnicianului este necesar la închidere
    if (!completedBy.trim()) {
      alert("Please provide the name of the technician completing the work.");
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          completed_by: completedBy.trim(),
          completion_comments: completionComments.trim(),
        })
        .eq("id", workOrder.id);

      if (error) throw error;
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

  // ==========================================================
  // [MODIFICARE PASUL 6] - CALCUL DINAMIC DURAȚĂ OPERAȚIE
  // ==========================================================
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
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto font-medium text-slate-600 print:hidden">
        Loading specifications...
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6 max-w-7xl mx-auto font-medium text-red-600 print:hidden">
        Work Order not found.
      </div>
    );
  }

  return (
    <>
      {/* Componenta structurală de print industrial (Rămâne 100% Intactă) */}
      <WorkOrderPrint
        woNumber={workOrder.wo_number}
        toolNumber={workOrder.tool_number || workOrder.tool_id}
        technician={workOrder.completed_by || workOrder.created_by}
        scheduledDate={workOrder.scheduled_date}
        priority={workOrder.priority || "MEDIUM"}
        status={workOrder.status || "OPEN"}
        actions={actions.map((a) => ({
          id: a.id,
          task_description: a.task_description,
          frequency: a.frequency,
        }))}
      />

      {/* INTERFAȚA DE APLICAȚIE - Ascunsă garantat în timpul tipăririi fizice */}
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div className="space-y-1">
            <Link
              href="/work-orders/list"
              className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              &larr; Back to History
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Work Order{" "}
              <span className="text-blue-600 font-extrabold">
                {workOrder.wo_number}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* ==========================================================
                [MODIFICARE PASUL 6] - BUTOANE AUTOMATE WORKFLOW DE STATUS
               ========================================================== */}
            {workOrder.status === "OPEN" && (
              <button
                onClick={startWorkOrder}
                disabled={isUpdating}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isUpdating ? "Processing..." : "Start Work Order"}
              </button>
            )}

            {workOrder.status === "IN_PROGRESS" && (
              <button
                onClick={completeWorkOrder}
                disabled={isUpdating}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isUpdating ? "Processing..." : "Complete Work Order"}
              </button>
            )}

            {workOrder.status === "COMPLETED" && (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-black bg-green-100 text-green-800 border border-green-200 uppercase tracking-wide">
                ✓ COMPLETED
              </span>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200 flex items-center gap-2"
            >
              Print Document
            </button>
          </div>
        </div>

        {/* PANOU INDUSTRIAL EXTINS - REPORTING & AUDIT TIMP */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tool / Equipment
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
                    : workOrder.status === "IN_PROGRESS"
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
              Created Date
            </span>
            <p className="text-sm font-mono text-slate-700">
              {new Date(workOrder.created_at).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Execution Duration
            </span>
            <p className="text-sm font-mono font-bold text-blue-600">
              {calculateDuration()}
            </p>
          </div>

          <div className="space-y-1 border-t pt-2 md:border-t-0 md:pt-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Started Date
            </span>
            <p className="text-sm font-mono text-slate-700">
              {workOrder.started_at
                ? new Date(workOrder.started_at).toLocaleString()
                : "Not started"}
            </p>
          </div>
          <div className="space-y-1 border-t pt-2 md:border-t-0 md:pt-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Completed Date
            </span>
            <p className="text-sm font-mono text-slate-700">
              {workOrder.completed_at
                ? new Date(workOrder.completed_at).toLocaleString()
                : "Active or Open"}
            </p>
          </div>
          <div className="space-y-1 border-t pt-2 md:border-t-0 md:pt-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Priority
            </span>
            <p className="text-sm font-semibold uppercase text-slate-700">
              {workOrder.priority || "MEDIUM"}
            </p>
          </div>
          <div className="space-y-1 border-t pt-2 md:border-t-0 md:pt-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Registered Tasks
            </span>
            <p className="text-sm font-semibold text-slate-700">
              {workOrder.actions_count} Actions
            </p>
          </div>
        </div>
        {/* ==========================================================
            [MODIFICARE PASUL 6] - TASK CHECKLIST INTERACTIV DIGITAL
           ========================================================== */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 text-base">
              Digital Execution Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {workOrder.status === "IN_PROGRESS"
                ? "Bifează sarcinile pe măsură ce le execuți în teren."
                : "Vizualizare istoric acțiuni preventive."}
            </p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase bg-slate-50/50">
                <th className="p-4 w-20 text-center">Status</th>
                <th className="p-4">Action / Task Description</th>
                <th className="p-4 text-right pr-6">Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {actions.map((action) => (
                <tr
                  key={action.id}
                  className="hover:bg-slate-50/30 transition-colors"
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      disabled={workOrder.status !== "IN_PROGRESS"}
                      checked={action.is_completed}
                      onChange={() =>
                        toggleActionChecked(action.id, action.is_completed)
                      }
                      className={`w-5 h-5 rounded cursor-pointer accent-green-600 transition-all ${
                        workOrder.status !== "IN_PROGRESS"
                          ? "cursor-not-allowed opacity-60"
                          : ""
                      }`}
                    />
                  </td>
                  <td
                    className={`p-4 font-semibold ${action.is_completed ? "text-slate-400 line-through" : "text-slate-800"}`}
                  >
                    {action.task_description}
                  </td>
                  <td className="p-4 text-right pr-6 text-xs font-bold uppercase text-slate-500 font-mono">
                    {action.frequency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ==========================================================
            [MODIFICARE PASUL 6] - COMPLETION SECTION (FORMULAR DIGITAL)
           ========================================================== */}
        {(workOrder.status === "IN_PROGRESS" ||
          workOrder.status === "COMPLETED") && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-base border-b pb-2 uppercase tracking-wide text-sm font-mono text-slate-600">
              Section 2 - Work Completion Sign-Off
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
                  className="w-full border rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
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
                className="w-full border rounded-lg p-2.5 text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
