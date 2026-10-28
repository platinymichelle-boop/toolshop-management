"use client";

import { useEffect, useState, useMemo } from "react";
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

type FilterStatus =
  | "ALL"
  | "OPEN"
  | "IN PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE";

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [weekFilter, setWeekFilter] = useState<string>("THIS_WEEK");

  useEffect(() => {
    async function loadWorkOrders() {
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .order("scheduled_date", { ascending: true });

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

  const isOverdue = (wo: WorkOrder) => {
    if (!wo.scheduled_date || wo.status?.toUpperCase() !== "OPEN") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cleanDate = wo.scheduled_date.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length !== 3) return false;
    const scheduled = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      12,
      0,
      0,
    );

    return scheduled < today;
  };

  const getStatusClass = (wo: WorkOrder) => {
    if (isOverdue(wo)) return "bg-red-100 text-red-700";
    const normalized = wo.status?.toUpperCase() || "";
    switch (normalized) {
      case "OPEN":
        return "bg-blue-100 text-blue-700";
      case "IN PROGRESS":
        return "bg-amber-100 text-amber-700";
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };
  const dateRanges = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const startThis = new Date(today);
    startThis.setDate(today.getDate() + distanceToMonday);
    startThis.setHours(0, 0, 0, 0);
    const endThis = new Date(startThis);
    endThis.setDate(startThis.getDate() + 6);
    endThis.setHours(23, 59, 59, 999);

    const startLast = new Date(startThis);
    startLast.setDate(startThis.getDate() - 7);
    const endLast = new Date(endThis);
    endLast.setDate(endThis.getDate() - 7);

    const startNext = new Date(startThis);
    startNext.setDate(startThis.getDate() + 7);
    const endNext = new Date(endThis);
    endNext.setDate(endThis.getDate() + 7);

    const formatDateStr = (d: Date, includeYear = false) => {
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      return includeYear
        ? `${day} ${month} ${d.getFullYear()}`
        : `${day} ${month}`;
    };

    return {
      LAST_WEEK: {
        start: startLast,
        end: endLast,
        label: `Last Week (${formatDateStr(startLast)} - ${formatDateStr(endLast)})`,
        period: `${formatDateStr(startLast, true)} - ${formatDateStr(endLast, true)}`,
      },
      THIS_WEEK: {
        start: startThis,
        end: endThis,
        label: `This Week (${formatDateStr(startThis)} - ${formatDateStr(endThis)})`,
        period: `${formatDateStr(startThis, true)} - ${formatDateStr(endThis, true)}`,
      },
      NEXT_WEEK: {
        start: startNext,
        end: endNext,
        label: `Next Week (${formatDateStr(startNext)} - ${formatDateStr(endNext)})`,
        period: `${formatDateStr(startNext, true)} - ${formatDateStr(endNext, true)}`,
      },
    };
  }, []);

  const timeFilteredWorkOrders = useMemo(() => {
    const activeRange = dateRanges[weekFilter as keyof typeof dateRanges];
    if (!activeRange) return [];
    return workOrders.filter((wo) => {
      if (!wo.scheduled_date) return false;
      const cleanDate = wo.scheduled_date.split("T")[0];
      const parts = cleanDate.split("-");
      if (parts.length !== 3) return false;
      const scheduled = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
        12,
        0,
        0,
      );
      return scheduled >= activeRange.start && scheduled <= activeRange.end;
    });
  }, [workOrders, weekFilter, dateRanges]);

  const counts = useMemo(() => {
    return {
      ALL: timeFilteredWorkOrders.length,
      OPEN: timeFilteredWorkOrders.filter(
        (wo) => wo.status?.toUpperCase() === "OPEN" && !isOverdue(wo),
      ).length,
      "IN PROGRESS": timeFilteredWorkOrders.filter(
        (wo) => wo.status?.toUpperCase() === "IN PROGRESS",
      ).length,
      COMPLETED: timeFilteredWorkOrders.filter(
        (wo) => wo.status?.toUpperCase() === "COMPLETED",
      ).length,
      CANCELLED: timeFilteredWorkOrders.filter(
        (wo) => wo.status?.toUpperCase() === "CANCELLED",
      ).length,
      OVERDUE: timeFilteredWorkOrders.filter((wo) => isOverdue(wo)).length,
    };
  }, [timeFilteredWorkOrders]);

  const finalFilteredWorkOrders = useMemo(() => {
    if (statusFilter === "ALL") return timeFilteredWorkOrders;
    if (statusFilter === "OVERDUE")
      return timeFilteredWorkOrders.filter((wo) => isOverdue(wo));
    return timeFilteredWorkOrders.filter(
      (wo) => wo.status?.toUpperCase() === statusFilter && !isOverdue(wo),
    );
  }, [timeFilteredWorkOrders, statusFilter]);

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
            Period: {dateRanges[weekFilter as keyof typeof dateRanges]?.period}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Overdue = OPEN Work Orders with scheduled date earlier than today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <Link
            href="/preventive-maintenance"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="LAST_WEEK">{dateRanges.LAST_WEEK.label}</option>
            <option value="THIS_WEEK">{dateRanges.THIS_WEEK.label}</option>
            <option value="NEXT_WEEK">{dateRanges.NEXT_WEEK.label}</option>
          </select>

          <Link
            href="/work-orders"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New WO</span>
          </Link>
        </div>
      </div>

      {/* CARDURI KPI (Adaptate pentru 5 elemente) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total WO
            </span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">
              {counts.ALL}
            </span>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-500 hidden sm:block">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open
            </span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              {counts.OPEN}
            </span>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg text-blue-500 hidden sm:block">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overdue WO
            </span>
            <span className="text-2xl font-bold text-red-600 mt-1 block">
              {counts.OVERDUE}
            </span>
          </div>
          <div className="p-2 bg-red-50 rounded-lg text-red-500 hidden sm:block">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              In Progress
            </span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {counts["IN PROGRESS"]}
            </span>
          </div>
          <div className="p-2 bg-amber-50 rounded-lg text-amber-500 hidden sm:block">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <span className="text-2xl font-bold text-green-600 mt-1 block">
              {counts.COMPLETED}
            </span>
          </div>
          <div className="p-2 bg-green-50 rounded-lg text-green-500 hidden sm:block">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BUTOANE FILTRARE DASHBOARD */}
      <div className="flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
        {(
          [
            "ALL",
            "OPEN",
            "OVERDUE",
            "IN PROGRESS",
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
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${isActive ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {counts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTAINER TABEL */}
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
            {finalFilteredWorkOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-slate-500 font-medium italic bg-slate-50/50"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                    <span>No Work Orders found for selected period.</span>
                  </div>
                </td>
              </tr>
            ) : (
              finalFilteredWorkOrders.map((wo) => (
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
                    {wo.scheduled_date
                      ? new Date(wo.scheduled_date).toLocaleDateString("ro-RO")
                      : "-"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(wo)}`}
                    >
                      {isOverdue(wo) ? "OVERDUE" : wo.status}
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
