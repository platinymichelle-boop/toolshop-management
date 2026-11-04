"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  User,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface FollowUpAction {
  id: number;
  wo_id: number | null;
  tool_number: string;
  equipment_node_id: string | null;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | string;
  status: "OPEN" | "COMPLETED" | string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  work_orders?: {
    wo_number: string;
  } | null;
  fixture_work_order_id?: string | null;
  fixture_work_order_number?: string | null;
}

type StatusFilter = "ALL" | "OPEN" | "COMPLETED";
type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

export default function FollowUpDashboardPage() {
  // REPARAT: Schimbat din <FollowUp> în <FollowUp>
  const [actions, setActions] = useState<FollowUpAction[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  // Stări pentru filtrare și căutare
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");

  useEffect(() => {
    fetchFollowUpActions();
  }, []);

  async function fetchFollowUpActions() {
    try {
      setIsLoading(true);
      // Preluăm acțiunile împreună cu numărul comenzii de lucru de origine prin relație nativă
      const { data, error } = await supabase
        .from("follow_up_actions")
        .select(
          `
          *,
          work_orders (
            wo_number
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (err: any) {
      alert(err.message || "Eroare la încărcarea acțiunilor de Follow-Up");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleActionStatus(actionId: number, currentStatus: string) {
    try {
      setIsUpdating(actionId);
      const nextStatus = currentStatus === "OPEN" ? "COMPLETED" : "OPEN";
      const timestamp =
        nextStatus === "COMPLETED" ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("follow_up_actions")
        .update({
          status: nextStatus,
          completed_at: timestamp,
        })
        .eq("id", actionId);

      if (error) throw error;

      // Corecție: Tipizare explicită pentru argumentul 'act' din map
      setActions(
        actions.map((act: FollowUpAction) =>
          act.id === actionId
            ? { ...act, status: nextStatus, completed_at: timestamp }
            : act,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Nu s-a putut schimba statusul acțiunii");
    } finally {
      setIsUpdating(null);
    }
  }

  async function convertToRepairWorkOrder(action: FollowUpAction) {
    // Placeholder funcțional pentru Pasul Următor (Generare automată de Comandă de Reparație)
    alert(
      `Funcționalitate gata de legare: Conversie acțiune #${action.id} în Comandă de Reparații Corective pentru matrița/utilajul ${action.tool_number}`,
    );
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
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

  // Corecție: Tipizare explicită pentru argumentul 'action' din filter
  const filteredActions = actions.filter((action: FollowUpAction) => {
    if (statusFilter !== "ALL" && action.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && action.priority !== priorityFilter)
      return false;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        action.title.toLowerCase().includes(query) ||
        (action.description || "").toLowerCase().includes(query) ||
        action.tool_number.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            <span>PM Follow-Up Actions Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500">
            Monitor and manage preventive actions
          </p>
        </div>
        <button
          onClick={fetchFollowUpActions}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 shadow-sm"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh dates</span>
        </button>
      </div>
      {/* FILTRE ȘI CĂUTARE */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tool, title, defect..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:outline-none focus:border-amber-500 font-medium placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Status: Toate</option>
            <option value="OPEN">Status: Deschise (OPEN)</option>
            <option value="COMPLETED">Status: Rezolvate (COMPLETED)</option>
          </select>
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as PriorityFilter)
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Prioritate: Toate</option>
            <option value="HIGH">🔴 Urgență Mare</option>
            <option value="MEDIUM">🟡 Medie</option>
            <option value="LOW">🟢 Mică</option>
          </select>
        </div>
      </div>

      {/* DETALII RAPIDE CONTEXTUALE */}
      {isLoading ? (
        <div className="text-center p-12 text-slate-500 font-medium">
          Se încarcă acțiunile corective...
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium italic">
          Nu s-au găsit acțiuni de Follow-Up care să corespundă filtrelor
          selectate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Corecție: Tipizare explicită pentru argumentul 'action' din map */}
          {filteredActions.map((action: FollowUpAction) => (
            <div
              key={action.id}
              className={`bg-white border rounded-xl p-5 shadow-sm transition-all duration-150 hover:shadow-md border-slate-200 ${
                action.status === "COMPLETED" ? "bg-slate-50/50 opacity-75" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase bg-slate-900 text-white tracking-wide">
                      Tool: {action.tool_number}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded uppercase ${getPriorityStyle(action.priority)}`}
                    >
                      {action.priority}
                    </span>
                    {action.fixture_work_order_id && (
                      <Link
                        href={`/fixture-work-orders/${action.fixture_work_order_id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Origin: {action.fixture_work_order_number}
                      </Link>
                    )}

                    {!action.fixture_work_order_id && action.work_orders && (
                      <Link
                        href={`/work-orders/${action.wo_id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Origin: {action.work_orders.wo_number}
                      </Link>
                    )}
                  </div>

                  <h3
                    className={`text-base font-bold ${action.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-800"}`}
                  >
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                    {action.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Reported by :{" "}
                      <strong className="text-slate-600">
                        {action.created_by}
                      </strong>
                    </span>
                    <span>
                      Dată:{" "}
                      {new Date(action.created_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                </div>

                {/* ZONE DE CONTROL ȘI DECIZIE */}
                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto pt-2 sm:pt-0 self-stretch justify-end">
                  <button
                    onClick={() => toggleActionStatus(action.id, action.status)}
                    disabled={isUpdating === action.id}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                      action.status === "COMPLETED"
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${action.status === "COMPLETED" ? "text-green-600" : "text-slate-300"}`}
                    />
                    <span>
                      {action.status === "COMPLETED"
                        ? "Rezolvat"
                        : "Mark as DONE"}
                    </span>
                  </button>

                  {action.status === "OPEN" && (
                    <button
                      onClick={() => convertToRepairWorkOrder(action)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                    >
                      <span>Repair (Create WO)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
