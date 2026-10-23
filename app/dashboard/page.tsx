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
  Activity,
  Layers,
  Package,
  ShieldAlert,
  HeartPulse,
  ChevronRight,
  ExternalLink,
  FileText,
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
  <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-between transition-all hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700">
    <div className="min-w-0 flex-1 pr-2">
      <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate">
        {title}
      </p>
      <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 truncate tracking-tight">
        {value}
      </p>
    </div>
    <div className={`p-3 rounded-xl shrink-0 ${colorClass}`}>{icon}</div>
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

  const [totalMachines, setTotalMachines] = useState<number>(0);
  const [openWorkOrders, setOpenWorkOrders] = useState<number>(0);
  const [completedWorkOrders, setCompletedWorkOrders] = useState<number>(0);
  const [activeBreakdowns, setActiveBreakdowns] = useState<number>(0);
  const [availableTechnicians, setAvailableTechnicians] = useState<number>(0);
  const [openImprovements, setOpenImprovements] = useState<number>(0);

  const [totalAssemblies, setTotalAssemblies] = useState<number>(0);
  const [totalSpareParts, setTotalSpareParts] = useState<number>(0);
  const [criticalSpareParts, setCriticalSpareParts] = useState<number>(0);

  const [, setRecentBreakdowns] = useState<Breakdown[]>([]);
  const [openRepairs, setOpenRepairs] = useState<Repair[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    [],
  );
  const [quickAccessTools, setQuickAccessTools] = useState<string[]>([]);

  const [machineHealth, setMachineHealth] = useState<{
    score: number;
    status: "good" | "warning" | "critical";
  }>({ score: 100, status: "good" });
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

      setTotalMachines(toolsCount.count || 0);
      setOpenWorkOrders(openRepairsCount.count || 0);
      setCompletedWorkOrders(closedRepairsCount.count || 0);
      setActiveBreakdowns(activeBreakdownsCount.count || 0);
      setAvailableTechnicians(techsCount.count || 0);
      setOpenImprovements(improvementsCount.count || 0);
      setTotalAssemblies(assembliesCount.count || 0);
      setTotalSpareParts(sparePartsCount.count || 0);
      setCriticalSpareParts(criticalPartsCount.count || 0);
      setRecentBreakdowns(recentBreakdownsRes.data || []);
      setOpenRepairs(openRepairsRes.data || []);

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

      const uniqueTools = Array.from(
        new Set(combinedActivity.map((act) => act.tool_number)),
      )
        .filter(Boolean)
        .slice(0, 5);
      setQuickAccessTools(uniqueTools);

      const openRepairsVal = openRepairsCount.count || 0;
      const activeBreakdownsVal = activeBreakdownsCount.count || 0;

      let score = 100 - (activeBreakdownsVal * 15 + openRepairsVal * 5);
      if (score < 0) score = 0;
      let status: "good" | "warning" | "critical" = "good";
      if (score < 50) status = "critical";
      else if (score < 85) status = "warning";

      setMachineHealth({ score, status });
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-semibold text-zinc-400">
            Se încarcă datele panoului...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 p-4 sm:p-6 lg:p-8 text-zinc-300">
      {/* Zona Antet Dashboard */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            Maintenance Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time overview of shop floor operations and live equipment
            status.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-zinc-900 px-3 py-2 rounded-xl shadow-sm border border-zinc-800 self-start sm:self-center">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Last Refresh: {lastRefresh}
        </div>
      </div>

      {/* Rândul 1: Index Stare Generală Sănătate Mașini */}
      <div className="mb-6 w-full bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl ${machineHealth.status === "good" ? "bg-emerald-500/10 text-emerald-400" : machineHealth.status === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}
          >
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100">
              Overall Machine Health Index
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Calculated dynamically from active breakdown logs and open work
              orders.
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right border-t pt-3 sm:border-t-0 sm:pt-0 border-zinc-800">
          <div className="text-3xl font-black text-zinc-100 tracking-tight">
            {machineHealth.score}%
          </div>
          <span
            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider mt-1.5 ${machineHealth.status === "good" ? "text-emerald-400" : machineHealth.status === "warning" ? "text-amber-400" : "text-rose-400"}`}
          >
            {machineHealth.status === "good"
              ? "● Good Standing"
              : machineHealth.status === "warning"
                ? "● Attention Required"
                : "● Critical Status"}
          </span>
        </div>
      </div>
      {/* Rândul 2: Toate Cardurile KPI principale */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        <KPICard
          title="Total Machines"
          value={totalMachines}
          icon={<Wrench className="h-5 w-5 text-blue-400" />}
          colorClass="bg-blue-500/10"
        />
        <KPICard
          title="Open Repairs"
          value={openWorkOrders}
          icon={<ClipboardList className="h-5 w-5 text-amber-400" />}
          colorClass="bg-amber-500/10"
        />
        <KPICard
          title="Completed"
          value={completedWorkOrders}
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          colorClass="bg-emerald-500/10"
        />
        <KPICard
          title="Active Breakdowns"
          value={activeBreakdowns}
          icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
          colorClass="bg-rose-500/10"
        />
        <KPICard
          title="Available Techs"
          value={availableTechnicians}
          icon={<Users className="h-5 w-5 text-teal-400" />}
          colorClass="bg-teal-500/10"
        />
        <KPICard
          title="Open Kaizens"
          value={openImprovements}
          icon={<Lightbulb className="h-5 w-5 text-purple-400" />}
          colorClass="bg-purple-500/10"
        />
        <KPICard
          title="Total Assemblies"
          value={totalAssemblies}
          icon={<Layers className="h-5 w-5 text-indigo-400" />}
          colorClass="bg-indigo-500/10"
        />
        <KPICard
          title="Total Spare Parts"
          value={totalSpareParts}
          icon={<Package className="h-5 w-5 text-zinc-400" />}
          colorClass="bg-zinc-500/10"
        />
        <KPICard
          title="Critical Spares"
          value={criticalSpareParts}
          icon={<ShieldAlert className="h-5 w-5 text-rose-400" />}
          colorClass="bg-rose-500/10"
        />
      </div>

      {/* Rândul 3: Secțiunea Split-Screen (Tabele și Sinteze) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 w-full">
        <div className="bg-zinc-100/5 dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-800 lg:col-span-2 w-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Active & Open Repairs
            </h2>
          </div>
          {openRepairs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-zinc-500">
                No active repairs recorded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950/40">
                    <th className="py-3 px-3">Tool No</th>
                    <th className="py-3 px-3">Failure Details</th>
                    <th className="py-3 px-3">Technician</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                  {openRepairs.map((repair) => (
                    <tr
                      key={repair.id}
                      className="hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-zinc-100">
                        {repair.tool_number}
                      </td>
                      <td
                        className="py-3 px-3 text-zinc-400 truncate max-w-[200px]"
                        title={repair.failure}
                      >
                        {repair.failure}
                      </td>
                      <td className="py-3 px-3 text-zinc-500">
                        {repair.technician || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/20">
                          {repair.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="bg-zinc-100/5 dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-800 w-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-100">
                Equipment Overview
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-sm">
                <span className="text-zinc-400 font-medium">
                  Total Active Machines
                </span>
                <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                  {totalMachines}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-sm">
                <span className="text-zinc-400 font-medium">
                  Total Assemblies
                </span>
                <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                  {totalAssemblies}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-sm">
                <span className="text-zinc-400 font-medium">
                  Total Spare Parts Lines
                </span>
                <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                  {totalSpareParts}
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-500/5 text-sm border border-rose-500/20">
                <span className="text-rose-400 font-bold">
                  Out of Stock Spares
                </span>
                <span className="font-mono font-bold text-rose-400 bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                  {criticalSpareParts}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rândul 4: Quick Access & Recent Updates */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 w-full">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 w-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <ExternalLink className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Quick Access (Recent Tools)
            </h2>
          </div>
          {quickAccessTools.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No recent logs.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickAccessTools.map((tool) => (
                <Link
                  key={tool}
                  href={`/tools?number=${encodeURIComponent(tool)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/20 text-sm font-bold text-purple-400 hover:bg-purple-500/10 transition-all"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {tool}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 lg:col-span-2 w-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <FileText className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Recent Activity Timeline
            </h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              No active history log found.
            </p>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, actIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-6">
                      {actIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-100 dark:bg-zinc-800"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 ${activity.type === "Breakdown" ? "bg-rose-500/10 text-rose-400" : activity.type === "Repair" ? "bg-amber-500/10 text-amber-400" : "bg-purple-500/10 text-purple-400"}`}
                          >
                            {activity.type === "Breakdown" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : activity.type === "Repair" ? (
                              <ClipboardList className="h-4 w-4" />
                            ) : (
                              <Lightbulb className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div className="min-w-0">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                              <span className="font-bold text-zinc-900 dark:text-zinc-200">
                                {activity.type}
                              </span>{" "}
                              logged for tool{" "}
                              <Link
                                href={`/tools?number=${encodeURIComponent(activity.tool_number)}`}
                                className="font-semibold text-emerald-400 hover:underline"
                              >
                                {activity.tool_number}
                              </Link>
                              :{" "}
                              <span className="italic opacity-80">
                                "{activity.title}"
                              </span>
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-xs font-medium text-zinc-400 dark:text-zinc-500">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
