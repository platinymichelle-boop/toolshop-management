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

interface FixtureWorkOrder {
  id: string;
  status: string;
  scheduled_date: string | null;
}

export default function FixturePreventiveMaintenanceDashboard() {
  const [fixtureCount, setFixtureCount] = useState<number>(0);
  const [pmTasksCount, setPmTasksCount] = useState<number>(0);
  const [fixtureWorkOrders, setFixtureWorkOrders] = useState<
    FixtureWorkOrder[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState<string>("THIS_WEEK");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { count: fCount, error: fError } = await supabase
        .from("fixtures")
        .select("*", { count: "exact", head: true });
      if (fError) throw fError;
      setFixtureCount(fCount || 0);

      const { count: tCount, error: tError } = await supabase
        .from("fixture_pm_tasks")
        .select("*", { count: "exact", head: true });
      if (tError) throw tError;
      setPmTasksCount(tCount || 0);

      const { data: woData, error: woError } = await supabase
        .from("fixture_work_orders")
        .select("id, status, scheduled_date");
      if (woError) throw woError;
      setFixtureWorkOrders(woData || []);
    } catch (err: any) {
      setError(
        err.message ||
          "A apărut o eroare la preluarea datelor pentru dispozitive.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
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
  const filteredWorkOrders = useMemo(() => {
    const activeRange = dateRanges[weekFilter as keyof typeof dateRanges];
    if (!activeRange) return [];

    return fixtureWorkOrders.filter((wo) => {
      if (!wo.scheduled_date) return false;

      const dateParts = wo.scheduled_date.split("T")[0].split("-");
      if (dateParts.length !== 3) return false;

      const scheduled = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        12,
        0,
        0,
      );

      return scheduled >= activeRange.start && scheduled <= activeRange.end;
    });
  }, [fixtureWorkOrders, weekFilter, dateRanges]);

  const metrics = useMemo(() => {
    const total = filteredWorkOrders.length;
    const open = filteredWorkOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "OPEN",
    ).length;
    const inProgress = filteredWorkOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "IN PROGRESS",
    ).length;
    const completed = filteredWorkOrders.filter(
      (wo) => String(wo.status).toUpperCase() === "COMPLETED",
    ).length;

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
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
  }, [filteredWorkOrders]);
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
            Fixture Preventive Maintenance Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Period: {dateRanges[weekFilter as keyof typeof dateRanges]?.period}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <Link
            href="/fixture-work-orders/list"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            Fixture Work Orders
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
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Fixtures",
            val: fixtureCount,
            icon: <Layers className="w-6 h-6" />,
            bg: "bg-slate-100 text-slate-600",
          },
          {
            label: "Total PM Tasks",
            val: pmTasksCount,
            icon: <Wrench className="w-6 h-6" />,
            bg: "bg-slate-100 text-slate-600",
          },
          {
            label: "Open Fixture Work Orders",
            val: metrics.open,
            icon: <Clock className="w-6 h-6" />,
            bg: "bg-blue-50 text-blue-600",
          },
          {
            label: "PM Compliance %",
            val: `${metrics.completionRate}%`,
            icon: <Percent className="w-6 h-6" />,
            bg: "bg-emerald-50 text-emerald-600",
          },
        ].map((c, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4"
          >
            <div className={`p-3 rounded-lg ${c.bg}`}>{c.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
              {loading ? (
                <div className="h-7 bg-slate-200 rounded animate-pulse w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{c.val}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">
              Completed Fixture Work Orders
            </p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">
                {metrics.completed}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Fixture Health Score
              </p>
              {loading ? (
                <div className="h-8 bg-slate-200 rounded animate-pulse w-20 mt-1" />
              ) : (
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.healthScore}%
                </p>
              )}
            </div>
          </div>
          {!loading && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${metrics.healthBadge.color}`}
            >
              {metrics.healthBadge.text}
            </span>
          )}
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[350px] animate-pulse flex flex-col justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-48 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[350px] animate-pulse flex flex-col justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-48 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      ) : metrics.total === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-2">
          <ClipboardList className="w-12 h-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">
            No Work Orders found for selected period.
          </h3>
          <p className="text-slate-400 text-sm">
            Încercați să selectați un alt interval de timp sau adăugați comenzi
            noi în sistem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Fixture WO Status Distribution
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
                  <Tooltip
                    formatter={(value) => [`${value} Comenzi`, "Volum"]}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Fixture WO Status Overview
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
      )}
    </div>
  );
}
