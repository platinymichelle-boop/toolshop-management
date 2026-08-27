"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Wrench,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Users,
  Lightbulb,
  Clock,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Package,
  ShieldAlert,
  HeartPulse,
  ExternalLink,
} from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  colorClass,
}) => (
  <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
  </div>
);

interface Breakdown {
  id: string;
  created_at: string;
  tool_number: string;
  failure: string;
  technician?: string;
  status: string;
}

interface Repair {
  id: string;
  created_at: string;
  id_repair?: string;
  tool_number: string;
  failure: string;
  technician?: string;
  status: string;
}

interface RecentActivityItem {
  id: string;
  created_at: string;
  tool_number: string;
  type: "Repair" | "Breakdown" | "Improvement";
  title: string;
  status: string;
}

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  // KPI Stări Existente
  const [totalMachines, setTotalMachines] = useState<number>(0);
  const [openWorkOrders, setOpenWorkOrders] = useState<number>(0);
  const [completedWorkOrders, setCompletedWorkOrders] = useState<number>(0);
  const [activeBreakdowns, setActiveBreakdowns] = useState<number>(0);
  const [availableTechnicians, setAvailableTechnicians] = useState<number>(0);
  const [openImprovements, setOpenImprovements] = useState<number>(0);

  // KPI Stări Echipamente Live
  const [totalAssemblies, setTotalAssemblies] = useState<number>(0);
  const [totalSpareParts, setTotalSpareParts] = useState<number>(0);
  const [criticalSpareParts, setCriticalSpareParts] = useState<number>(0);

  // Stări Date Secțiuni Operaționale
  const [recentBreakdowns, setRecentBreakdowns] = useState<Breakdown[]>([]);
  const [openRepairs, setOpenRepairs] = useState<Repair[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );

  // Stări Quick Access și Health
  const [quickAccessTools, setQuickAccessTools] = useState<string[]>([]);
  const [machineHealth, setMachineHealth] = useState<{
    score: number;
    status: "good" | "warning" | "critical";
  }>({ score: 100, status: "good" });
  // Funcția centrală optimizată prin Promise.all pentru performanță maximă
  const fetchDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [
        toolsCount,
        openRepairsCount,
        closedRepairsCount,
        activeBreakdownsCount,
        techsCount,
        improvementsCount,
        assembliesCount,
        sparePartsCount,
        criticalPartsCount,
        recentBreakdownsRes,
        openRepairsRes,
        activityRepairs,
        activityBreakdowns,
        activityImprovements,
      ] = await Promise.all([
        supabase.from("tools").select("*", { count: "exact", head: true }),
        supabase
          .from("repairs")
          .select("*", { count: "exact", head: true })
          .neq("status", "Closed"),
        supabase
          .from("repairs")
          .select("*", { count: "exact", head: true })
          .eq("status", "Closed"),
        supabase
          .from("breakdowns")
          .select("*", { count: "exact", head: true })
          .neq("status", "Closed"),
        supabase
          .from("technicians")
          .select("*", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("improvements")
          .select("*", { count: "exact", head: true })
          .neq("status", "Implemented"),
        supabase
          .from("equipment_nodes")
          .select("*", { count: "exact", head: true })
          .eq("node_type", "Assemblies"),
        supabase
          .from("spare_parts")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("spare_parts")
          .select("*", { count: "exact", head: true })
          .eq("quantity", 0),
        supabase
          .from("breakdowns")
          .select("id, created_at, tool_number, failure, technician, status")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("repairs")
          .select("id, created_at, tool_number, failure, technician, status")
          .neq("status", "Closed")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("repairs")
          .select("id, created_at, tool_number, failure, status")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("breakdowns")
          .select("id, created_at, tool_number, failure, status")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("improvements")
          .select("id, created_at, tool_number, title, status")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Setare KPI-uri standard
      setTotalMachines(toolsCount.count || 0);
      setOpenWorkOrders(openRepairsCount.count || 0);
      setCompletedWorkOrders(closedRepairsCount.count || 0);
      setActiveBreakdowns(activeBreakdownsCount.count || 0);
      setAvailableTechnicians(techsCount.count || 0);
      setOpenImprovements(improvementsCount.count || 0);

      // Setare KPI-uri pentru arborele de echipamente (Live din DB)
      setTotalAssemblies(assembliesCount.count || 0);
      setTotalSpareParts(sparePartsCount.count || 0);
      setCriticalSpareParts(criticalPartsCount.count || 0);

      // Setare liste operaționale
      setRecentBreakdowns(recentBreakdownsRes.data || []);
      setOpenRepairs(openRepairsRes.data || []);

      // Generare istoric unificat pentru Recent Activity timeline
      const combinedActivity: RecentActivityItem[] = [
        ...(activityRepairs.data || []).map(
          (r): RecentActivityItem => ({
            id: r.id,
            created_at: r.created_at,
            tool_number: r.tool_number,
            type: "Repair",
            title: r.failure,
            status: r.status,
          }),
        ),
        ...(activityBreakdowns.data || []).map(
          (b): RecentActivityItem => ({
            id: b.id,
            created_at: b.created_at,
            tool_number: b.tool_number,
            type: "Breakdown",
            title: b.failure,
            status: b.status,
          }),
        ),
        ...(activityImprovements.data || []).map(
          (i): RecentActivityItem => ({
            id: i.id,
            created_at: i.created_at,
            tool_number: i.tool_number,
            type: "Improvement",
            title: i.title,
            status: i.status,
          }),
        ),
      ];
      combinedActivity.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRecentActivity(combinedActivity.slice(0, 8));

      // Quick Access: cele mai recente 5 mașini cu tichete de mentenanță
      const uniqueTools = Array.from(
        new Set(combinedActivity.map((act) => act.tool_number)),
      )
        .filter(Boolean)
        .slice(0, 5);
      setQuickAccessTools(uniqueTools);

      // Calcul dinamic Machine Health index scor
      const openRepairsVal = openRepairsCount.count || 0;
      const activeBreakdownsVal = activeBreakdownsCount.count || 0;
      const computedScore = Math.max(
        0,
        Math.min(100, 100 - 5 * openRepairsVal - 10 * activeBreakdownsVal),
      );

      let healthStatus: "good" | "warning" | "critical" = "good";
      if (computedScore < 50) healthStatus = "critical";
      else if (computedScore <= 80) healthStatus = "warning";

      setMachineHealth({ score: computedScore, status: healthStatus });

      // Sincronizare timestamp auto-refresh badge
      const now = new Date();
      setLastRefresh(now.toLocaleTimeString("ro-RO"));
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Setare interval automat de reîmprospătare live (la fiecare 30 secunde)
  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* Header Dashboard cu Auto Refresh Badge */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Maintenance Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview of shop floor operations and live equipment
            status.
          </p>
        </div>
        <div className="text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 shadow-sm font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          Last Refresh: {lastRefresh}
        </div>
      </div>

      {/* Machine Health Status Card */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-sm bg-white ${
          machineHealth.status === "good"
            ? "border-emerald-200 bg-emerald-50/20"
            : machineHealth.status === "warning"
              ? "border-amber-200 bg-amber-50/20"
              : "border-rose-200 bg-rose-50/20"
        }`}
      >
        <div className="flex items-center gap-3">
          <HeartPulse
            className={`h-8 w-8 ${
              machineHealth.status === "good"
                ? "text-emerald-600"
                : machineHealth.status === "warning"
                  ? "text-amber-500"
                  : "text-rose-600"
            }`}
          />
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Overall Machine Health Index
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Calculated dynamically from active breakdown logs and open work
              orders.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">
              {machineHealth.score}%
            </span>
            <span className="text-xs block font-bold uppercase tracking-wider mt-0.5">
              {machineHealth.status === "good"
                ? "🟢 Good Standing"
                : machineHealth.status === "warning"
                  ? "🟡 Attention Needed"
                  : "🔴 Critical State"}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-9 gap-4">
        <KPICard
          title="Total Machines"
          value={totalMachines}
          icon={<Wrench className="h-5 w-5 text-blue-600" />}
          colorClass="bg-blue-100"
        />
        <KPICard
          title="Open Repairs"
          value={openWorkOrders}
          icon={<ClipboardList className="h-5 w-5 text-yellow-600" />}
          colorClass="bg-yellow-100"
        />
        <KPICard
          title="Completed"
          value={completedWorkOrders}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          colorClass="bg-green-100"
        />
        <KPICard
          title="Active Breakdowns"
          value={activeBreakdowns}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          colorClass="bg-red-100"
        />
        <KPICard
          title="Available Techs"
          value={availableTechnicians}
          icon={<Users className="h-5 w-5 text-teal-600" />}
          colorClass="bg-teal-100"
        />
        <KPICard
          title="Open Kaizens"
          value={openImprovements}
          icon={<Lightbulb className="h-5 w-5 text-purple-600" />}
          colorClass="bg-purple-100"
        />
        <KPICard
          title="Total Assemblies"
          value={totalAssemblies}
          icon={<Layers className="h-5 w-5 text-indigo-600" />}
          colorClass="bg-indigo-100"
        />
        <KPICard
          title="Total Spare Parts"
          value={totalSpareParts}
          icon={<Package className="h-5 w-5 text-slate-600" />}
          colorClass="bg-slate-100"
        />
        <KPICard
          title="Critical Spares (0)"
          value={criticalSpareParts}
          icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
          colorClass="bg-rose-100"
        />
      </div>

      {/* Layout Blocuri 1: Open Repairs & Equipment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Open Repairs */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Active & Open Repairs
            </h2>
          </div>
          <div className="overflow-x-auto flex-grow">
            {openRepairs.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No active repairs recorded.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-medium">
                    <th className="pb-3 font-semibold">Repair No.</th>
                    <th className="pb-3 font-semibold">Machine</th>
                    <th className="pb-3 font-semibold">Failure Description</th>
                    <th className="pb-3 font-semibold">Technician</th>
                    <th className="pb-3 font-semibold">Created At</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {openRepairs.map((repair) => (
                    <tr
                      key={repair.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 font-mono text-xs text-gray-400">
                        #{repair.id_repair || String(repair.id).substring(0, 8)}
                      </td>
                      <td className="py-3 font-bold text-gray-900">
                        <Link
                          href={`/tool?number=${repair.tool_number}`}
                          className="hover:underline text-blue-600"
                        >
                          {repair.tool_number}
                        </Link>
                      </td>
                      <td className="py-3 max-w-xs truncate">
                        {repair.failure}
                      </td>
                      <td className="py-3 text-gray-500">
                        {repair.technician || "Unassigned"}
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {new Date(repair.created_at).toLocaleDateString(
                          "ro-RO",
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            repair.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {repair.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Panel 2: Equipment Overview (Înlocuiește Top Problem Machines) */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-900">
                Equipment Overview
              </h2>
            </div>
            <div className="space-y-3.5">
              {/* Card rând live pentru Total Machines */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                    🛠️
                  </span>
                  <span className="font-semibold text-sm text-gray-700">
                    Total Active Machines
                  </span>
                </div>
                <span className="font-black text-gray-900 text-base">
                  {totalMachines}
                </span>
              </div>

              {/* Card rând live pentru Total Assemblies */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
                    📦
                  </span>
                  <span className="font-semibold text-sm text-gray-700">
                    Total Assemblies
                  </span>
                </div>
                <span className="font-black text-gray-900 text-base">
                  {totalAssemblies}
                </span>
              </div>

              {/* Card rând live pentru Total Spare Parts */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                    ⚙️
                  </span>
                  <span className="font-semibold text-sm text-gray-700">
                    Total Spare Parts Lines
                  </span>
                </div>
                <span className="font-black text-gray-900 text-base">
                  {totalSpareParts}
                </span>
              </div>

              {/* Card rând live pentru Critical Spare Parts */}
              <div className="flex items-center justify-between p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">
                    🚨
                  </span>
                  <span className="font-semibold text-sm text-rose-900">
                    Out of Stock Spares
                  </span>
                </div>
                <span className="font-black text-rose-700 text-base">
                  {criticalSpareParts}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
          <ExternalLink className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Quick Access (Recent Tools)
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickAccessTools.length === 0 ? (
            <p className="text-gray-500 text-sm py-1">
              No recently active tools available.
            </p>
          ) : (
            quickAccessTools.map((toolNum) => (
              <Link
                key={toolNum}
                href={`/tool?number=${toolNum}`}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <span>⚙️</span>
                <span>{toolNum}</span>
              </Link>
            ))
          )}
        </div>
      </div>
      {/* Layout Blocuri Lower: Recent Activity & Recent Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 3: Recent Activity (Combined Live Feed cu iconițe personalizate și link-uri direct din DB) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Recent Shop Floor Activity
            </h2>
          </div>
          <div className="flow-root">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                No recent activity detected.
              </p>
            ) : (
              <ul className="-mb-8">
                {recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              activity.type === "Breakdown"
                                ? "bg-red-50 text-red-600"
                                : activity.type === "Repair"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-purple-50 text-purple-600"
                            }`}
                          >
                            {activity.type === "Breakdown" && (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                            {activity.type === "Repair" && (
                              <Wrench className="h-4 w-4" />
                            )}
                            {activity.type === "Improvement" && (
                              <Lightbulb className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                        <div className="flex-grow flex items-start justify-between gap-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-800">
                              <Link
                                href={`/tool?number=${activity.tool_number}`}
                                className="font-bold text-blue-600 hover:underline mr-2"
                              >
                                {activity.tool_number}
                              </Link>
                              {activity.title}
                            </p>
                            <span className="text-xs text-gray-400 font-medium">
                              {new Date(activity.created_at).toLocaleString(
                                "ro-RO",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                activity.type === "Breakdown"
                                  ? "bg-red-100 text-red-800"
                                  : activity.type === "Repair"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {activity.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panel 4: Recent Breakdowns Log */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
            <FileText className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Recent Breakdowns Log
            </h2>
          </div>
          <div className="space-y-4 flex-grow">
            {recentBreakdowns.length === 0 ? (
              <p className="text-gray-500 text-sm py-2">
                No critical breakdowns listed.
              </p>
            ) : (
              recentBreakdowns.map((breakdown) => (
                <div
                  key={breakdown.id}
                  className="p-3.5 bg-gray-50/70 rounded-lg border border-gray-100 flex flex-col gap-1 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/tool?number=${breakdown.tool_number}`}
                      className="font-bold text-blue-600 hover:underline text-sm"
                    >
                      {breakdown.tool_number}
                    </Link>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold rounded-md ${
                        breakdown.status === "Closed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800 animate-pulse"
                      }`}
                    >
                      {breakdown.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium line-clamp-2 mt-1">
                    {breakdown.failure}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium pt-1 mt-1 border-t border-gray-100">
                    <span>Tech: {breakdown.technician || "Unassigned"}</span>
                    <span>
                      {new Date(breakdown.created_at).toLocaleString("ro-RO", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Exportul implicit obligatoriu pentru rutele Next.js App Router
export default DashboardPage;
