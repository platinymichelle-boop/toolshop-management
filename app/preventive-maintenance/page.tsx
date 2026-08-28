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
    } catch (err: any) {
      setError(err.message || "A apărut o eroare la preluarea datelor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async (task: PMTask) => {
    setActionLoadingId(task.id);
    setError(null);
    setImportSummary(null);

    // Corectat: Extrage string-ul cu data în format YYYY-MM-DD în loc de array
    const todayStr = new Date().toISOString().split("T")[0];
    const nextDueStr = calculateNextDueDate(task.frequency);
    const updatedStatus = calculateStatus(nextDueStr);

    try {
      // Inserare în istoricul mentenanței
      const { error: historyErr } = await supabase.from("pm_history").insert({
        task_id: task.id,
        tool_number: task.tool_number,
        equipment: task.equipment,
        sub_equipment: task.sub_equipment,
        action: task.action,
        technician: task.technician,
        completed_at: todayStr,
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
        .eq("id", task.id);
      if (updateErr) throw updateErr;

      // Reîmprospătare listă din interfață
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || "Eroare la salvarea finalizării mentenanței.");
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

        // Preluăm sarcinile existente din baza de date pentru a preveni duplicatele
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

          // Modificare: Citire fișier ca matrice de matrice (pe bază de indecși)
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: "",
          });

          let isFirstRow = true;

          for (const row of rows) {
            // Sărim peste antetul tabelului (primul rând din foaie)
            if (isFirstRow) {
              isFirstRow = false;
              continue;
            }

            // Dacă rândul este complet gol sau nu are suficiente elemente, îl ignorăm
            if (!row || row.length === 0) {
              continue;
            }

            // Helper pentru curățare caractere și spații libere
            const cleanValue = (val: any): string => {
              if (val === undefined || val === null) return "";
              const str = String(val).trim();
              return str === "-" ? "" : str;
            };

            // 4. Citirea coloanelor prin indexul absolut din Excel
            const workcenter = cleanValue(row[0]);
            const equipment = cleanValue(row[1]);
            const sub_equipment = cleanValue(row[2]);
            const action = cleanValue(row[3]);
            const frequency = cleanValue(row[4]) || "1L";
            const maintenance_equipment = cleanValue(row[5]);
            const operation = cleanValue(row[6]);
            const control_method = cleanValue(row[7]);
            const technician = cleanValue(row[8]) || "Echipa Tehnică";
            const estimated_time = cleanValue(row[9]);
            const part_reference = cleanValue(row[10]) || null;

            const tool_number = sheetName.trim();

            // Calculare minute din coloana TIME (index 9)
            const estimated_minutes = estimated_time
              ? parseInt(estimated_time.replace(/[^0-9]/g, ""), 10) || null
              : null;

            // 5. Verificare reguli SKIP înainte de import
            if (!action) {
              skippedCount++;
              continue;
            }

            const lowerAction = action.toLowerCase();
            if (
              lowerAction.includes("supplier instructions") ||
              lowerAction.includes("instructions") ||
              lowerAction.includes("see")
            ) {
              skippedCount++;
              continue;
            }

            // 7. Verificare duplicate (păstrare logică existentSet)
            const lookupKey = `${tool_number.toLowerCase()}|${equipment.toLowerCase()}|${sub_equipment.toLowerCase()}|${action.toLowerCase()}`;
            if (existingSet.has(lookupKey)) {
              skippedCount++;
              continue;
            }

            const nextDueAt = calculateNextDueDate(frequency);
            const initialStatus = calculateStatus(nextDueAt);

            // 6. Inserare în obiectul final cu toate coloanele solicitate din pm_tasks
            tasksToInsert.push({
              tool_number,
              workcenter,
              equipment,
              sub_equipment: sub_equipment || null,
              action,
              frequency,
              maintenance_equipment: maintenance_equipment || null,
              operation: operation || null,
              control_method: control_method || null,
              technician,
              estimated_time: estimated_time || null,
              estimated_minutes,
              part_reference,
              status: initialStatus,
              last_completed_at: null,
              next_due_at: nextDueAt,
            });

            existingSet.add(lookupKey);
            importedCount++;
          }

          // Console logs pentru depanare rapidă în browser
          console.log(
            `[Import] Foaie: ${sheetName} | Total adăugate în buffer: ${tasksToInsert.length}`,
          );
        }

        // Trimitere payload bulk în tabela pm_tasks din Supabase
        if (tasksToInsert.length > 0) {
          const { error: insertErr } = await supabase
            .from("pm_tasks")
            .insert(tasksToInsert);
          if (insertErr) throw insertErr;
        }

        setImportSummary({ imported: importedCount, skipped: skippedCount });
        await fetchTasks();
      } catch (err: any) {
        setError(err.message || "Eroare la procesarea fișierului Excel.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };
  const kpis = useMemo(() => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    return tasks.reduce(
      (acc, task) => {
        acc.total++;
        if (task.status === "OPEN") acc.open++;
        else if (task.status === "DUE_SOON") acc.dueSoon++;
        else if (task.status === "OVERDUE") acc.overdue++;
        if (
          task.last_completed_at &&
          task.last_completed_at.startsWith(currentMonthStr)
        ) {
          acc.completedThisMonth++;
        }
        return acc;
      },
      { total: 0, open: 0, dueSoon: 0, overdue: 0, completedThisMonth: 0 },
    );
  }, [tasks]);

  const handleSort = (column: keyof PMTask) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "ALL" || task.status === statusFilter;
      const searchFields = [
        task.tool_number,
        task.equipment,
        task.sub_equipment,
        task.action,
        task.frequency,
        task.technician,
        task.status,
        task.part_reference,
      ].map((field) => (field || "").toLowerCase());

      const matchesSearch = searchFields.some((field) =>
        field.includes(searchTerm.toLowerCase()),
      );
      return matchesStatus && matchesSearch;
    });
  }, [tasks, searchTerm, statusFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const valA = String(a[sortColumn] || "").toLowerCase();
      const valB = String(b[sortColumn] || "").toLowerCase();
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTasks, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTasks, currentPage]);

  const getStatusStyle = (status: PMTask["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "OVERDUE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "DUE_SOON":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "OPEN":
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Preventive Maintenance Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitorizarea și gestionarea planificărilor de mentenanță
            preventivă.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md shadow-indigo-600/10"
          >
            <Download className="h-3.5 w-3.5 rotate-180" />
            {importing ? "Se importă..." : "📥 Import PM Plan"}
          </button>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-lg text-xs font-bold text-slate-300 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Actualizează
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}
      {importSummary && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Fișierul Excel a fost procesat!</span>
          </div>
          <div className="flex gap-4 text-[11px] uppercase tracking-wider">
            <span>
              Importate:{" "}
              <strong className="text-white bg-emerald-600 px-1.5 py-0.5 rounded">
                {importSummary.imported}
              </strong>
            </span>
            <span>
              Ignorate:{" "}
              <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">
                {importSummary.skipped}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Total PM Tasks
            </span>
            <p className="text-2xl font-black text-white">
              {loading ? "..." : kpis.total}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Open Tasks
            </span>
            <p className="text-2xl font-black text-blue-400">
              {loading ? "..." : kpis.open}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Due Soon
            </span>
            <p className="text-2xl font-black text-amber-400">
              {loading ? "..." : kpis.dueSoon}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Overdue Tasks
            </span>
            <p className="text-2xl font-black text-rose-400">
              {loading ? "..." : kpis.overdue}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Completed Month
            </span>
            <p className="text-2xl font-black text-emerald-400">
              {loading ? "..." : kpis.completedThisMonth}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>
      {/* Control Tabel, Căutare și Filtre */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Căutare text */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Caută în tabel sau piesă..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
              />
            </div>

            {/* Filtru Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Toate Statusurile</option>
              <option value="OPEN">OPEN (Planificate)</option>
              <option value="DUE_SOON">DUE SOON (În 7 zile)</option>
              <option value="OVERDUE">OVERDUE (Restante)</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-slate-400">
            Afișate:{" "}
            {filteredTasks.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}{" "}
            - {Math.min(currentPage * itemsPerPage, filteredTasks.length)} din{" "}
            {filteredTasks.length} înregistrări
          </div>
        </div>

        {/* Tabelul de Date Extins */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 space-y-2">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-500" />
              <span>Se încarcă datele...</span>
            </div>
          ) : !loading && paginatedTasks.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500">
              Nu s-au găsit sarcini de mentenanță preventivă pentru criteriile
              selectate.
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  {(
                    [
                      "tool_number",
                      "equipment",
                      "sub_equipment",
                      "action",
                      "frequency",
                      "technician",
                      "part_reference",
                      "estimated_minutes",
                      "last_completed_at",
                      "next_due_at",
                      "status",
                    ] as Array<keyof PMTask>
                  ).map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-4 py-3 cursor-pointer hover:bg-slate-900/50 hover:text-slate-200 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.replace(/_/g, " ")}</span>
                        {sortColumn === col ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5 text-indigo-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
                          )
                        ) : (
                          <div className="h-3.5 w-3.5 opacity-0" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-medium text-slate-300">
                {paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-950/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                      {task.tool_number}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {task.equipment}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                      {task.sub_equipment || "-"}
                    </td>
                    <td
                      className="px-4 py-3.5 max-w-xs truncate"
                      title={task.action}
                    >
                      {task.action}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400">
                        {task.frequency}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-200 whitespace-nowrap">
                      {task.technician}
                    </td>
                    {/* Noile Coloane Solicitate */}
                    <td className="px-4 py-3.5 text-indigo-400 font-mono whitespace-nowrap">
                      {task.part_reference || "-"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-200">
                      {task.estimated_minutes
                        ? `${task.estimated_minutes} min`
                        : "-"}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                      {formatDate(task.last_completed_at)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-200">
                      {formatDate(task.next_due_at)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-black border tracking-wide ${getStatusStyle(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                          title="Vezi detalii"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCompleteTask(task)}
                          disabled={actionLoadingId !== null}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-lg text-[11px] font-black text-emerald-400 transition-all active:scale-95 disabled:opacity-40"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {actionLoadingId === task.id ? "..." : "Complete PM"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginare Control */}
        {!loading && totalPages > 1 && (
          <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <div className="text-xs font-bold text-slate-400">
              Pagina <span className="text-white">{currentPage}</span> din{" "}
              <span className="text-white">{totalPages}</span>
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              Următor <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Detalii Sarcină Mentenanță
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-500 hover:text-white rounded-lg bg-slate-950 border border-slate-800/80 hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Mașină / Utilaj
                  </span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {selectedTask.tool_number}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Status
                  </span>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getStatusStyle(selectedTask.status)}`}
                    >
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Subansamblu / Echipament
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">
                  {selectedTask.equipment}{" "}
                  <span className="text-slate-500">
                    ({selectedTask.sub_equipment || "-"})
                  </span>
                </p>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Acțiune / Operație Mentenanță
                </span>
                <p className="text-xs text-slate-300 mt-1 bg-slate-950 p-2.5 border border-slate-800/80 rounded-lg leading-relaxed">
                  {selectedTask.action}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Layers className="h-3 w-3 text-indigo-400" /> Piesă de
                    Schimb (Ref)
                  </span>
                  <p className="text-xs font-bold text-indigo-300 font-mono mt-1">
                    {selectedTask.part_reference || "Nu este specificat"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Hourglass className="h-3 w-3 text-amber-400" /> Timp
                    Estimat
                  </span>
                  <p className="text-xs font-black text-white mt-1">
                    {selectedTask.estimated_minutes
                      ? `${selectedTask.estimated_minutes} minute`
                      : "Nespecificat"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3 text-[11px]">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Ultima Finalizare
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    {formatDate(selectedTask.last_completed_at)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Următorul Termen
                  </span>
                  <p className="text-white font-bold mt-0.5">
                    {formatDate(selectedTask.next_due_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
