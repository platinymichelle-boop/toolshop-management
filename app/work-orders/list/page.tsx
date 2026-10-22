"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface WorkOrder {
  id: number;
  created_at: string;
  wo_number: string;
  tool_number: string;
  tool_id?: string;
  scheduled_date: string;
  status: string;
  created_by: string;
  actions_count: number;
}

type FilterStatus = "ALL" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  useEffect(() => {
    async function loadWorkOrders() {
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setWorkOrders(data || []);
      } catch (err: any) {
        alert(err.message || "Failed to load work orders");
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkOrders();
  }, []);

  // Helper funcție pentru stilizarea badge-urilor de status
  const getStatusClass = (status: string) => {
    const normalized = status?.toUpperCase() || "";
    switch (normalized) {
      case "OPEN":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-700";
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Calculare dinamică KPI-uri și numărători filtre direct din starea brută
  const counts = {
    ALL: workOrders.length,
    OPEN: workOrders.filter((wo) => wo.status?.toUpperCase() === "OPEN").length,
    "IN_PROGRESS": workOrders.filter(
      (wo) => wo.status?.toUpperCase() === "IN_PROGRESS",
    ).length,
    COMPLETED: workOrders.filter(
      (wo) => wo.status?.toUpperCase() === "COMPLETED",
    ).length,
    CANCELLED: workOrders.filter(
      (wo) => wo.status?.toUpperCase() === "CANCELLED",
    ).length,
  };

  // Logica de filtrare a ordinelor de lucru
  const filteredWorkOrders =
    statusFilter === "ALL"
      ? workOrders
      : workOrders.filter((wo) => wo.status?.toUpperCase() === statusFilter);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto font-medium text-slate-600 animate-pulse">
        Loading dashboard data...
      </div>
    );
  }
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ANTET RESPONSIVE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Work Orders History
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage and track preventive maintenance schedules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            href="/preventive-maintenance"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <Link
            href="/work-orders"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New WO</span>
          </Link>
        </div>
      </div>

      {/* CARDURI KPI (2 coloane pe mobil, 4 pe desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL CARD */}
        <div className="bg-white p-4 md:p-5 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total WO
            </span>
            <span className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 block">
              {counts.ALL}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 hidden sm:block">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        {/* OPEN CARD */}
        <div className="bg-white p-4 md:p-5 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open
            </span>
            <span className="text-2xl md:text-3xl font-bold text-blue-600 mt-1 block">
              {counts.OPEN}
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-500 hidden sm:block">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* IN_PROGRESS CARD */}
        <div className="bg-white p-4 md:p-5 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              In Progress
            </span>
            <span className="text-2xl md:text-3xl font-bold text-amber-600 mt-1 block">
              {counts["IN_PROGRESS"]}
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-500 hidden sm:block">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        {/* COMPLETED CARD */}
        <div className="bg-white p-4 md:p-5 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <span className="text-2xl md:text-3xl font-bold text-green-600 mt-1 block">
              {counts.COMPLETED}
            </span>
          </div>
          <div className="p-2.5 bg-green-50 rounded-lg text-green-500 hidden sm:block">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BUTOANE FILTRARE DASHBOARD */}
      <div className="flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
        {(
          [
            "ALL",
            "OPEN",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
          ] as FilterStatus[]
        ).map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm border ${
                isActive
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>{status}</span>
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                  isActive
                    ? "bg-blue-700 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTANIER TABEL CU SCROLL INTACT PENTRU MOBIL */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm select-none">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs md:text-sm font-semibold whitespace-nowrap">
              <th className="p-4">WO Number</th>
              <th className="p-4">Tool Number</th>
              <th className="p-4">Scheduled Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions Count</th>
              <th className="p-4">Created By</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs md:text-sm whitespace-nowrap">
            {filteredWorkOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-slate-400 font-medium italic"
                >
                  No work orders found matching the "{statusFilter}" filter.
                </td>
              </tr>
            ) : (
              filteredWorkOrders.map((wo) => (
                <tr
                  key={wo.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4 font-bold text-blue-600">
                    {wo.wo_number}
                  </td>
                  <td className="p-4 font-medium text-slate-800">
                    {wo.tool_number || wo.tool_id}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(wo.scheduled_date).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(wo.status)}`}
                    >
                      {wo.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {wo.actions_count} tasks
                  </td>
                  <td className="p-4 text-slate-600">{wo.created_by}</td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="inline-flex px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
                    >
                      View & Print
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
