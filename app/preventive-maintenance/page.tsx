// PARTEA 1 DIN 6
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Hourglass,
  CheckSquare,
  Activity,
  Percent,
  ArrowLeft,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface PMTask {
  id: string;
  tool_number: string;
  equipment_node_id: string | null;
  workcenter: string | null;
  equipment: string;
  sub_equipment: string;
  action: string;
  frequency: string;
  maintenance_equipment: string | null;
  operation: string | null;
  control_method: string | null;
  technician: string;
  estimated_time: any | null;
  status: "OPEN" | "DUE_SOON" | "OVERDUE" | "COMPLETED";
  priority: string | null;
  last_completed_at: string | null;
  next_due_at: string | null;
  remarks: string | null;
  part_reference: string | null;
  required_material: string | null;
}

interface WorkOrder {
  id: string;
  status: string;
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
// PARTEA 2 DIN 6
export default function PreventiveMaintenanceDashboard() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extragere exclusivă din tabela work_orders pentru generarea panoului de analiză
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select("id, status");
      if (woError) throw woError;

      setWorkOrders(woData || []);
    } catch (err: any) {
      setError(err.message || "A apărut o eroare la preluarea datelor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);
  // PARTEA 3 DIN 6
  const metrics = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "OPEN",
    ).length;
    const inProgress = workOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "IN_PROGRESS",
    ).length;
    const completed = workOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "COMPLETED",
    ).length;

    // WO Completion Rate % -> (COMPLETED / TOTAL) * 100
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    // Maintenance Health Score formula -> (COMPLETED + IN_PROGRESS * 0.5) / TOTAL * 100
    const healthScore =
      total > 0
        ? Math.round(((completed + inProgress * 0.5) / total) * 100)
        : 100;

    let healthBadge = {
      text: "Excellent",
      color: "bg-green-50 text-green-700 border-green-100",
    };
    if (healthScore >= 70 && healthScore <= 89) {
      healthBadge = {
        text: "Good",
        color: "bg-blue-50 text-blue-700 border-blue-100",
      };
    } else if (healthScore >= 50 && healthScore <= 69) {
      healthBadge = {
        text: "Warning",
        color: "bg-amber-50 text-amber-700 border-amber-100",
      };
    } else if (healthScore < 50) {
      healthBadge = {
        text: "Critical",
        color: "bg-red-50 text-red-700 border-red-100",
      };
    }

    const chartData = [
      { name: "OPEN", value: open, color: "#3b82f6" },
      { name: "IN PROGRESS", value: inProgress, color: "#f59e0b" },
      { name: "COMPLETED", value: completed, color: "#22c55e" },
    ];

    return {
      total,
      open,
      inProgress,
      completed,
      completionRate,
      healthScore,
      healthBadge,
      chartData,
    };
  }, [workOrders]);
  // PARTEA 4 DIN 6
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Preventive Maintenance Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Analiza performanței de execuție bazată exclusiv pe fluxul de lucru
            Work Orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Reintegrarea butonului de redirecționare înapoi către Work Orders */}
          <Link
            href="/work-orders/list"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            Work Orders
          </Link>

          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>
      {/* Primul rând de carduri KPI calculate din work_orders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Total Work Orders
            </p>
            <p className="text-2xl font-bold text-slate-900">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Open Work Orders
            </p>
            <p className="text-2xl font-bold text-slate-900">{metrics.open}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              In Progress WOs
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.inProgress}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              WO Completion Rate
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.completionRate}%
            </p>
          </div>
        </div>
      </div>
      {/* Al doilea rând de carduri KPI și Health Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Completed Work Orders
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {metrics.completed}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Maintenance Health Score
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {metrics.healthScore}%
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${metrics.healthBadge.color}`}
          >
            {metrics.healthBadge.text}
          </span>
        </div>
      </div>
      {/* Secțiune Grafice Analytics (Pie Chart & Bar Chart) bazate pe Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graficul 1: Pie Chart - PM Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            PM Status Distribution
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Comenzi`, "Volum"]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Graficul 2: Bar Chart - PM Status Overview */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            PM Status Overview
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={metrics.chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} Comenzi`, "Cantitate"]}
                />
                <Bar dataKey="value" radius={4}>
                  {metrics.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
