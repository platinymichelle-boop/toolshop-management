"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  CheckSquare,
  Square,
  Printer,
  Search,
  SlidersHorizontal,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

interface FixtureData {
  fixture_name: string;
  machine: string;
  manufacturer: string;
}

interface FixtureWorkOrder {
  id: string;
  wo_number: string;
  status: string;
  priority: string;
  created_by: string;
  scheduled_date: string | null;
  actions_count: number;
  team_code?: string;
  fixtures: FixtureData | null;
}

interface WorkOrderTask {
  id: string;
  task_name: string;
  task_name_ro: string;
  frequency: string;
  is_completed: boolean;
}

export default function FixtureWorkOrderDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const woId = resolvedParams.id;

  // Core Data States
  const [workOrder, setWorkOrder] = useState<FixtureWorkOrder | null>(null);
  const [tasks, setTasks] = useState<WorkOrderTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Execution & Tools States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "OPEN" | "COMPLETED">(
    "ALL",
  );
  const [printLanguage, setPrintLanguage] = useState<"EN" | "RO" | "BOTH">(
    "BOTH",
  );

  // Closing Form Inputs
  const [technicianName, setTechnicianName] = useState<string>("");
  const [completionComments, setCompletionComments] = useState<string>("");
  const [followUpFindings, setFollowUpFindings] = useState<string>("");

  const fetchWorkOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: woData, error: woErr } = await supabase
        .from("fixture_work_orders")
        .select(
          `
          *,
          fixtures (
            fixture_name,
            machine,
            manufacturer
          )
        `,
        )
        .eq("id", woId)
        .single();

      if (woErr) throw woErr;
      setWorkOrder(woData as any);
      if (woData?.created_by) {
        setTechnicianName(woData.created_by);
      }

      const { data: tasksData, error: tasksErr } = await supabase
        .from("fixture_work_order_tasks")
        .select(
          `
  id,
  task_name,
  task_name_ro,
  frequency,
  is_completed
`,
        )
        .eq("fixture_work_order_id", woId)
        .order("id", { ascending: true });

      if (tasksErr) throw tasksErr;
      setTasks(tasksData || []);
    } catch (err: any) {
      console.error("Error loading professional work order:", err);
      setError(
        err.message ||
          "A apărut o eroare la preluarea datelor din registrul CMMS.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (woId) fetchWorkOrderDetails();
  }, [woId]);
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (workOrder?.status === "COMPLETED") return;

    try {
      const nextStatus = !currentStatus;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, is_completed: nextStatus } : t,
        ),
      );

      const { error: updateErr } = await supabase
        .from("fixture_work_order_tasks")
        .update({ is_completed: nextStatus })
        .eq("id", taskId);

      if (updateErr) throw updateErr;

      const completedCount = tasks.filter((t) =>
        t.id === taskId ? nextStatus : t.is_completed,
      ).length;

      await supabase
        .from("fixture_work_orders")
        .update({ completed_actions_count: completedCount })
        .eq("id", woId);

      if (workOrder && workOrder.status === "OPEN" && completedCount > 0) {
        await supabase
          .from("fixture_work_orders")
          .update({ status: "IN PROGRESS" })
          .eq("id", woId);
        setWorkOrder((prev) =>
          prev ? { ...prev, status: "IN PROGRESS" } : null,
        );
      }
    } catch (err: any) {
      console.error("Task toggle transaction failed:", err);
      showToast("Eroare la salvarea stării.");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, is_completed: currentStatus } : t,
        ),
      );
    }
  };

  const handleCompleteWorkOrder = async () => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.is_completed).length;

    if (completedCount !== totalCount) {
      setError(
        "Toate sarcinile din checklist trebuie finalizate (100%) înainte de închiderea auditabilă.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const nowISO = new Date().toISOString();
      const nowLocale = new Date().toLocaleString("ro-RO");
      const finalRemarks = completionComments
        ? `${completionComments} | Follow-up: ${followUpFindings} | Finalizat la: ${nowLocale}`
        : `Routine PM performed by ${technicianName} la data de ${nowLocale}`;

      // 1. Actualizare stadiu în fixture_work_orders (Folosind logica simplificată stabilizată)
      const { error: completeErr } = await supabase
        .from("fixture_work_orders")
        .update({
          status: "COMPLETED",
          remarks: finalRemarks,
        })
        .eq("id", woId);

      if (completeErr) throw completeErr;

      // 2. Generarea automată a acțiunii de Follow-Up (Dacă câmpul nu este gol)
      if (followUpFindings && followUpFindings.trim() !== "") {
        const fixtureName = workOrder?.fixtures?.fixture_name || "N/A";
        const fallbackPriority = workOrder?.priority || "MEDIUM";

        const { error: followUpErr } = await supabase
          .from("follow_up_actions")
          .insert({
            fixture_work_order_id: woId,
            fixture_work_order_number: workOrder?.wo_number,

            tool_number: fixtureName,
            title: `Fixture PM Follow-Up - ${fixtureName}`,
            description: followUpFindings.trim(),
            priority: fallbackPriority.toUpperCase(),
            status: "OPEN",
            created_by: technicianName || "System",
            created_at: nowISO,
          });

        if (followUpErr) {
          console.error(
            "Follow-Up automation background insertion failed:",
            followUpErr,
          );
          throw new Error(
            `Ordinul a fost actualizat, dar crearea acțiunii de Follow-Up a eșuat: ${followUpErr.message}`,
          );
        }
      }

      showToast(
        "Ordinul de lucru a fost închis și acțiunea de urmărire a fost procesată!",
      );
      router.push("/fixture-work-orders/list");
    } catch (err: any) {
      console.error("Error finalizing work order and follow-up:", err);
      setError(
        err?.message ||
          err?.details ||
          "A apărut o eroare la executarea operațiunilor de finalizare în baza de date.",
      );
      setSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.is_completed).length;
    const remaining = total - completed;
    const progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, remaining, progressPercent };
  }, [tasks]);
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchFilter =
        taskFilter === "ALL" ||
        (taskFilter === "OPEN" && !t.is_completed) ||
        (taskFilter === "COMPLETED" && t.is_completed);

      const nameEn = t.task_name?.toLowerCase() || "";
      const nameRo = t.task_name_ro?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();
      const matchSearch = nameEn.includes(search) || nameRo.includes(search);

      return matchFilter && matchSearch;
    });
  }, [tasks, taskFilter, searchTerm]);

  const counters = useMemo(() => {
    const all = tasks.length;
    const open = tasks.filter((t) => !t.is_completed).length;
    const comp = tasks.filter((t) => t.is_completed).length;
    return { all, open, comp };
  }, [tasks]);

  const workOrderFrequency = useMemo(() => {
    if (!tasks.length) return "Monthly";

    return tasks[0]?.frequency || "Monthly";
  }, [tasks]);

  const getProgressBarColor = (percent: number) => {
    if (percent === 0) return "bg-rose-500";
    if (percent <= 75) return "bg-amber-500";
    if (percent <= 99) return "bg-blue-500";
    return "bg-emerald-500";
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return "bg-blue-500 text-white border-blue-600 shadow-sm";
      case "IN PROGRESS":
        return "bg-amber-500 text-white border-amber-600 shadow-sm";
      case "COMPLETED":
        return "bg-emerald-600 text-white border-emerald-700 shadow-sm";
      default:
        return "bg-slate-500 text-white border-slate-600";
    }
  };

  const handleTriggerPrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800 relative antialiased">
      <style jsx global>{`
        @media print {
          body,
          html,
          .min-h-screen {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: "Helvetica Neue", Arial, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-window-layout {
            display: block !important;
            width: 100% !important;
            margin-top: 30px !important;
            padding: 20px 25px !important;
          }
          .industrial-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 12px !important;
          }
          .industrial-table th,
          .industrial-table td {
            border: 1.5px solid black !important;
            padding: 6px 10px !important;
            text-align: left !important;
            font-size: 11px !important;
          }
          .dotted-line {
            border-bottom: 1px dotted #444 !important;
            height: 22px !important;
            width: 100% !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Alerte Toast web */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-bold bg-slate-900 text-white shadow-xl border border-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Înapoi la listă (no-print) */}
      <div className="no-print">
        <Link
          href="/fixture-work-orders/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Listă Ordine Dispozitive
        </Link>
      </div>
      {/* ====================================================
          LAYOUT DESIGN EXCLUSIV PENTRU PRINTARE (A4 INDUSTRIAL FORM)
          ==================================================== */}
      {workOrder && (
        <div className="print-only print-window-layout space-y-4">
          <div className="flex justify-between items-end border-b-4 border-black pb-1">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-700 uppercase">
                METAL STAMPING MAINTENANCE
              </p>
              <h1 className="text-2xl font-black tracking-tight text-black">
                PREVENTIVE MAINTENANCE WORK ORDER
              </h1>
            </div>
            <div className="text-right text-[10px] font-bold text-black whitespace-nowrap">
              <p>SYSTEM DOC ID</p>
              <p className="text-xs font-black">FORM-PM-WO-REV2</p>
            </div>
          </div>

          <table className="industrial-table">
            <tbody>
              <tr>
                <td className="w-1/2 font-medium">
                  TOOL NUMBER:{" "}
                  <span className="font-black">
                    {workOrder.fixtures?.machine || "N/A"}
                  </span>
                </td>
                <td className="w-1/2 font-medium">
                  WORK ORDER NO:{" "}
                  <span className="font-black">{workOrder.wo_number}</span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">
                  FIXTURE NAME:{" "}
                  <span className="font-black">
                    {workOrder.fixtures?.fixture_name || "N/A"}
                  </span>
                </td>
                <td className="font-medium">
                  PRIORITY:{" "}
                  <span className="font-black">{workOrder.priority}</span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">
                  ASSIGNED TECHNICIAN:{" "}
                  <span className="font-black">
                    {technicianName || workOrder.created_by}
                  </span>
                </td>
                <td className="font-medium">
                  FREQUENCY:{" "}
                  <span className="font-black">
                    {workOrderFrequency === "Yearly" ? "1Y" : "1M"}
                  </span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="font-medium">
                  WORK ORDER STATUS:{" "}
                  <span className="font-black uppercase">
                    {workOrder.status}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bg-black text-white px-3 py-1 text-[11px] font-bold tracking-wider uppercase">
            SECTION 1 - PREVENTIVE MAINTENANCE TASKS
          </div>

          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="border-2 border-black p-3 space-y-2 rounded-sm bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="border-2 border-black w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center font-bold text-[10px]">
                      {task.is_completed ? "X" : ""}
                    </div>
                    <div className="text-xs font-bold text-black leading-tight">
                      <span>{String(index + 1).padStart(2, "0")}. </span>
                      {printLanguage === "BOTH" && (
                        <>
                          <p className="font-black">{task.task_name}</p>
                          <p className="text-slate-600 font-medium mt-0.5">
                            {task.task_name_ro || task.task_name}
                          </p>
                        </>
                      )}
                      {printLanguage === "EN" && (
                        <p className="font-black">{task.task_name}</p>
                      )}
                      {printLanguage === "RO" && (
                        <p className="font-black">
                          {task.task_name_ro || task.task_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="border border-black px-2 py-0.5 text-[9px] font-black rounded-sm">
                    {workOrderFrequency === "Yearly" ? "1Y" : "1M"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-700 font-bold pt-1 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-bold">
                      OPERATION:
                    </p>
                    <p className="text-black">Stopped</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-bold">
                      MAINTENANCE EQUIPMENT:
                    </p>
                    <p className="text-black">Visual / Mechanical</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] uppercase text-slate-400 font-bold">
                      CONTROL METHOD:
                    </p>
                    <p className="text-black">Visual & Torque Check</p>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="text-[9px] uppercase text-slate-400 font-bold">
                    Comments / Findings:
                  </p>
                  <div className="dotted-line"></div>
                  <div className="dotted-line"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-black text-white px-3 py-1 text-[11px] font-bold tracking-wider uppercase">
            TOOLS & MATERIALS REQUIRED
          </div>
          <div className="text-[11px] font-semibold text-black pl-2">
            • Standard Toolkit, Cleaning Solution, Torque Wrench, Visual
            baseline check sheets.
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="border-2 border-black p-3 space-y-4 rounded-sm">
              <h3 className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1">
                TECHNICIAN COMPLETION
              </h3>
              <div className="space-y-3 text-[11px] font-bold">
                <div className="flex items-center flex-wrap">
                  Technician Name:{" "}
                  <span className="font-normal underline ml-1">
                    {technicianName || "____________________"}
                  </span>
                </div>
                <div className="pt-2 flex items-center">
                  Signature:{" "}
                  <div className="inline-block border-b border-black w-2/3 ml-2 h-4"></div>
                </div>
                <div className="pt-2 flex items-center">
                  Date:{" "}
                  <span className="font-normal underline ml-1">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-2 border-black p-3 space-y-4 rounded-sm">
              <h3 className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-1">
                SUPERVISOR VALIDATION
              </h3>
              <div className="space-y-3 text-[11px] font-bold">
                <div className="flex items-center">
                  Supervisor:{" "}
                  <div className="inline-block border-b border-black w-2/3 ml-2 h-4"></div>
                </div>
                <div className="pt-2 flex items-center">
                  Signature:{" "}
                  <div className="inline-block border-b border-black w-2/3 ml-2 h-4"></div>
                </div>
                <div className="pt-2 flex items-center">
                  Date:{" "}
                  <div className="inline-block border-b border-black w-1/2 ml-2 h-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ====================================================
              INTERFAȚA WEB INTERACTIVĂ STANDARD (Ecrane/Tablete)
              ==================================================== */}
      {workOrder && (
        <div className="no-print space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-3 flex-1 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  {workOrder.wo_number}
                </h1>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider border uppercase ${getStatusBadgeStyle(workOrder.status)}`}
                >
                  {workOrder.status}
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider border uppercase bg-blue-50 text-blue-700 border-blue-200">
                  {workOrderFrequency === "Yearly" ? "YEARLY PM" : "MONTHLY PM"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                <p>
                  Fixture Name:{" "}
                  <span className="font-bold text-slate-900">
                    {workOrder.fixtures?.fixture_name || "N/A"}
                  </span>
                </p>
                <p>
                  Machine Code:{" "}
                  <span className="font-bold text-slate-900">
                    {workOrder.fixtures?.machine || "N/A"}
                  </span>
                </p>
                <p>
                  Manufacturer:{" "}
                  <span className="font-bold text-slate-900">
                    {workOrder.fixtures?.manufacturer || "N/A"}
                  </span>
                </p>
                <p>
                  Frequency Interval:{" "}
                  <span className="font-semibold text-slate-800">
                    {workOrder.actions_count > 5
                      ? "Yearly program"
                      : "Monthly program"}
                  </span>
                </p>
                <p>
                  Assigned Shift:{" "}
                  <span className="font-semibold text-slate-800">
                    {workOrder.created_by}
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  Priority Level:
                  <span className="font-bold text-rose-600 uppercase">
                    {workOrder.priority}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center md:justify-end gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Print Lang:
                </span>
                <select
                  value={printLanguage}
                  onChange={(e) => setPrintLanguage(e.target.value as any)}
                  className="bg-transparent focus:outline-none font-bold text-slate-700 cursor-pointer text-xs"
                >
                  <option value="BOTH">BOTH (EN/RO)</option>
                  <option value="EN">EN Only</option>
                  <option value="RO">RO Only</option>
                </select>
              </div>

              <button
                onClick={handleTriggerPrint}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print A4</span>
              </button>

              <button
                onClick={fetchWorkOrderDetails}
                disabled={submitting}
                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    workOrder.status === "OPEN"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "border-emerald-500 text-emerald-500 bg-emerald-50"
                  }`}
                >
                  {workOrder.status !== "OPEN" ? "✓" : "1"}
                </div>
                <span
                  className={
                    workOrder.status === "OPEN"
                      ? "text-slate-900 font-black"
                      : "text-slate-400"
                  }
                >
                  OPEN
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    workOrder.status === "IN PROGRESS"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : workOrder.status === "COMPLETED"
                        ? "border-emerald-500 text-emerald-500 bg-emerald-50"
                        : "border-slate-200 text-slate-300"
                  }`}
                >
                  {workOrder.status === "COMPLETED" ? "✓" : "2"}
                </div>
                <span
                  className={
                    workOrder.status === "IN PROGRESS"
                      ? "text-slate-900 font-black"
                      : "text-slate-400"
                  }
                >
                  IN PROGRESS
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 text-slate-300" />
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    workOrder.status === "COMPLETED"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "border-slate-200 text-slate-300"
                  }`}
                >
                  3
                </div>
                <span
                  className={
                    workOrder.status === "COMPLETED"
                      ? "text-slate-900 font-black"
                      : "text-slate-400"
                  }
                >
                  COMPLETED
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Tasks",
                val: metrics.total,
                color: "border-slate-200 text-slate-900 bg-white",
              },
              {
                label: "Completed Tasks",
                val: metrics.completed,
                color: "border-emerald-100 text-emerald-700 bg-white",
              },
              {
                label: "Remaining Tasks",
                val: metrics.remaining,
                color: "border-amber-100 text-amber-700 bg-white",
              },
              {
                label: "Progress %",
                val: `${metrics.progressPercent}%`,
                color: "border-blue-100 text-blue-700 bg-white",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${card.color}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {card.label}
                </span>
                <p className="text-2xl font-black mt-1">{card.val}</p>
              </div>
            ))}
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500">
              <span>Progress Completere Operatională</span>
              <span className="text-sm font-black text-slate-900">
                Progress: {metrics.progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
              <div
                className={`h-3 transition-all duration-500 ease-out ${getProgressBarColor(metrics.progressPercent)}`}
                style={{ width: `${metrics.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search instructions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-700 font-semibold"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center justify-end">
              {[
                { id: "ALL", label: "ALL", count: counters.all },
                { id: "OPEN", label: "OPEN", count: counters.open },
                { id: "COMPLETED", label: "COMPLETED", count: counters.comp },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTaskFilter(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold tracking-wider transition ${
                    taskFilter === btn.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {btn.label} ({btn.count})
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
              <span>
                MANUFACTURING PREVENTIVE CHECKS / INSTRUCȚIUNI TEHNOLOGICE
              </span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium italic">
                  Nu există operațiuni conform filtrelor active.
                </div>
              ) : (
                filteredTasks.map((task, index) => {
                  const isCompleted = task.is_completed;
                  const isReadOnly =
                    workOrder.status === "COMPLETED" || submitting;

                  return (
                    <div
                      key={task.id}
                      onClick={() =>
                        !isReadOnly && handleToggleTask(task.id, isCompleted)
                      }
                      className={`p-4 flex items-start space-x-4 select-none transition ${
                        isReadOnly
                          ? "cursor-not-allowed"
                          : "cursor-pointer hover:bg-slate-50/60"
                      } ${isCompleted ? "bg-slate-50/40" : ""}`}
                    >
                      <div className="mt-0.5 shrink-0 transition-transform active:scale-95">
                        {isCompleted ? (
                          <CheckSquare className="w-5 h-5 text-slate-900 fill-slate-50" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <p
                          className={`text-sm font-bold text-slate-800 transition ${isCompleted ? "line-through text-slate-400" : ""}`}
                        >
                          {task.task_name}
                        </p>
                        <p
                          className={`text-xs font-semibold text-slate-400 transition ${isCompleted ? "line-through text-slate-300" : "text-slate-500"}`}
                        >
                          {task.task_name_ro || task.task_name}
                        </p>
                      </div>

                      <div className="text-[10px] font-bold text-slate-300">
                        #{String(index + 1).padStart(2, "0")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-slate-400" /> Observații
                Execuție Teren / Closing Report
              </h3>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">
                    Completed By / Operator Tehnician:
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    disabled={workOrder.status === "COMPLETED"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">
                    Completion Comments / Note Mentenanță:
                  </label>
                  <textarea
                    rows={2}
                    value={completionComments}
                    onChange={(e) => setCompletionComments(e.target.value)}
                    disabled={workOrder.status === "COMPLETED"}
                    placeholder="Detalii suplimentare..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">
                    Follow-Up Findings / Note:
                  </label>
                  <input
                    type="text"
                    value={followUpFindings}
                    onChange={(e) => setFollowUpFindings(e.target.value)}
                    disabled={workOrder.status === "COMPLETED"}
                    placeholder="Piese sau acțiuni secundare..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {workOrder.status !== "COMPLETED" && (
              <div className="bg-slate-900 p-5 rounded-xl text-white flex flex-col justify-between space-y-4 shadow-md border border-slate-800">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Finalizare Ordin Preventiv
                  </h4>
                  <p className="text-xs text-slate-300 font-medium">
                    Prin încheierea acestui Work Order, confirmați că toate
                    operațiunile de mentenanță preventivă au fost verificate pe
                    teren conform normelor tehnice interne.
                  </p>
                </div>
                <button
                  onClick={handleCompleteWorkOrder}
                  disabled={submitting || metrics.completed !== metrics.total}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs font-extrabold uppercase tracking-wider disabled:opacity-40"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>Complete Work Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
