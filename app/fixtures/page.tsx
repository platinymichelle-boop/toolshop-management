"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Layers,
  Cpu,
  CheckCircle,
  Factory,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Plus,
  Calendar,
  Wrench,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";

interface Fixture {
  id: string;
  created_at: string;
  machine: string;
  manufacturer: string;
  fixture_name: string;
  fixture_nr: number;
  status: string;
  notes: string;
  pm_tasks_count?: number;
}

interface UpcomingTask {
  id: string;
  task_name: string;
  next_due: string;
  fixture_name: string;
  machine: string;
}

interface OpenWorkOrder {
  id: string;
  wo_number: string;
  status: string;
  created_at: string;
  tool_number: string; // Machine
  tool_name: string; // Fixture name
}

export default function WeldingFixturesDashboard() {
  const router = useRouter();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [openWorkOrders, setOpenWorkOrders] = useState<OpenWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedManufacturer, setSelectedManufacturer] = useState("all");

  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [totalPmCount, setTotalPmCount] = useState(0);

  const getTaskStatus = (nextDueStr: string) => {
    if (!nextDueStr) return "Active";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueStr);
    dueDate.setHours(0, 0, 0, 0);
    if (isNaN(dueDate.getTime())) return "Active";

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays <= 7) return "Due Soon";
    return "Active";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: fixturesData, error: fError } = await supabase
        .from("fixtures")
        .select("*")
        .order("machine", { ascending: true });

      if (fError) {
        console.log("Supabase Error:", fError);
        throw fError;
      }

      const { data: pmTasks, error: pmError } = await supabase
        .from("fixture_pm")
        .select(
          "id, fixture_id, task_name, next_due, fixtures(fixture_name, machine)",
        );

      if (pmError) {
        console.log("Supabase Error:", pmError);
        throw pmError;
      }

      const countsMap: Record<string, number> = {};
      let overdue = 0;
      let dueSoon = 0;
      const tasksFormatted: UpcomingTask[] = [];
      const totalPms = pmTasks?.length || 0;

      pmTasks?.forEach((task: any) => {
        countsMap[task.fixture_id] = (countsMap[task.fixture_id] || 0) + 1;

        const status = getTaskStatus(task.next_due);
        if (status === "Overdue") overdue++;
        if (status === "Due Soon") dueSoon++;

        tasksFormatted.push({
          id: task.id,
          task_name: task.task_name,
          next_due: task.next_due || "",
          fixture_name: task.fixtures?.fixture_name || "Unknown",
          machine: task.fixtures?.machine || "N/A",
        });
      });

      setOverdueCount(overdue);
      setDueSoonCount(dueSoon);
      setTotalPmCount(totalPms);

      const sortedTasks = tasksFormatted
        .sort((a, b) => {
          if (!a.next_due) return 1;
          if (!b.next_due) return -1;
          return (
            new Date(a.next_due).getTime() - new Date(b.next_due).getTime()
          );
        })
        .slice(0, 10);
      setUpcomingTasks(sortedTasks);
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .select("id, wo_number, status, created_at, tool_number, tool_name")
        .eq("source", "FIXTURE_PM")
        .order("created_at", { ascending: false });

      if (woError) {
        console.log("Supabase Error:", woError);
        throw woError;
      }

      const openWOs = (woData || []).filter((w) => w.status === "OPEN");
      setOpenWorkOrders(openWOs.slice(0, 10));

      const updatedFixtures = (fixturesData || []).map((f) => ({
        ...f,
        pm_tasks_count: countsMap[f.id] || 0,
      }));

      setFixtures(updatedFixtures);
    } catch (err) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueMachines = Array.from(
    new Set(fixtures.map((f) => f.machine)),
  ).filter(Boolean);
  const uniqueManufacturers = Array.from(
    new Set(fixtures.map((f) => f.manufacturer)),
  ).filter(Boolean);

  const filteredFixtures = fixtures.filter((f) => {
    const matchesSearch =
      f.fixture_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.machine?.toLowerCase().includes(search.toLowerCase());
    const matchesMachine =
      selectedMachine === "all" || f.machine === selectedMachine;
    const matchesMfr =
      selectedManufacturer === "all" || f.manufacturer === selectedManufacturer;
    return matchesSearch && matchesMachine && matchesMfr;
  });

  const totalFixtures = fixtures.length;
  const fixturesWithPm = fixtures.filter(
    (f) => (f.pm_tasks_count || 0) > 0,
  ).length;
  const totalOpenWOs = openWorkOrders.length;

  const computedCompliance = totalPmCount
    ? Math.round(((totalPmCount - overdueCount) / totalPmCount) * 100)
    : 100;
  const complianceRate = Math.max(0, Math.min(100, computedCompliance));

  const machineStats = Object.values(
    fixtures.reduce<Record<string, { machine: string; count: number }>>(
      (acc, f) => {
        if (!acc[f.machine]) acc[f.machine] = { machine: f.machine, count: 0 };
        acc[f.machine].count += 1;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.count - a.count);

  const renderDueDate = (dateStr: string) => {
    if (!dateStr)
      return <span className="text-slate-400 italic">No Due Date</span>;
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
      return <span className="text-slate-400 italic">No Due Date</span>;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center text-rose-600 bg-slate-50">
        <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm font-medium">
          {error}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welding Fixtures Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Mactera / Albaksan / Unis Fixture Management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
            </button>
            <button
              onClick={() => alert("Add Fixture Action")}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Fixture
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            {
              label: "Total Fixtures",
              val: totalFixtures,
              icon: <Layers className="h-5 w-5 text-blue-500" />,
            },
            {
              label: "Fixtures With PM",
              val: fixturesWithPm,
              icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            },
            {
              label: "Open Fixture WOs",
              val: totalOpenWOs,
              icon: <Wrench className="h-5 w-5 text-indigo-500" />,
            },
            {
              label: "Overdue PM",
              val: overdueCount,
              icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
            },
            {
              label: "Due Soon PM",
              val: dueSoonCount,
              icon: <Clock className="h-5 w-5 text-amber-500" />,
            },
            {
              label: "PM Compliance %",
              val: `${complianceRate}%`,
              icon: <Activity className="h-5 w-5 text-teal-500" />,
            },
          ].map((c, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-xl font-bold text-slate-800">{c.val}</p>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg">{c.icon}</div>
            </div>
          ))}
        </section>
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Upcoming PM
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-2">Task Name</th>
                    <th className="pb-2">Fixture</th>
                    <th className="pb-2">Machine</th>
                    <th className="pb-2">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {upcomingTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-slate-400"
                      >
                        No upcoming tasks found.
                      </td>
                    </tr>
                  ) : (
                    upcomingTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-bold text-slate-900">
                          {t.task_name}
                        </td>
                        <td className="py-2.5 font-medium">{t.fixture_name}</td>
                        <td className="py-2.5">{t.machine}</td>
                        <td className="py-2.5 font-bold text-slate-700">
                          {renderDueDate(t.next_due)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Open Fixture Work Orders
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                    <th className="pb-2">WO Number</th>
                    <th className="pb-2">Fixture</th>
                    <th className="pb-2">Machine</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {openWorkOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-slate-400"
                      >
                        No open work orders.
                      </td>
                    </tr>
                  ) : (
                    openWorkOrders.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td
                          className="py-2.5 font-bold text-indigo-600 hover:underline cursor-pointer"
                          onClick={() => router.push(`/work-orders/${w.id}`)}
                        >
                          {w.wo_number}
                        </td>
                        <td className="py-2.5 font-medium">{w.tool_name}</td>
                        <td className="py-2.5">{w.tool_number}</td>
                        <td className="py-2.5">
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase tracking-wider">
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search fixture or machine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none appearance-none"
            >
              <option value="all">All Machines</option>
              {uniqueMachines.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none appearance-none"
            >
              <option value="all">All Manufacturers</option>
              {uniqueManufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4">Machine</th>
                    <th className="p-4">Fixture Name</th>
                    <th className="p-4">Manufacturer</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">PM Tasks</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredFixtures.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-slate-400"
                      >
                        No fixtures found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFixtures.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">
                          {f.machine}
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {f.fixture_name}
                        </td>
                        <td className="p-4">{f.manufacturer || "N/A"}</td>
                        <td className="p-4">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${f.status?.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                          >
                            {f.status || "Unknown"}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800">
                          {f.pm_tasks_count}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => router.push(`/fixtures/${f.id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
              Machine Statistics
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {machineStats.map((stat) => (
                <div
                  key={stat.machine}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="font-semibold text-slate-700">
                    {stat.machine}
                  </span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    {stat.count} Fixtures
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
