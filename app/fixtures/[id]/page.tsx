"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListTodo,
  TrendingUp,
  Activity,
  ArrowLeft,
  RefreshCw,
  Wrench,
  ClipboardList,
  Calendar,
  Globe,
  Users,
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
}

interface PMTask {
  id: string;
  fixture_id: string;
  task_name: string;
  task_name_ro?: string | null;
  frequency: string;
  estimated_time: string;
  responsible: string;
  procedure: string;
  procedure_ro?: string | null;
  frequency_days: number;
  last_completed: string | null;
  next_due: string;
}

interface PMHistory {
  id: string;
  fixture_id: string;
  created_at: string;
  technician_name: string;
  result: string;
  comments: string;
}

interface PMAction {
  id: string;
  fixture_pm_id: string;
  sequence_no: number;
  action_description: string;
  action_description_ro?: string | null;
}

export default function FixtureMaintenanceDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const fixtureId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<"pm" | "history" | "overview">(
    "pm",
  );
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [pmTasks, setPmTasks] = useState<PMTask[]>([]);
  const [history, setHistory] = useState<PMHistory[]>([]);
  const [taskActionsMap, setTaskActionsMap] = useState<
    Record<string, PMAction[]>
  >({});
  const [taskLanguages, setTaskLanguages] = useState<
    Record<string, "EN" | "RO">
  >({});
  const [taskShifts, setTaskShifts] = useState<
    Record<string, "SHIFT_1" | "SHIFT_2" | "SHIFT_3">
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: fixtureData, error: fError } = await supabase
        .from("fixtures")
        .select("*")
        .eq("id", fixtureId)
        .single();
      if (fError) {
        console.log("Supabase error fetching fixture:", fError);
        throw fError;
      }
      setFixture(fixtureData);

      const { data: tasksData, error: tError } = await supabase
        .from("fixture_pm")
        .select("*")
        .eq("fixture_id", fixtureId);
      if (tError) {
        console.log("Supabase error fetching fixture_pm tasks:", tError);
        throw tError;
      }
      const fetchedTasks = tasksData || [];
      setPmTasks(fetchedTasks);

      const { data: hData, error: hError } = await supabase
        .from("fixture_pm_history")
        .select("*")
        .eq("fixture_id", fixtureId)
        .order("created_at", { ascending: false });
      if (hError) {
        console.log("Supabase error fetching fixture_pm_history:", hError);
        throw hError;
      }
      setHistory(hData || []);

      if (fetchedTasks.length > 0) {
        const taskIds = fetchedTasks.map((t) => t.id);
        const { data: actionsData, error: actError } = await supabase
          .from("fixture_pm_actions")
          .select("*")
          .in("fixture_pm_id", taskIds)
          .order("sequence_no", { ascending: true });

        if (actError) {
          console.log("Supabase error fetching fixture_pm_actions:", actError);
          throw actError;
        }

        const mappedActions: Record<string, PMAction[]> = {};
        (actionsData || []).forEach((act) => {
          if (!mappedActions[act.fixture_pm_id])
            mappedActions[act.fixture_pm_id] = [];
          mappedActions[act.fixture_pm_id].push(act);
        });
        setTaskActionsMap(mappedActions);

        setTaskLanguages((prev) => {
          const initialLangs = { ...prev };
          fetchedTasks.forEach((t) => {
            if (!initialLangs[t.id]) initialLangs[t.id] = "EN";
          });
          return initialLangs;
        });

        setTaskShifts((prev) => {
          const initialShifts = { ...prev };
          fetchedTasks.forEach((t) => {
            if (!initialShifts[t.id]) initialShifts[t.id] = "SHIFT_1";
          });
          return initialShifts;
        });
      }
    } catch (err) {
      setError("Failed to load fixtures.");
    }
  };

  useEffect(() => {
    if (fixtureId) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [fixtureId]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getTaskStatus = (nextDueStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays <= 7) return "Due Soon";
    return "Active";
  };

  const handleCompleteTask = async (task: PMTask) => {
    try {
      setActionLoading(task.id);
      const selectedShift = taskShifts[task.id] || "SHIFT_1";
      const shiftLabel = selectedShift.replace("_", " ");
      const now = new Date();
      const nextDue = new Date();
      nextDue.setDate(now.getDate() + task.frequency_days);

      await supabase
        .from("fixture_pm")
        .update({
          last_completed: now.toISOString(),
          next_due: nextDue.toISOString().split("T")[0],
        })
        .eq("id", task.id);
      await supabase
        .from("fixture_pm_history")
        .insert({
          fixture_id: fixtureId,
          technician_name: shiftLabel,
          result: "Completed",
          comments: "",
        });
      showToast(`Task "${task.task_name}" completed successfully!`);
      await fetchData();
    } catch (err) {
      console.log(err);
      showToast("Failed to complete task.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateWO = async (task: PMTask) => {
    try {
      setActionLoading(`wo-${task.id}`);

      const { data: existingWO, error: checkError } = await supabase
        .from("work_orders")
        .select("id")
        .eq("fixture_pm_task_id", task.id)
        .eq("status", "OPEN")
        .maybeSingle();

      if (checkError) {
        console.log("Check error:", checkError);
        throw checkError;
      }
      if (existingWO) {
        showToast("Open Work Order already exists", "error");
        return;
      }

      const actionsList = taskActionsMap[task.id] || [];
      if (actionsList.length === 0) {
        showToast("No PM checklist actions configured for this task", "error");
        return;
      }

      const N = actionsList.length;
      const generatedWoNumber = `WO-${Date.now().toString().slice(-6)}`;
      const selectedLang = taskLanguages[task.id] || "EN";
      const selectedShift = taskShifts[task.id] || "SHIFT_1";

      const finalProcedure =
        selectedLang === "RO" && task.procedure_ro
          ? task.procedure_ro
          : task.procedure;

      const { data: newWO, error: woError } = await supabase
        .from("work_orders")
        .insert({
          wo_number: generatedWoNumber,
          tool_number: fixture?.machine || "N/A",
          status: "OPEN",
          priority: "MEDIUM",
          created_by: selectedShift.replace("_", " "),
          tool_name: fixture?.fixture_name || "N/A",
          fixture_id: fixtureId,
          fixture_pm_task_id: task.id,
          source: "FIXTURE_PM",
          actions_count: N,
          total_tasks: N,
          remarks: finalProcedure,
          team_code: selectedShift,
        })
        .select("id")
        .single();

      if (woError) {
        console.log("WO Insert error:", woError);
        throw woError;
      }

      const insertRows = actionsList.map((act) => {
        let description = act.action_description;
        if (selectedLang === "RO" && act.action_description_ro) {
          description = act.action_description_ro;
        }
        return {
          work_order_id: newWO.id,
          fixture_pm_task_id: task.id,
          task_description: description,
          frequency: task.frequency,
          is_completed: false,
        };
      });

      const { error: batchError } = await supabase
        .from("work_order_actions")
        .insert(insertRows);
      if (batchError) {
        console.log("Batch action error:", batchError);
        throw batchError;
      }

      showToast("Work Order generated successfully");
      router.push(`/work-orders/${newWO.id}`);
    } catch (err) {
      console.log(err);
      showToast("Failed to generate Work Order.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteAll = async () => {
    setActionLoading("all");
    for (const task of pmTasks) {
      await handleCompleteTask(task);
    }
    setActionLoading(null);
  };

  const totalTasks = pmTasks.length;
  const overdueTasks = pmTasks.filter(
    (t) => getTaskStatus(t.next_due) === "Overdue",
  ).length;
  const dueSoonTasks = pmTasks.filter(
    (t) => getTaskStatus(t.next_due) === "Due Soon",
  ).length;
  const activeTasks = pmTasks.filter(
    (t) => getTaskStatus(t.next_due) === "Active",
  ).length;
  const complianceRate = totalTasks
    ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100)
    : 100;
  const getHealthScore = () => {
    if (totalTasks === 0)
      return {
        score: 100,
        label: "Excellent",
        text: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    const penalty = overdueTasks * 20 + dueSoonTasks * 5;
    const score = Math.max(0, Math.min(100, 100 - penalty));
    if (score >= 90)
      return {
        score,
        label: "Excellent",
        text: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    if (score >= 75)
      return {
        score,
        label: "Good",
        text: "text-blue-700 bg-blue-50 border-blue-200",
      };
    if (score >= 50)
      return {
        score,
        label: "Warning",
        text: "text-amber-700 bg-amber-50 border-amber-200",
      };
    return {
      score,
      label: "Critical",
      text: "text-rose-700 bg-rose-50 border-rose-200",
    };
  };
  const health = getHealthScore();

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  if (error || !fixture)
    return (
      <div className="flex h-screen items-center justify-center text-rose-600 bg-slate-50">
        <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm font-medium">
          {error || "Fixture not found."}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8 relative">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-bold shadow-lg border transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <button
              onClick={() => router.push("/fixtures")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Fixtures
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fixture Maintenance Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              {fixture.fixture_name} • Machine:{" "}
              <span className="font-semibold text-slate-700">
                {fixture.machine}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={actionLoading !== null}
              onClick={handleCompleteAll}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 transition disabled:opacity-50"
            >
              Complete All PM
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Total PM Tasks",
              val: totalTasks,
              icon: <ListTodo className="h-5 w-5 text-slate-500" />,
            },
            {
              label: "Active Tasks",
              val: activeTasks,
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
            },
            {
              label: "Due Soon Tasks",
              val: dueSoonTasks,
              icon: <Clock className="h-5 w-5 text-amber-500" />,
            },
            {
              label: "Overdue Tasks",
              val: overdueTasks,
              icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
            },
            {
              label: "PM Compliance %",
              val: `${complianceRate}%`,
              icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
            },
          ].map((c, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-2xl font-bold text-slate-800">{c.val}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">{c.icon}</div>
            </div>
          ))}
        </section>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <Activity className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fixture Health Score
              </h3>
              <p className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {health.score}%
              </p>
            </div>
          </div>
          <span
            className={`rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-wider ${health.text}`}
          >
            {health.label}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-500" /> PM Program Summary
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3">Task Name</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3 text-center">Checklist Items</th>
                  <th className="p-3">Last Completed</th>
                  <th className="p-3">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {pmTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      No scheduled tasks.
                    </td>
                  </tr>
                ) : (
                  pmTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">
                        {t.task_name}
                      </td>
                      <td className="p-3 font-medium">
                        {t.frequency} ({t.frequency_days}d)
                      </td>
                      <td className="p-3 text-center font-bold">
                        {taskActionsMap[t.id]?.length || 0}
                      </td>
                      <td className="p-3">
                        {t.last_completed
                          ? new Date(t.last_completed).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {t.next_due
                          ? new Date(t.next_due).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-1 border-b border-slate-200">
          {(["pm", "history", "overview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === t ? "border-slate-900 text-slate-900 font-extrabold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {t === "pm" ? "PM Tasks" : t}
            </button>
          ))}
        </div>

        <main>
          {activeTab === "pm" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pmTasks.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                  No tasks configured.
                </div>
              ) : (
                pmTasks.map((t) => {
                  const status = getTaskStatus(t.next_due);
                  const badgeClass =
                    status === "Overdue"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : status === "Due Soon"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200";
                  const actionsList = taskActionsMap[t.id] || [];
                  const totalActions = actionsList.length;
                  const remainingActions =
                    totalActions > 3 ? totalActions - 3 : 0;
                  const currentTaskLang = taskLanguages[t.id] || "EN";
                  const currentTaskShift = taskShifts[t.id] || "SHIFT_1";

                  return (
                    <div
                      key={t.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-base text-slate-900">
                            {currentTaskLang === "RO" && t.task_name_ro
                              ? t.task_name_ro
                              : t.task_name}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                              Language:
                            </span>
                            <select
                              value={currentTaskLang}
                              onChange={(e) =>
                                setTaskLanguages((prev) => ({
                                  ...prev,
                                  [t.id]: e.target.value as "EN" | "RO",
                                }))
                              }
                              className="bg-transparent focus:outline-none font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="EN">EN English</option>
                              <option value="RO">RO Română</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                              Shift:
                            </span>
                            <select
                              value={currentTaskShift}
                              onChange={(e) =>
                                setTaskShifts((prev) => ({
                                  ...prev,
                                  [t.id]: e.target.value as
                                    | "SHIFT_1"
                                    | "SHIFT_2"
                                    | "SHIFT_3",
                                }))
                              }
                              className="bg-transparent focus:outline-none font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="SHIFT_1">Shift 1</option>
                              <option value="SHIFT_2">Shift 2</option>
                              <option value="SHIFT_3">Shift 3</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-200/60 pb-1.5">
                            <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                            <span>Checklist Items: {totalActions}</span>
                          </div>
                          {totalActions === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              No checklist actions configured.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {actionsList.slice(0, 3).map((act, idx) => (
                                <p
                                  key={act.id}
                                  className="text-[11px] text-slate-600 font-medium flex items-center gap-2"
                                >
                                  <span className="text-[10px] text-slate-400 font-bold w-3">
                                    {idx + 1}.
                                  </span>
                                  <span className="truncate">
                                    {currentTaskLang === "RO" &&
                                    act.action_description_ro
                                      ? act.action_description_ro
                                      : act.action_description}
                                  </span>
                                </p>
                              ))}
                              {remainingActions > 0 && (
                                <p className="text-[10px] font-bold text-blue-600 bg-blue-50/50 inline-block px-2 py-0.5 rounded mt-0.5">
                                  + {remainingActions} more actions
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-xs bg-slate-50 text-slate-500 p-2.5 rounded-lg border border-slate-100">
                          <strong className="text-slate-700 block mb-0.5">
                            Procedure:
                          </strong>
                          {currentTaskLang === "RO" && t.procedure_ro
                            ? t.procedure_ro
                            : t.procedure ||
                              "Standard industrial preventive check."}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-500">
                          <div>
                            Frequency:{" "}
                            <span className="font-semibold text-slate-700">
                              {t.frequency} ({t.frequency_days}d)
                            </span>
                          </div>
                          <div>
                            Est. Time:{" "}
                            <span className="font-semibold text-slate-700">
                              {t.estimated_time}
                            </span>
                          </div>
                          <div>
                            Responsible:{" "}
                            <span className="font-semibold text-slate-700">
                              {t.responsible}
                            </span>
                          </div>
                          <div>
                            Next Due:{" "}
                            <span className="font-bold text-slate-900">
                              {t.next_due
                                ? new Date(t.next_due).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">
                            Last Completed:{" "}
                            <span className="font-semibold text-slate-700">
                              {t.last_completed
                                ? new Date(
                                    t.last_completed,
                                  ).toLocaleDateString()
                                : "Never"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleCompleteTask(t)}
                          className="rounded-xl bg-slate-900 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 shadow transition disabled:opacity-40"
                        >
                          {actionLoading === t.id
                            ? "Processing..."
                            : "Complete Task"}
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleGenerateWO(t)}
                          className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          <Wrench className="h-3.5 w-3.5" />{" "}
                          {actionLoading === `wo-${t.id}`
                            ? "Generating..."
                            : "Generate WO"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Date</th>
                      <th className="p-4">Assigned Shift</th>
                      <th className="p-4">Result</th>
                      <th className="p-4">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {history.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-slate-400"
                        >
                          No logs on record.
                        </td>
                      </tr>
                    ) : (
                      history.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-medium">
                            {new Date(row.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 uppercase">
                            {row.technician_name}
                          </td>
                          <td className="p-4">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              {row.result}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 max-w-xs truncate">
                            {row.comments || "Routine maintenance performed."}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {[
                  { label: "Fixture Name", val: fixture.fixture_name },
                  { label: "Machine", val: fixture.machine },
                  { label: "Manufacturer", val: fixture.manufacturer },
                  { label: "Fixture Number", val: `#${fixture.fixture_nr}` },
                  { label: "Status", val: fixture.status },
                  {
                    label: "Created Date",
                    val: new Date(fixture.created_at).toLocaleDateString(),
                  },
                ].map((item, idx) => (
                  <div key={idx} className="border-b border-slate-100 pb-2">
                    <p className="text-xs text-slate-400 font-medium">
                      {item.label}
                    </p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {item.val || "N/A"}
                    </p>
                  </div>
                ))}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-slate-400 font-medium">Notes</p>
                  <p className="mt-1 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {fixture.notes || "No notes configured."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
