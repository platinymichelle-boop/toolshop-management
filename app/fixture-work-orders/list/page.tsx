"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Layers,
  Calendar,
  User,
  ArrowLeft,
  Plus,
} from "lucide-react";

interface FixtureData {
  fixture_name: string;
  machine: string;
}

interface FixtureWorkOrder {
  id: string;
  wo_number: string;
  fixture_id: string;
  status: "OPEN" | "IN PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  created_by: string;
  created_at: string;
  scheduled_date: string | null;
  source: string | null;
  actions_count: number;
  completed_actions_count?: number;
  fixtures: FixtureData | null; // Pentru Join-ul din Supabase
}

export default function FixtureWorkOrdersList() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<FixtureWorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State-uri pentru Filtrare și Căutare
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // State pentru Sortare
  const [sortField, setSortField] = useState<
    keyof FixtureWorkOrder | "fixture_name" | "machine"
  >("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extragerea ordinelor împreună cu detaliile din tabela fixtures asociată
      const { data, error: fetchErr } = await supabase
        .from("fixture_work_orders")
        .select(
          `
          *,
          fixtures (
            fixture_name,
            machine
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setWorkOrders((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching fixture work orders:", err);
      setError(err.message || "A apărut o eroare la încărcarea datelor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);
  const handleSort = (
    field: keyof FixtureWorkOrder | "fixture_name" | "machine",
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Calculul metricilor globale din KPI pe baza întregului set de date
  const kpis = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter((wo) => wo.status === "OPEN").length;
    const inProgress = workOrders.filter(
      (wo) => wo.status === "IN PROGRESS",
    ).length;
    const completed = workOrders.filter(
      (wo) => wo.status === "COMPLETED",
    ).length;

    const critical = workOrders.filter(
      (wo) =>
        (wo.priority === "CRITICAL" || wo.priority === "HIGH") &&
        wo.status !== "COMPLETED",
    ).length;

    return { total, open, inProgress, completed, critical };
  }, [workOrders]);

  // Logica de filtrare locală (Identică cu pagina originală)
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const matchStatus = statusFilter === "ALL" || wo.status === statusFilter;
      const matchPriority =
        priorityFilter === "ALL" || wo.priority === priorityFilter;

      const fName = wo.fixtures?.fixture_name?.toLowerCase() || "";
      const fMachine = wo.fixtures?.machine?.toLowerCase() || "";
      const woNum = wo.wo_number?.toLowerCase() || "";
      const creator = wo.created_by?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();

      const matchSearch =
        woNum.includes(search) ||
        fName.includes(search) ||
        fMachine.includes(search) ||
        creator.includes(search);

      return matchStatus && matchPriority && matchSearch;
    });
  }, [workOrders, statusFilter, priorityFilter, searchTerm]);
  // Logica de sortare locală bazată pe câmpul selectat (inclusiv câmpurile din Join)
  const sortedWorkOrders = useMemo(() => {
    const sorted = [...filteredWorkOrders];
    sorted.sort((a, b) => {
      let valA: any = a[sortField as keyof FixtureWorkOrder];
      let valB: any = b[sortField as keyof FixtureWorkOrder];

      // Sortare specială pentru obiectele imbricate din tabela fixtures
      if (sortField === "fixture_name") {
        valA = a.fixtures?.fixture_name || "";
        valB = b.fixtures?.fixture_name || "";
      } else if (sortField === "machine") {
        valA = a.fixtures?.machine || "";
        valB = b.fixtures?.machine || "";
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [filteredWorkOrders, sortField, sortDirection]);

  // Mapare stiluri și culori pentru Badge-urile de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "IN PROGRESS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Mapare stiluri și culori pentru Badge-urile de Prioritate
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 font-extrabold border-rose-300 animate-pulse";
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MEDIUM":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "LOW":
        return "bg-slate-50 text-slate-500 border-slate-100";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Header-ul principal al paginii */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Fixture Work Orders
          </h1>
          <p className="text-slate-500 mt-1">
            Gestionarea și urmărirea ordinelor de lucru pentru dispozitive și
            matrite.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchWorkOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
          <Link
            href="/fixture-work-orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Secțiunea superioară cu KPI-urile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total WOs",
            val: kpis.total,
            icon: <Layers className="w-5 h-5" />,
            color: "bg-slate-100 text-slate-600",
          },
          {
            label: "Open WOs",
            val: kpis.open,
            icon: <Clock className="w-5 h-5" />,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "In Progress",
            val: kpis.inProgress,
            icon: <Wrench className="w-5 h-5" />,
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Completed",
            val: kpis.completed,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Critical/High",
            val: kpis.critical,
            icon: <AlertCircle className="w-5 h-5" />,
            color: "bg-rose-50 text-rose-600",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3"
          >
            <div className={`p-2.5 rounded-lg ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {item.label}
              </p>
              {loading ? (
                <div className="h-6 bg-slate-200 rounded animate-pulse w-12 mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{item.val}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Zona de Filtre, Căutare și Input-uri */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search number, fixture, machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white text-slate-700"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>
      {/* Începutul Tabelului Principal de Afișare Date */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-400 select-none">
                {[
                  { id: "wo_number", label: "WO Number" },
                  { id: "fixture_name", label: "Fixture Name" },
                  { id: "machine", label: "Machine" },
                  { id: "status", label: "Status" },
                  { id: "priority", label: "Priority" },
                  { id: "created_by", label: "Created By" },
                  { id: "scheduled_date", label: "Scheduled Date" },
                ].map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id as any)}
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {sortField === col.id &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-16" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-28" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="p-4">
                      <div className="h-5 bg-slate-200 rounded-full w-14" />
                    </td>
                    <td className="p-4">
                      <div className="h-5 bg-slate-200 rounded-full w-14" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-20" />
                    </td>
                  </tr>
                ))
              ) : sortedWorkOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    Nu s-au găsit ordine de lucru conforme criteriilor
                    selectate.
                  </td>
                </tr>
              ) : (
                sortedWorkOrders.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      router.push(`/fixture-work-orders/${row.id}`)
                    }
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    <td className="p-4 font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {row.wo_number}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {row.fixtures?.fixture_name || (
                        <span className="text-slate-300 italic font-normal">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {row.fixtures?.machine || (
                        <span className="text-slate-300 italic font-normal">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${getPriorityBadge(row.priority)}`}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-600 flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{row.created_by}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {row.scheduled_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {new Date(row.scheduled_date).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Ad-Hoc
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer info-tabel pentru scannabilitatea volumului de elemente */}
        {!loading && sortedWorkOrders.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div>
              Showing{" "}
              <span className="font-bold text-slate-600">
                {sortedWorkOrders.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-600">
                {workOrders.length}
              </span>{" "}
              registered orders.
            </div>
            {searchTerm ||
            statusFilter !== "ALL" ||
            priorityFilter !== "ALL" ? (
              <div className="text-blue-600 font-semibold">
                Active filters are narrowing results.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
