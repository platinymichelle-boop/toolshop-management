"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  CalendarDays,
  CheckSquare,
  Eye,
  Layers,
  Hourglass,
  X,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface PMTask {
  id: string;
  tool_number: string;
  equipment: string;
  sub_equipment: string;
  action: string;
  frequency: string;
  technician: string;
  status: "OPEN" | "DUE_SOON" | "OVERDUE" | "COMPLETED";
  last_completed_at: string | null;
  next_due_at: string | null;
  part_reference: string | null;
  estimated_minutes: number | null;
  created_at?: string;
}

// Interfață nouă pentru citirea tehnicienilor din tabelă
interface Technician {
  id: string;
  name: string;
}

const calculateStatus = (nextDueAt: string | null): PMTask["status"] => {
  if (!nextDueAt) return "OPEN";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueData = new Date(nextDueAt);
  dueData.setHours(0, 0, 0, 0);

  if (dueData < today) return "OVERDUE";
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);
  sevenDaysFromNow.setHours(23, 59, 59, 999);

  if (dueData <= sevenDaysFromNow) return "DUE_SOON";
  return "OPEN";
};

const calculateNextDueDate = (frequencyCode: string): string => {
  const code = String(frequencyCode || "")
    .trim()
    .toUpperCase();
  const value = parseInt(code.replace(/[^0-9]/g, ""), 10) || 1;
  const unit = code.replace(/[0-9]/g, "");
  const nextDate = new Date();

  switch (unit) {
    case "Z":
      nextDate.setDate(nextDate.getDate() + value);
      break;
    case "S":
      nextDate.setDate(nextDate.getDate() + value * 7);
      break;
    case "L":
      nextDate.setMonth(nextDate.getMonth() + value);
      break;
    case "A":
      nextDate.setFullYear(nextDate.getFullYear() + value);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  return nextDate.toISOString().split("T")[0];
};

export default function PreventiveMaintenanceDashboard() {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<PMTask | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortColumn, setSortColumn] = useState<keyof PMTask>("tool_number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STĂRI NOI PENTRU OPTIUNEA COMPLETE PM MODAL ---
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isCompleteModalOpen, setIsCompleteModalOpen] =
    useState<boolean>(false);
  const [taskToComplete, setTaskToComplete] = useState<PMTask | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [modalError, setModalError] = useState<string>("");
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from("pm_tasks")
        .select("*");
      if (supabaseError) throw supabaseError;

      const processedTasks = (data || []).map((task: any) => {
        const currentStatus =
          task.status === "COMPLETED"
            ? "COMPLETED"
            : calculateStatus(task.next_due_at);
        return { ...task, status: currentStatus };
      });
      setTasks(processedTasks);

      // Populare dropdown din tabela technicians ordonați alfabetic
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("id, name")
        .order("name", { ascending: true });

      if (!techError && techData) {
        setTechnicians(techData);
      }
    } catch (err: any) {
      setError(err.message || "A apărut o eroare la preluarea datelor.");
    } finally {
      setLoading(false);
    }
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: historyData } = await supabase
      .from("pm_history")
      .select("created_at");

    const completedCount =
      historyData?.filter((item) => item.created_at?.startsWith(currentMonth))
        .length || 0;

    setCompletedThisMonth(completedCount);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Handler nou care deschide modalul în loc să execute direct
  const handleOpenCompleteModal = (task: PMTask) => {
    setTaskToComplete(task);
    setSelectedTechId("");
    setRemarks("");
    setModalError("");
    setIsCompleteModalOpen(true);
  };

  // Logica de salvare din interiorul modalului cu validările cerute
  const handleCompleteTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToComplete) return;

    // Cerința 8: Verificare dacă tehnicianul este selectat
    if (!selectedTechId) {
      setModalError(
        "Please select the technician who performed the maintenance.",
      );
      return;
    }

    setActionLoadingId(taskToComplete.id);
    setModalError("");
    const todayStr = new Date().toISOString().split("T")[0];
    const nextDueStr = calculateNextDueDate(taskToComplete.frequency);
    const updatedStatus = calculateStatus(nextDueStr);

    const activeTech = technicians.find(
      (t) => String(t.id) === String(selectedTechId),
    );
    const technicianName = activeTech ? activeTech.name : "";

    try {
      // Cerința 4 & 5: Salvare completă și auditare în tabela pm_history
      const { error: historyErr } = await supabase.from("pm_history").insert({
        pm_task_id: taskToComplete.id,
        tool_number: taskToComplete.tool_number,
        equipment: taskToComplete.equipment,
        sub_equipment: taskToComplete.sub_equipment,
        action: taskToComplete.action,
        technician_id: selectedTechId,
        technician_name: technicianName,
        completed_by: technicianName, // Se păstrează compatibilitatea cu versiunile vechi
        completed_at: todayStr,
        result: "COMPLETED",
        remarks: remarks.trim() || null,
      });

      if (historyErr) throw historyErr;

      // Actualizare stare în tabelul principal de sarcini active
      const { error: updateErr } = await supabase
        .from("pm_tasks")
        .update({
          last_completed_at: todayStr,
          next_due_at: nextDueStr,
          status: updatedStatus,
        })
        .eq("id", taskToComplete.id);
      if (updateErr) throw updateErr;

      setIsCompleteModalOpen(false);
      setTaskToComplete(null);
      await fetchTasks();
    } catch (err: any) {
      setModalError(
        err.message || "Eroare la salvarea finalizării mentenanței.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        let importedCount = 0;
        let skippedCount = 0;
        const tasksToInsert: any[] = [];

        const { data: existingTasks, error: fetchErr } = await supabase
          .from("pm_tasks")
          .select("tool_number, equipment, sub_equipment, action");
        if (fetchErr) throw fetchErr;

        const existingSet = new Set(
          (existingTasks || []).map(
            (t) =>
              `${String(t.tool_number || "")
                .trim()
                .toLowerCase()}|${String(t.equipment || "")
                .trim()
                .toLowerCase()}|${String(t.sub_equipment || "")
                .trim()
                .toLowerCase()}|${String(t.action || "")
                .trim()
                .toLowerCase()}`,
          ),
        );

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: "",
          });

          let isFirstRow = true;
          for (const row of rows) {
            if (isFirstRow) {
              isFirstRow = false;
              continue;
            }
            if (!row || row.length === 0) continue;

            const cleanValue = (val: any): string => {
              if (val === undefined || val === null) return "";
              const str = String(val).trim();
              return str === "-" ? "" : str;
            };

            const workcenter = cleanValue(row[0]);
          }
        }
      } catch (err: any) {
        setError(err.message || "Eroare la importul fișierului.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- LOGICĂ INTERFAȚĂ FILTRARE / SORTARE ---
  const handleSort = (column: keyof PMTask) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.tool_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.sub_equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.action.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL" || task.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortColumn] || "";
        const valB = b[sortColumn] || "";
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [tasks, searchTerm, statusFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter((t) => t.status === "OVERDUE").length;
    const dueSoon = tasks.filter((t) => t.status === "DUE_SOON").length;
    return { total, overdue, dueSoon };
  }, [tasks]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Preventive Maintenance
          </h1>
          <p className="text-slate-500 mt-1">
            Monitorizarea și gestionarea mentenanței preventive utilaje.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grid Status Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total PM Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.overdue}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Due Soon Tasks</p>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.dueSoon}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Completed This Month
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {completedThisMonth}
            </p>
          </div>
        </div>
      </div>
      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by tool, equipment, sub-equipment or action..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {["ALL", "OPEN", "DUE_SOON", "OVERDUE", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                {[
                  { label: "Tool No.", key: "tool_number" },
                  { label: "Equipment", key: "equipment" },
                  { label: "Sub Equipment", key: "sub_equipment" },
                  { label: "Action Description", key: "action" },
                  { label: "Freq", key: "frequency" },
                  { label: "Status", key: "status" },
                  { label: "Next Due", key: "next_due_at" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof PMTask)}
                    className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading preventive tasks...
                  </td>
                </tr>
              ) : paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching tasks found.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="p-4 font-mono font-medium text-xs whitespace-nowrap">
                      {task.tool_number}
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      {task.equipment}
                    </td>
                    <td className="p-4 text-slate-600">
                      {task.sub_equipment || "-"}
                    </td>
                    <td className="p-4 max-w-xs truncate" title={task.action}>
                      {task.action}
                    </td>
                    <td className="p-4 font-semibold text-xs text-slate-500">
                      {task.frequency}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          task.status === "OVERDUE"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : task.status === "DUE_SOON"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : task.status === "COMPLETED"
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}
                      >
                        {task.status === "OVERDUE" && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {task.status === "DUE_SOON" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {task.status === "COMPLETED" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium text-xs">
                      {task.next_due_at
                        ? new Date(task.next_due_at).toLocaleDateString("ro-RO")
                        : "-"}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenCompleteModal(task)}
                        disabled={actionLoadingId === task.id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                      >
                        Complete PM
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Section */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-semibold">{paginatedTasks.length}</span> of{" "}
            <span className="font-semibold">{filteredTasks.length}</span> items
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 border rounded-lg bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="p-2 border rounded-lg bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Existing View Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" /> PM Task
                Specifications
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p>
                <strong>Tool Number:</strong> {selectedTask.tool_number}
              </p>
              <p>
                <strong>Equipment:</strong> {selectedTask.equipment}
              </p>
              <p>
                <strong>Sub Equipment:</strong>{" "}
                {selectedTask.sub_equipment || "-"}
              </p>
              <p>
                <strong>Action required:</strong> {selectedTask.action}
              </p>
              <p>
                <strong>Frequency:</strong> {selectedTask.frequency}
              </p>
              <p>
                <strong>Part Reference:</strong>{" "}
                {selectedTask.part_reference || "-"}
              </p>
              <p>
                <strong>Est. Minutes:</strong>{" "}
                {selectedTask.estimated_minutes || "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- NOUL MODAL DE DETALII CLOSING & AUDIT (COMPLETE PM) --- */}
      {isCompleteModalOpen && taskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Execution Details & Close PM</span>
              </div>
              <button
                onClick={() =>
                  !actionLoadingId && setIsCompleteModalOpen(false)
                }
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                disabled={!!actionLoadingId}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCompleteTaskSubmit}
              className="flex-1 flex flex-col"
            >
              <div className="p-6 space-y-4 flex-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-600">
                  <p>
                    <strong>Equipment:</strong> {taskToComplete.equipment} (
                    {taskToComplete.tool_number})
                  </p>
                  <p className="line-clamp-2">
                    <strong>Action:</strong> {taskToComplete.action}
                  </p>
                </div>

                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Technician <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => {
                      setSelectedTechId(e.target.value);
                      if (e.target.value) setModalError("");
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    disabled={!!actionLoadingId}
                  >
                    <option value="">-- Select Technician --</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Remarks / Comments{" "}
                    <span className="text-slate-400 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Adaugă detalii relevante despre intervenție..."
                    rows={3}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    disabled={!!actionLoadingId}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  disabled={!!actionLoadingId}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!actionLoadingId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  {actionLoadingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Log PM"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
