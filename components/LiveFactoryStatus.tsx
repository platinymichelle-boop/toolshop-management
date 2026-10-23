"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Tv,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Cpu,
  Boxes,
  Wrench,
  Gauge,
  Search,
  WifiOff,
} from "lucide-react";

interface Tool {
  id: string | number;
  tool_number: string;
}

interface Breakdown {
  id: string | number;
  press_number: string;
  status: string;
}

interface ToolStatus extends Tool {
  hasBreakdown: boolean;
  hasPM: boolean;
}

export default function LiveFactoryStatus() {
  const router = useRouter();

  const [toolsStatus, setToolsStatus] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isTvMode, setIsTvMode] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "RUNNING" | "BREAKDOWN" | "PM"
  >("ALL");

  const normalizeName = (name: string | null | undefined): string => {
    if (!name) return "";
    return name
      .toUpperCase()
      .replace(/PRESA|PRS|[-\s]/g, "")
      .trim();
  };
  const fetchFactoryStatus = async () => {
    try {
      setHasError(false);

      // 1. Inițializăm data curentă la miezul nopții pentru compararea corectă a termenelor limită
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Declanșăm interogările în paralel către Supabase
      const [
        { data: toolsData, error: toolsError },
        { data: breakdownsData, error: breakdownsError },
        { data: pmTasksData, error: pmTasksError },
        { data: workOrdersData, error: workOrdersError },
      ] = await Promise.all([
        supabase.from("tools").select("id, tool_number"),
        supabase.from("breakdowns").select("id, press_number, status"),
        supabase.from("pm_tasks").select("tool_number, next_due_at, status"),
        supabase.from("work_orders").select("tool_number, status"),
      ]);

      // Verificarea centralizată a erorilor din baza de date
      if (toolsError) throw toolsError;
      if (breakdownsError) throw breakdownsError;
      if (pmTasksError) throw pmTasksError;
      if (workOrdersError) throw workOrdersError;

      // 3. Mapare Set pentru utilajele aflate în BREAKDOWN (Prioritate Maximă)
      const activeBreakdownPressNumbers = new Set(
        (breakdownsData || [])
          .filter((b: Breakdown) => b.status === "Running")
          .map((b: Breakdown) => normalizeName(b.press_number))
          .filter((num) => num !== ""),
      );

      // 4. Mapare Set pentru PM-uri active din tabela `pm_tasks` pe baza regulilor noi (OVERDUE sau Expired)
      const activePmTasksNumbers = new Set(
        (pmTasksData || [])
          .filter((task) => {
            if (!task.tool_number) return false;

            // Normalizare status task din pm_tasks
            const normalizedTaskStatus = task.status?.toUpperCase().trim();

            // LOGICA NOUĂ: PM activ doar dacă statusul este explicit OVERDUE
            const isStatusOverdue = normalizedTaskStatus === "OVERDUE";

            // Verificare dacă data next_due_at este scadentă (<= Astăzi)
            let isDueDatePassed = false;
            if (task.next_due_at) {
              const dueDate = new Date(task.next_due_at);
              dueDate.setHours(0, 0, 0, 0);
              isDueDatePassed = dueDate <= today;
            }

            // Task-urile cu status='OPEN' și data în viitor vor returna false aici și vor fi ignorate automat
            return isStatusOverdue || isDueDatePassed;
          })
          .map((task) => normalizeName(task.tool_number)),
      );

      // 5. Mapare Set pentru PM-uri din `work_orders` (Planificate, În Curs sau Deschise)
      const validPmWorkOrderStatuses = ["OPEN", "IN PROGRESS", "PLANNED"];
      const activeWorkOrdersNumbers = new Set(
        (workOrdersData || [])
          .filter((wo) => {
            if (!wo.tool_number) return false;
            const normalizedWoStatus = wo.status?.toUpperCase().trim();
            return validPmWorkOrderStatuses.includes(normalizedWoStatus);
          })
          .map((wo) => normalizeName(wo.tool_number)),
      );

      // 6. Construirea matricei finale stării fabricii bazată pe priorități și date reale
      const mappedStatus: ToolStatus[] = (toolsData || []).map((tool: Tool) => {
        const normalizedToolNum = normalizeName(tool.tool_number);

        // A. Inspectăm mai întâi starea de Breakdown (Prioritate absolută)
        const hasBreakdown = activeBreakdownPressNumbers.has(normalizedToolNum);

        // B. Inspectăm starea de PM real (Doar dacă utilajul NU are un breakdown activ)
        const hasPM =
          !hasBreakdown &&
          (activePmTasksNumbers.has(normalizedToolNum) ||
            activeWorkOrdersNumbers.has(normalizedToolNum));

        return {
          ...tool,
          hasBreakdown,
          hasPM,
        };
      });

      setToolsStatus(mappedStatus);

      const now = new Date();
      setLastRefresh(now.toLocaleTimeString("ro-RO", { hour12: false }));
    } catch (error: any) {
      console.error("Error fetching factory status:", {
        message: error?.message || error,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchFactoryStatus();

    const dataInterval = setInterval(() => {
      fetchFactoryStatus();
    }, 30000);

    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ro-RO", { hour12: false }));
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    return () => clearInterval(clockInterval);
  }, []);
  const stats = useMemo(() => {
    const totalMachines = toolsStatus.length;
    const totalBreakdown = toolsStatus.filter((t) => t.hasBreakdown).length;
    const totalPM = toolsStatus.filter((t) => t.hasPM).length;
    const totalRunning = totalMachines - totalBreakdown - totalPM;

    return { totalMachines, totalBreakdown, totalPM, totalRunning };
  }, [toolsStatus]);

  const filteredTools = useMemo(() => {
    return toolsStatus.filter((tool) => {
      const matchesSearch =
        tool.tool_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.id.toString().includes(searchTerm);

      if (!matchesSearch) return false;
      if (activeFilter === "RUNNING") return !tool.hasBreakdown && !tool.hasPM;
      if (activeFilter === "BREAKDOWN") return tool.hasBreakdown;
      if (activeFilter === "PM") return tool.hasPM;
      return true;
    });
  }, [toolsStatus, searchTerm, activeFilter]);

  const handleToolClick = (hasBreakdown: boolean) => {
    if (hasBreakdown) {
      router.push("/breakdown");
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 font-mono text-slate-200 p-4 transition-all duration-500 ease-in-out antialiased selection:bg-cyan-500/30
        ${isTvMode ? "fixed inset-0 z-50 overflow-y-auto p-6 bg-slate-950 scale-100 text-base" : "text-sm"}
        ${isMounted ? "opacity-100" : "opacity-0"}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)",
      }}
    >
      <div className="w-full mx-auto space-y-4 max-w-[100vw]">
        {hasError && (
          <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-3 rounded-lg flex items-center gap-3 animate-pulse shadow-lg text-xs font-bold">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span>
              EROARE PIPELINE SCADA: Conexiunea cu serverul a eșuat. Se încearcă
              reconectarea...
            </span>
          </div>
        )}

        <header className="relative bg-slate-900/90 border-2 border-slate-800 rounded-lg p-4 shadow-[0_0_25px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500"></div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-center shadow-inner">
                <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h1
                  className={`${isTvMode ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"} font-black tracking-tighter text-slate-100 flex items-center gap-3`}
                >
                  🏭 LIVE FACTORY MONITOR{" "}
                  <span className="text-xs font-semibold px-1 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                    v3.5_SCADA
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                  Manufacturing Execution System Matrix
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                SYS_LIVE
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-4 text-xs bg-slate-950/80 px-4 py-2 rounded-md border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 tracking-widest font-bold text-sm min-w-[70px]">
                    {currentTime || "00:00:00"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-[spin_4s_linear_infinite]" />
                  <span className="text-slate-500">REFRESH:</span>
                  <span className="text-cyan-400 font-semibold">
                    {lastRefresh || "--:--"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTvMode(!isTvMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition-all duration-200 border shadow-md ${isTvMode ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"}`}
              >
                <Tv className="w-4 h-4" />
                {isTvMode ? "Exit TV Mode" : "TV Mode"}
              </button>
            </div>
          </div>
        </header>

        <section className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Caută utilaj sau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-9 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeFilter === "ALL" ? "bg-slate-800 border border-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
            >
              TOATE ({stats.totalMachines})
            </button>
            <button
              onClick={() => setActiveFilter("RUNNING")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeFilter === "RUNNING" ? "bg-emerald-950/60 border border-emerald-800 text-emerald-400" : "text-slate-500 hover:text-emerald-400"}`}
            >
              FUNCTIONEAZĂ ({stats.totalRunning})
            </button>
            <button
              onClick={() => setActiveFilter("BREAKDOWN")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeFilter === "BREAKDOWN" ? "bg-red-950/60 border border-red-800 text-red-400" : "text-slate-500 hover:text-red-400"}`}
            >
              DEFECTE ({stats.totalBreakdown})
            </button>
            <button
              onClick={() => setActiveFilter("PM")}
              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeFilter === "PM" ? "bg-amber-950/60 border border-amber-800 text-amber-400" : "text-slate-500 hover:text-amber-400"}`}
            >
              MENTENANȚĂ ({stats.totalPM})
            </button>
          </div>
        </section>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">
                TOTAL_MACHINES
              </span>
              <span
                className={`${isTvMode ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"} font-black text-slate-100`}
              >
                {stats.totalMachines}
              </span>
            </div>
            <Boxes className="w-8 h-8 text-slate-600" />
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center justify-between shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/[0.02]"></div>
            <div>
              <span className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-bold block">
                🟢 RUNNING_STATUS
              </span>
              <span
                className={`${isTvMode ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"} font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]`}
              >
                {stats.totalRunning}
              </span>
            </div>
            <Activity className="w-8 h-8 text-emerald-600/50" />
          </div>
          <div
            className={`border rounded-lg p-3 flex items-center justify-between shadow-md relative overflow-hidden transition-all duration-300 ${stats.totalBreakdown > 0 ? "bg-red-950/20 border-red-900/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]" : "bg-slate-900/50 border-slate-800"}`}
          >
            {stats.totalBreakdown > 0 && (
              <div className="absolute inset-0 bg-red-500/[0.02] animate-pulse"></div>
            )}
            <div>
              <span
                className={`text-[10px] uppercase tracking-widest font-bold block ${stats.totalBreakdown > 0 ? "text-red-400" : "text-slate-500"}`}
              >
                🔴 BREAKDOWN_ALARM
              </span>
              <span
                className={`text-2xl md:text-3xl font-black ${stats.totalBreakdown > 0 ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse" : "text-slate-400"}`}
              >
                {stats.totalBreakdown}
              </span>
            </div>
            <AlertTriangle
              className={`w-8 h-8 ${stats.totalBreakdown > 0 ? "text-red-500 animate-bounce" : "text-slate-600/50"}`}
            />
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-center justify-between shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/[0.01]"></div>
            <div>
              <span className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold block">
                🟡 PM_ACTIVE_MAINT
              </span>
              <span
                className={`${isTvMode ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"} font-black text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]`}
              >
                {stats.totalPM}
              </span>
            </div>
            <Wrench className="w-8 h-8 text-amber-600/50" />
          </div>
        </section>

        <main className="relative min-h-[50vh]">
          {loading && toolsStatus.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/20 backdrop-blur-sm">
              <Gauge className="w-10 h-10 text-cyan-500 animate-spin mb-3" />
              <div className="text-sm font-bold tracking-widest text-slate-400 animate-pulse">
                INITIALIZING CORE SCADA MATRIX...
              </div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="w-full text-center py-16 border-2 border-dashed border-slate-900 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-xs">
              Niciun utilaj nu corespunde filtrelor selectate
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredTools.map((tool) => {
                let statusClass =
                  "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]";
                let statusBadge = (
                  <span className="text-[10px] bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-black">
                    🟢 RUNNING
                  </span>
                );

                if (tool.hasBreakdown) {
                  statusClass =
                    "border-red-900/80 bg-red-950/20 text-red-200 cursor-pointer animate-[pulse_2.5s_infinite_ease-in-out] hover:border-red-500 hover:bg-red-950/40 shadow-[inset_0_1px_2px_rgba(239,68,68,0.1)]";
                  statusBadge = (
                    <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800 font-black tracking-tight animate-pulse">
                      🔴 CRIT_FAIL
                    </span>
                  );
                } else if (tool.hasPM) {
                  statusClass =
                    "border-amber-900/60 bg-amber-950/10 text-amber-200 hover:border-amber-500 shadow-[inset_0_1px_1px_rgba(245,158,11,0.05)]";
                  statusBadge = (
                    <span className="text-[10px] bg-amber-950/80 text-amber-400 px-2 py-0.5 rounded border border-amber-800 font-black">
                      🟡 PM_ACTV
                    </span>
                  );
                }

                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToolClick(tool.hasBreakdown)}
                    className={`group p-4 rounded-lg border flex flex-col justify-between h-32 transform transition-all duration-200 select-none hover:scale-[1.03] ${statusClass}`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-500 font-bold px-1 rounded">
                          M_ID
                        </span>
                        <span className="font-black text-slate-100 tracking-tight text-sm">
                          #{tool.id}
                        </span>
                      </div>
                      {statusBadge}
                    </div>
                    <div className="my-auto flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        Device address
                      </span>
                      <span
                        className={`${isTvMode ? "text-xl" : "text-lg"} font-black tracking-tighter text-slate-200 truncate group-hover:text-cyan-400`}
                      >
                        {tool.tool_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mt-2 pt-1 border-t border-slate-800/40">
                      <span>PLC_STAT: OK</span>
                      {tool.hasBreakdown ? (
                        <span className="text-red-400 underline animate-pulse">
                          CLICK TO INSPECT
                        </span>
                      ) : (
                        <span>SYS_SECURE</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <footer className="bg-slate-900 border-2 border-slate-800 rounded-lg p-3 text-xs shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold tracking-wider text-slate-400 uppercase text-[11px]">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
              SCADA CORE INTEGRATION MAP:
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Repairs Engine</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Preventive Maint.</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Breakdown Tracker</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Analytics Core</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
