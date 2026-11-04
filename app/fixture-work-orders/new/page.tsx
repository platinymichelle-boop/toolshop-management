"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Layers,
  Clock,
  ShieldAlert,
  Users,
  Building2,
  Cpu,
  CheckCircle,
  ClipboardList,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface Fixture {
  id: string;
  fixture_name: string;
  machine: string;
  manufacturer: string;
  fixture_nr: number;
}

interface PMTask {
  id: string;
  task_name: string;
  task_name_ro?: string | null;
  frequency: string;
  estimated_time?: string | number | null;
  last_completed?: string | null;
  next_due?: string | null;
}

export default function NewFixtureWorkOrder() {
  const router = useRouter();

  // Core States
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [previewTasks, setPreviewTasks] = useState<PMTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // KPI States
  const [kpiTotalFixtures, setKpiTotalFixtures] = useState<number>(0);
  const [kpiMonthlyTasks, setKpiMonthlyTasks] = useState<number>(0);
  const [kpiYearlyTasks, setKpiYearlyTasks] = useState<number>(0);
  const [kpiOpenWOs, setKpiOpenWOs] = useState<number>(0);

  // Contextual Fixture Stats States
  const [fixtureOpenWOsCount, setFixtureOpenWOsCount] = useState<number>(0);

  // Form Cascading States
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");

  // Parameter States
  const [selectedFrequency, setSelectedFrequency] = useState<
    "Monthly" | "Yearly"
  >("Monthly");
  const [selectedShift, setSelectedShift] = useState<
    "Shift 1" | "Shift 2" | "Shift 3"
  >("Shift 1");
  const [selectedPriority, setSelectedPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("MEDIUM");
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Preluare date KPI globale
      const { count: countFix } = await supabase
        .from("fixtures")
        .select("*", { count: "exact", head: true });
      setKpiTotalFixtures(countFix || 0);

      const { count: countMonthly } = await supabase
        .from("fixture_pm_tasks")
        .select("*", { count: "exact", head: true })
        .eq("frequency", "Monthly");
      setKpiMonthlyTasks(countMonthly || 0);

      const { count: countYearly } = await supabase
        .from("fixture_pm_tasks")
        .select("*", { count: "exact", head: true })
        .eq("frequency", "Yearly");
      setKpiYearlyTasks(countYearly || 0);

      const { count: countWOs } = await supabase
        .from("fixture_work_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN");
      setKpiOpenWOs(countWOs || 0);

      // 2. Încărcare listă completă de dispozitive
      const { data, error: fetchErr } = await supabase
        .from("fixtures")
        .select("id, fixture_name, machine, manufacturer, fixture_nr")
        .order("manufacturer", { ascending: true })
        .order("machine", { ascending: true })
        .order("fixture_name", { ascending: true });

      if (fetchErr) throw fetchErr;
      const fixtureData = data || [];
      setFixtures(fixtureData);

      // 3. Inițializare selectoare cascadate
      if (fixtureData.length > 0) {
        const firstMfg = fixtureData[0].manufacturer || "";
        setSelectedManufacturer(firstMfg);

        const machinesForMfg = fixtureData.filter(
          (f) => f.manufacturer === firstMfg,
        );
        if (machinesForMfg.length > 0) {
          const firstMac = machinesForMfg[0].machine || "";
          setSelectedMachine(firstMac);

          const fixturesForMac = machinesForMfg.filter(
            (f) => f.machine === firstMac,
          );
          if (fixturesForMac.length > 0) {
            setSelectedFixtureId(fixturesForMac[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error("Error loading initial CMMS configuration:", err);
      setError(
        err.message ||
          "A apărut o eroare la inițializarea configuratorului industrial.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  // Liste unice calculate dinamic pentru structura dependentă a formularului
  const manufacturers = useMemo(() => {
    const list = fixtures.map((f) => f.manufacturer).filter(Boolean);
    return Array.from(new Set(list));
  }, [fixtures]);

  const machines = useMemo(() => {
    if (!selectedManufacturer) return [];
    const list = fixtures
      .filter((f) => f.manufacturer === selectedManufacturer)
      .map((f) => f.machine)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [fixtures, selectedManufacturer]);

  const filteredFixturesList = useMemo(() => {
    if (!selectedManufacturer || !selectedMachine) return [];
    return fixtures.filter(
      (f) =>
        f.manufacturer === selectedManufacturer &&
        f.machine === selectedMachine,
    );
  }, [fixtures, selectedManufacturer, selectedMachine]);

  const activeSelectedFixture = useMemo(() => {
    return fixtures.find((f) => f.id === selectedFixtureId) || null;
  }, [fixtures, selectedFixtureId]);

  // Efect pentru încărcarea datelor contextuale specifice dispozitivului selectat
  useEffect(() => {
    const fetchFixtureSpecificContext = async () => {
      if (!selectedFixtureId) {
        setPreviewTasks([]);
        setFixtureOpenWOsCount(0);
        return;
      }
      setPreviewLoading(true);
      try {
        // Citire task-uri și informații despre datele PM (last_completed, next_due)
        const { data: tasksData, error: taskErr } = await supabase
          .from("fixture_pm_tasks")
          .select(
            "id, task_name, task_name_ro, frequency, estimated_time, last_completed, next_due",
          )
          .eq("fixture_id", selectedFixtureId)
          .eq("frequency", selectedFrequency);

        if (taskErr) throw taskErr;
        setPreviewTasks(tasksData || []);

        // Verificare ordine de lucru OPEN pentru acest fixture selectat
        const { count: openWOsCount, error: woCountErr } = await supabase
          .from("fixture_work_orders")
          .select("*", { count: "exact", head: true })
          .eq("fixture_id", selectedFixtureId)
          .eq("status", "OPEN");

        if (woCountErr) throw woCountErr;
        setFixtureOpenWOsCount(openWOsCount || 0);
      } catch (err) {
        console.error("Failed to load fixture premium contextual data:", err);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchFixtureSpecificContext();
  }, [selectedFixtureId, selectedFrequency]);
  // Calculare istoric date PM (Sursa: fixture_pm_tasks)
  const pmDatesInfo = useMemo(() => {
    if (previewTasks.length === 0) {
      return { lastPM: "Never", nextDue: "Not Scheduled" };
    }

    // Identificăm cele mai relevante date din rândul sarcinilor încărcate
    let latestCompleted: Date | null = null;
    let earliestNextDue: Date | null = null;

    previewTasks.forEach((t) => {
      if (t.last_completed) {
        const d = new Date(t.last_completed);
        if (!latestCompleted || d > latestCompleted) latestCompleted = d;
      }
      if (t.next_due) {
        const d = new Date(t.next_due);
        if (!earliestNextDue || d < earliestNextDue) earliestNextDue = d;
      }
    });

    const formatDate = (date: Date | null, fallback: string) => {
      if (!date || isNaN(date.getTime())) return fallback;
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
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    return {
      lastPM: formatDate(latestCompleted, "Never"),
      nextDue: formatDate(earliestNextDue, "Not Scheduled"),
    };
  }, [previewTasks]);

  // Calculare timp total estimat din preview task-uri
  const totalEstimatedTime = useMemo(() => {
    return previewTasks.reduce((sum, task) => {
      const time = parseInt(String(task.estimated_time || "0"), 10);
      return sum + (isNaN(time) ? 0 : time);
    }, 0);
  }, [previewTasks]);

  const generateWorkOrderNumber = async (): Promise<string> => {
    try {
      const { data, error: countErr } = await supabase
        .from("fixture_work_orders")
        .select("wo_number")
        .order("created_at", { ascending: false })
        .limit(1);

      if (countErr) throw countErr;

      if (data && data.length > 0 && data[0].wo_number) {
        const lastNumStr = data[0].wo_number.replace("FWO-", "");
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          return `FWO-${String(lastNum + 1).padStart(6, "0")}`;
        }
      }
      return "FWO-000001";
    } catch (err) {
      console.error("Error generating WO sequential number:", err);
      return `FWO-${String(Math.floor(100000 + Math.random() * 900000))}`;
    }
  };
  const handleGenerateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFixtureId) {
      setError("Selectați un dispozitiv valid pentru generare.");
      return;
    }
    if (previewTasks.length === 0) {
      setError(
        `Nu se pot genera ordine de lucru. Zero sarcini definite pentru frecvența ${selectedFrequency}.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const currentFixture = fixtures.find((f) => f.id === selectedFixtureId);
      const woNumber = await generateWorkOrderNumber();
      const teamCode = selectedShift.toUpperCase().replace(" ", "_");
      const todayISO = new Date().toISOString().split("T")[0];

      // Înregistrare în tabela principală fixture_work_orders
      const { data: newWO, error: woInsertErr } = await supabase
        .from("fixture_work_orders")
        .insert({
          wo_number: woNumber,
          fixture_id: selectedFixtureId,
          tool_number: currentFixture?.machine || "N/A",
          tool_name: currentFixture?.fixture_name || "N/A",
          status: "OPEN",
          priority: selectedPriority,
          created_by: selectedShift,
          team_code: teamCode,
          source: "PREVENTIVE_MANUAL",
          scheduled_date: todayISO,
          actions_count: previewTasks.length,
        })
        .select("id")
        .single();

      if (woInsertErr) throw woInsertErr;
      if (!newWO?.id)
        throw new Error("ID-ul uneltelor generate lipsește din baza de date.");

      // Batch insert în tabela de legătură fixture_work_order_tasks
      const taskInsertRows = previewTasks.map((task) => ({
        fixture_work_order_id: newWO.id,
        fixture_pm_task_id: task.id,
        task_name: task.task_name,
        task_name_ro: task.task_name_ro || task.task_name,
        is_completed: false,
        frequency: task.frequency,
      }));

      const { error: batchErr } = await supabase
        .from("fixture_work_order_tasks")
        .insert(taskInsertRows);

      if (batchErr) throw batchErr;

      router.push(`/fixture-work-orders/${newWO.id}`);
    } catch (err: any) {
      console.error("CMMS transaction batch execution failed:", err);
      setError(
        err.message ||
          "Eroare structurală la generarea ordinului și popularea checklist-ului.",
      );
      setSubmitting(false);
    }
  };
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
      <div>
        <Link
          href="/fixture-work-orders/list"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Fixture Work Orders
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl flex items-start gap-2 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* PANOU METRICI KPI COMPACT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Fixtures",
            val: kpiTotalFixtures,
            icon: <Layers className="w-5 h-5" />,
            color: "bg-slate-100 text-slate-600",
          },
          {
            label: "Total Monthly Tasks",
            val: kpiMonthlyTasks,
            icon: <Clock className="w-5 h-5" />,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Total Yearly Tasks",
            val: kpiYearlyTasks,
            icon: <Wrench className="w-5 h-5" />,
            color: "bg-purple-50 text-purple-600",
          },
          {
            label: "Open Work Orders",
            val: kpiOpenWOs,
            icon: <ShieldAlert className="w-5 h-5" />,
            color: "bg-amber-50 text-amber-600",
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
                <p className="text-xl font-extrabold text-slate-900">
                  {item.val}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Fixture Preventive Maintenance Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Configurați parametrii necesari pentru eliberarea unui nou ordin de
          lucru preventiv în flux tranzacțional.
        </p>
      </div>
      {loading ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 animate-pulse">
          <div className="h-10 bg-slate-100 rounded w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-10 bg-slate-100 rounded w-full" />
            <div className="h-10 bg-slate-100 rounded w-full" />
            <div className="h-10 bg-slate-100 rounded w-full" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECȚIUNEA 1 & 7: FORMULAR PARAMETRII CMMS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />{" "}
                  Manufacturer
                </label>
                <select
                  value={selectedManufacturer}
                  onChange={(e) => {
                    const mfg = e.target.value;
                    setSelectedManufacturer(mfg);
                    const filteredMac = fixtures.filter(
                      (f) => f.manufacturer === mfg,
                    );
                    if (filteredMac.length > 0) {
                      setSelectedMachine(filteredMac[0].machine);
                      const filteredFix = filteredMac.filter(
                        (f) => f.machine === filteredMac[0].machine,
                      );
                      setSelectedFixtureId(
                        filteredFix.length > 0 ? filteredFix[0].id : "",
                      );
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white cursor-pointer"
                >
                  {manufacturers.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" /> Machine Code
                </label>
                <select
                  value={selectedMachine}
                  onChange={(e) => {
                    const mac = e.target.value;
                    setSelectedMachine(mac);
                    const filteredFix = fixtures.filter(
                      (f) =>
                        f.manufacturer === selectedManufacturer &&
                        f.machine === mac,
                    );
                    setSelectedFixtureId(
                      filteredFix.length > 0 ? filteredFix[0].id : "",
                    );
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white cursor-pointer"
                >
                  {machines.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Fixture
                  Model
                </label>
                <select
                  value={selectedFixtureId}
                  onChange={(e) => setSelectedFixtureId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white cursor-pointer"
                >
                  {filteredFixturesList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fixture_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Frequency
                </label>
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="Monthly">Monthly PM</option>
                  <option value="Yearly">Yearly PM</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Assigned
                  Shift
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />{" "}
                  Priority Level
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
          </div>
          {/* SECȚIUNEA 1, 2, 3, 4, 5, 6 & 8: WORK ORDER PREVIEW WIZARD STRUCT */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  Work Order Preview
                </h3>
              </div>

              {/* SECȚIUNEA 2: BADGE MARE PENTRU FREQUENCY */}
              <span
                className={`px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                  selectedFrequency === "Monthly"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {selectedFrequency === "Monthly" ? "MONTHLY PM" : "YEARLY PM"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* SECȚIUNEA 7: FIXTURE INFORMATION CARD */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Fixture Information
                </h4>
                <div className="space-y-1.5 font-medium text-slate-700">
                  <p>
                    Fixture:{" "}
                    <span className="font-bold text-slate-900">
                      {activeSelectedFixture?.fixture_name || "N/A"}
                    </span>
                  </p>
                  <p>
                    Machine:{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedMachine || "N/A"}
                    </span>
                  </p>
                  <p>
                    Manufacturer:{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedManufacturer || "N/A"}
                    </span>
                  </p>
                  <p>
                    Fixture Number:{" "}
                    <span className="font-semibold text-slate-900">
                      #{activeSelectedFixture?.fixture_nr ?? "N/A"}
                    </span>
                  </p>
                </div>
              </div>

              {/* SECȚIUNEA 3, 4 & 5: WORK ORDER SUMMARY, LAST PM & OPEN WOs */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Work Order Summary
                </h4>
                <div className="space-y-1.5 font-medium text-slate-700">
                  <p>
                    Frequency:{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedFrequency} PM
                    </span>
                  </p>
                  <p>
                    Tasks:{" "}
                    <span className="font-bold text-slate-900">
                      {previewTasks.length}
                    </span>
                  </p>
                  <p>
                    Estimated Time:{" "}
                    <span className="font-semibold text-slate-900">
                      {totalEstimatedTime} min
                    </span>
                  </p>
                  <p>
                    Priority:{" "}
                    <span className="font-semibold text-slate-900 capitalize">
                      {selectedPriority.toLowerCase()}
                    </span>
                  </p>
                  <p>
                    Assigned Shift:{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedShift}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> CMMS Context & Logs
                </h4>
                <div className="space-y-1.5 font-medium text-slate-700">
                  <p>
                    Last PM:{" "}
                    <span className="font-semibold text-slate-900">
                      {pmDatesInfo.lastPM}
                    </span>
                  </p>
                  <p>
                    Next Due:{" "}
                    <span className="font-semibold text-slate-900">
                      {pmDatesInfo.nextDue}
                    </span>
                  </p>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span>Open Work Orders:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fixtureOpenWOsCount > 0
                          ? "bg-rose-500 text-white font-extrabold animate-pulse"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {fixtureOpenWOsCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* SECȚIUNEA 6: TASKS INCLUDED CONTAINER */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {selectedFrequency === "Monthly"
                    ? "MONTHLY TASKS"
                    : "YEARLY TASKS"}{" "}
                  ({previewTasks.length})
                </span>
                <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-3 max-h-[250px] overflow-y-auto space-y-2">
                  {previewLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-3 bg-slate-100 rounded w-5/6" />
                    </div>
                  ) : previewTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nu există sarcini definite pentru criteriile selectate.
                    </p>
                  ) : (
                    previewTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 text-xs text-slate-600 font-semibold bg-white p-2 border border-slate-100 rounded-lg shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                        <span className="truncate">{task.task_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECȚIUNEA 8: PREGĂTIRE PENTRU IMAGINI (PLACEHOLDER VIZUAL) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Fixture Photo
                </span>
                <div className="h-[180px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4">
                  <ImageIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <span className="text-xs font-medium text-slate-400 select-none">
                    No Fixture Image
                  </span>
                </div>
              </div>
            </div>

            {/* SECȚIUNEA 9: TEXT CONFIRMARE GENERATE */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800 shadow-inner">
              <div className="text-xs space-y-0.5 font-medium text-slate-300">
                <p>You are about to generate:</p>
                <p className="text-sm font-bold text-white">
                  {selectedFrequency} PM Work Order for{" "}
                  <span className="text-blue-400 underline decoration-dotted">
                    {activeSelectedFixture?.fixture_name || "N/A"}
                  </span>
                </p>
                <p>
                  containing{" "}
                  <span className="font-bold text-white">
                    {previewTasks.length} technological tasks
                  </span>
                  .
                </p>
              </div>

              <button
                onClick={handleGenerateWorkOrder}
                disabled={submitting || previewTasks.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg shadow-md transition-colors text-xs font-extrabold uppercase tracking-wider disabled:opacity-40 shrink-0"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wrench className="w-3.5 h-3.5" />
                )}
                <span>Release Work Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
