"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PMTask {
  id: string;
  tool_number: string;
  equipment: string;
  action: string;
  next_due_at: string;
  estimated_time: number | null;
  frequency: string;
}

interface GroupedMachine {
  tool_number: string;
  equipment: string;
  number_of_tasks: number;
  duration_minutes: number;
  planned_day: string;
  selected: boolean;
  frequency: string;
  shift: string;
}

interface MaintenancePlan {
  id: string;
  tool_number: string;
  machine_name: string;
  planned_day: string;
  duration_minutes: number;
  status: string;
  week_number: number;
  year: number;
  shift?: string;
  production_status: "PENDING" | "APPROVED" | "REJECTED";
  production_comment?: string | null;
  approval_token?: string | null;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const FREQUENCY_OPTIONS = ["ALL", "WEEKLY", "MONTHLY", "YEARLY"];
const SHIFT_OPTIONS = ["SHIFT 1", "SHIFT 2", "SHIFT 3"];
const APPROVAL_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];
export default function WeeklyMaintenancePage() {
  const [machines, setMachines] = useState<GroupedMachine[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekNumber, setWeekNumber] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [globalAutoShift, setGlobalAutoShift] = useState("SHIFT 1");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  useEffect(() => {
    const now = new Date();
    const w = getWeekNumber(now);
    const y = now.getFullYear();
    setWeekNumber(w);
    setCurrentYear(y);
    loadData(w, y, frequencyFilter);
  }, []);

  function getWeekNumber(date: Date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }
  function getWeekDateRange(weekNum: number, yr: number) {
    const fourthOfJanuary = new Date(yr, 0, 4);
    const dayOfWeek = fourthOfJanuary.getDay();
    const isoWeek1Monday = new Date(fourthOfJanuary);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    isoWeek1Monday.setDate(fourthOfJanuary.getDate() - daysToSubtract);

    const targetMonday = new Date(isoWeek1Monday);
    targetMonday.setDate(isoWeek1Monday.getDate() + (weekNum - 1) * 7);
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    return {
      weekStart: formatDate(targetMonday),
      weekEnd: formatDate(targetSunday),
    };
  }

  async function loadData(w: number, y: number, freq: string) {
    setLoading(true);
    await Promise.all([loadAvailableTasks(freq), loadCurrentCalendar(w, y)]);
    setLoading(false);
  }

  async function loadAvailableTasks(freq: string) {
    let query = supabase.from("pm_tasks").select("*");
    if (freq === "WEEKLY") query = query.eq("frequency", "1S");
    else if (freq === "MONTHLY")
      query = query.in("frequency", ["1L", "3L", "6L", "12L"]);
    else if (freq === "YEARLY")
      query = query.in("frequency", ["1A", "2A", "3A", "5A"]);

    const { data, error } = await query;
    if (!error && data) {
      const typedData = data as PMTask[];
      const groups: {
        [key: string]: {
          equipment: string;
          count: number;
          totalMinutes: number;
          frequencies: Set<string>;
        };
      } = {};

      typedData.forEach((task) => {
        if (!groups[task.tool_number]) {
          groups[task.tool_number] = {
            equipment: task.equipment || "Unknown",
            count: 0,
            totalMinutes: 0,
            frequencies: new Set<string>(),
          };
        }
        groups[task.tool_number].count += 1;
        groups[task.tool_number].totalMinutes += task.estimated_time || 0;
        if (task.frequency)
          groups[task.tool_number].frequencies.add(task.frequency);
      });

      const groupedArr: GroupedMachine[] = Object.keys(groups)
        .sort()
        .map((toolNum, idx) => ({
          tool_number: toolNum,
          equipment: groups[toolNum].equipment,
          number_of_tasks: groups[toolNum].count,
          duration_minutes: groups[toolNum].totalMinutes,
          planned_day: DAYS_OF_WEEK[idx % DAYS_OF_WEEK.length],
          selected: false,
          frequency:
            Array.from(groups[toolNum].frequencies).join(", ") || "N/A",
          shift: "SHIFT 1",
        }));
      setMachines(groupedArr);
    }
  }
  async function loadCurrentCalendar(w: number, y: number) {
    const { data, error } = await supabase
      .from("weekly_maintenance_plans")
      .select("*")
      .eq("week_number", w)
      .eq("year", y);

    if (!error && data) {
      setCalendarPlans(data as MaintenancePlan[]);
    }
  }

  function handleFilterChange(freq: string) {
    setFrequencyFilter(freq);
    loadData(weekNumber, currentYear, freq);
  }

  function handleCheckboxChange(index: number, checked: boolean) {
    const updated = [...machines];
    updated[index].selected = checked;
    setMachines(updated);
  }

  function handleSelectAllChange(checked: boolean) {
    setMachines(
      machines.map((m) => {
        if (calendarPlans.some((p) => p.tool_number === m.tool_number))
          return m;
        return { ...m, selected: checked };
      }),
    );
  }

  function handleDurationChange(index: number, val: number) {
    const updated = [...machines];
    updated[index].duration_minutes = val;
    setMachines(updated);
  }

  function handleDayChange(index: number, val: string) {
    const updated = [...machines];
    updated[index].planned_day = val;
    setMachines(updated);
  }

  function handleShiftChange(index: number, val: string) {
    const updated = [...machines];
    updated[index].shift = val;
    setMachines(updated);
  }

  // NOU: Generare Token Aleatoriu Securizat și actualizare planuri
  async function sendToProduction() {
    if (calendarPlans.length === 0) {
      alert("Nu există utilaje planificate pentru această săptămână.");
      return;
    }

    const randomToken =
      "tok_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .update({ approval_token: randomToken })
      .eq("week_number", weekNumber)
      .eq("year", currentYear);

    if (!error) {
      const url = `https://vercel.app{randomToken}`;
      setShareUrl(url);
      setShowShareModal(true);
      await loadCurrentCalendar(weekNumber, currentYear);
    } else {
      alert(`Eroare la securizarea link-ului: ${error.message}`);
    }
  }
  async function clearPlan() {
    if (
      !confirm(
        `Sigur dorești să ștergi planul pentru Săptămâna ${weekNumber}, ${currentYear}?`,
      )
    )
      return;
    setLoading(true);
    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .delete()
      .eq("week_number", weekNumber)
      .eq("year", currentYear);
    setLoading(false);
    if (!error) {
      setCalendarPlans([]);
      alert("Plan șters.");
    }
  }

  async function autoGeneratePlan() {
    setLoading(true);
    try {
      await supabase
        .from("weekly_maintenance_plans")
        .delete()
        .eq("week_number", weekNumber)
        .eq("year", currentYear);
      const { weekStart, weekEnd } = getWeekDateRange(weekNumber, currentYear);
      const { data: pmTasks } = await supabase
        .from("pm_tasks")
        .select("*")
        .gte("next_due_at", `${weekStart}T00:00:00.000Z`)
        .lte("next_due_at", `${weekEnd}T23:59:59.999Z`);

      if (!pmTasks || pmTasks.length === 0) {
        setLoading(false);
        alert("Niciun PM scadent.");
        return;
      }
      const groups: {
        [key: string]: {
          equipment: string;
          count: number;
          totalMinutes: number;
        };
      } = {};
      pmTasks.forEach((t: any) => {
        if (!groups[t.tool_number])
          groups[t.tool_number] = {
            equipment: t.equipment || "Unknown",
            count: 0,
            totalMinutes: 0,
          };
        groups[t.tool_number].count++;
        groups[t.tool_number].totalMinutes += t.estimated_time || 0;
      });

      const records = Object.keys(groups)
        .sort()
        .map((toolNum, idx) => ({
          week_number: weekNumber,
          year: currentYear,
          planned_day: DAYS_OF_WEEK[idx % DAYS_OF_WEEK.length],
          tool_number: toolNum,
          machine_name: groups[toolNum].equipment,
          action: `Auto Generated Plan (${groups[toolNum].count} tasks)`,
          duration_minutes: groups[toolNum].totalMinutes,
          status: "PENDING",
          production_status: "PENDING",
          shift: globalAutoShift,
        }));

      await supabase.from("weekly_maintenance_plans").insert(records);
      await loadCurrentCalendar(weekNumber, currentYear);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }
  async function manualGeneratePlan() {
    const validSelected = machines.filter(
      (m) =>
        m.selected &&
        !calendarPlans.some((p) => p.tool_number === m.tool_number),
    );
    if (validSelected.length === 0) return;

    setLoading(true);
    const records = validSelected.map((m) => ({
      week_number: weekNumber,
      year: currentYear,
      planned_day: m.planned_day,
      tool_number: m.tool_number,
      machine_name: m.equipment,
      action: `Manual PM Plan (${m.number_of_tasks} tasks)`,
      duration_minutes: m.duration_minutes,
      status: "PENDING",
      production_status: "PENDING",
      shift: m.shift,
    }));

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .insert(records);
    if (!error) {
      await loadCurrentCalendar(weekNumber, currentYear);
      setMachines((prev) =>
        prev.map((m) => (m.selected ? { ...m, selected: false } : m)),
      );
    }
    setLoading(false);
  }

  async function updatePlannedDay(planId: string, targetDay: string) {
    const previousState = [...calendarPlans];
    setCalendarPlans((prev) =>
      prev.map((p) =>
        String(p.id) === planId ? { ...p, planned_day: targetDay } : p,
      ),
    );

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .update({ planned_day: targetDay })
      .eq("id", Number(planId));
    if (error) {
      setCalendarPlans(previousState);
    }
  }

  async function deletePlanTask(planId: string) {
    if (!confirm("Sigur dorești să ștergi acest utilaj?")) return;
    setCalendarPlans((prev) => prev.filter((p) => String(p.id) !== planId));
    await supabase
      .from("weekly_maintenance_plans")
      .delete()
      .eq("id", Number(planId));
    await loadCurrentCalendar(weekNumber, currentYear);
  }

  function handleDragStart(e: DragStartEvent) {
    console.log("Drag Start", e.active);
  }
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const planId = String(active.id);
    const targetDay = String(over.id);
    const dragged = calendarPlans.find((p) => String(p.id) === planId);
    if (dragged && dragged.planned_day !== targetDay)
      updatePlannedDay(planId, targetDay);
  }
  function getDateFromPlannedDay(
    weekNum: number,
    yr: number,
    plannedDay: string,
  ): string {
    const fourthOfJanuary = new Date(yr, 0, 4);
    const dayOfWeek = fourthOfJanuary.getDay();
    const isoWeek1Monday = new Date(fourthOfJanuary);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    isoWeek1Monday.setDate(fourthOfJanuary.getDate() - daysToSubtract);
    const targetMonday = new Date(isoWeek1Monday);
    targetMonday.setDate(isoWeek1Monday.getDate() + (weekNum - 1) * 7);
    const dayOffsets: { [key: string]: number } = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };
    const offset = dayOffsets[plannedDay.toUpperCase()] ?? 0;
    const actualDate = new Date(targetMonday);
    actualDate.setDate(targetMonday.getDate() + offset);
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
    return `${String(actualDate.getDate()).padStart(2, "0")}-${months[actualDate.getMonth()]}-${actualDate.getFullYear()}`;
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(15, 23, 42);
    doc.text("WEEKLY PREVENTIVE MAINTENANCE REQUEST", 14, 20);
    doc.setFontSize(12).setTextColor(71, 85, 105);
    doc.text(`Week ${weekNumber} / ${currentYear}`, 14, 27);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(10)
      .setTextColor(100, 116, 139);
    doc.text(
      "Please review the proposed downtime windows and confirm machine availability.",
      14,
      33,
    );
    doc.setDrawColor(226, 232, 240).setLineWidth(0.5).line(14, 37, 196, 37);

    const body = [...calendarPlans]
      .sort(
        (a, b) =>
          DAYS_OF_WEEK.indexOf(a.planned_day) -
          DAYS_OF_WEEK.indexOf(b.planned_day),
      )
      .map((p) => [
        getDateFromPlannedDay(weekNumber, currentYear, p.planned_day),
        p.shift || "SHIFT 1",
        p.tool_number,
        p.machine_name || "N/A",
        `${p.duration_minutes} min`,
        "  [  ] OK   [  ] REJ",
      ]);

    autoTable(doc, {
      startY: 43,
      head: [
        [
          "Date",
          "Shift",
          "Machine ID",
          "Equipment",
          "Duration (min)",
          "Production Confirmation",
        ],
      ],
      body: body,
      headStyles: {
        fillColor: "#0F172A",
        textColor: "#FFFFFF",
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9, textColor: "#334155" },
      alternateRowStyles: { fillColor: "#F8FAFC" },
      margin: { top: 40, left: 14, right: 14 },
      theme: "striped",
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(248, 250, 252).rect(14, currentY, 182, 16, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(15, 23, 42);
    doc.text(
      `Total Planned Machines: ${calendarPlans.length}`,
      20,
      currentY + 10,
    );
    doc.text(
      `Total Planned Downtime: ${calendarPlans.reduce((sum, p) => sum + p.duration_minutes, 0)} min`,
      110,
      currentY + 10,
    );

    currentY += 26;
    doc.text("Production Comments", 14, currentY);
    doc.setFont("helvetica", "normal").setTextColor(148, 163, 184);
    doc.text(
      "_________________________________________________________________________________",
      14,
      currentY + 8,
    );
    doc.text(
      "_________________________________________________________________________________",
      14,
      currentY + 18,
    );

    currentY += 44;
    doc.setFont("helvetica", "bold").setTextColor(51, 65, 85);
    doc.text("Confirmed by: __________________________", 14, currentY);
    doc.text("Date: _________________________________", 115, currentY);
    doc.save(`Production_Downtime_Request_W${weekNumber}_${currentYear}.pdf`);
  }

  // REPARAT: Logica de indexare TypeScript corectă utilizând mapare pe vectorul de frecvențe
  function renderFrequencyBadge(freqString: string, currentFilter: string) {
    const freqs = freqString ? freqString.split(", ") : [];
    if (freqs.length === 0)
      return (
        <span className="text-[11px] font-medium text-slate-400 italic">
          N/A
        </span>
      );

    const mapping: { [key: string]: { label: string; style: string } } = {
      "1S": {
        label: "Weekly",
        style: "bg-blue-50 text-blue-700 border-blue-200",
      },
      "1L": {
        label: "Monthly",
        style: "bg-amber-50 text-amber-700 border-amber-200",
      },
      "3L": {
        label: "3 Months",
        style: "bg-amber-50 text-amber-700 border-amber-200",
      },
      "6L": {
        label: "6 Months",
        style: "bg-amber-50 text-amber-700 border-amber-200",
      },
      "12L": {
        label: "12 Months",
        style: "bg-amber-50 text-amber-700 border-amber-200",
      },
      "1A": {
        label: "1 Year",
        style: "bg-purple-50 text-purple-700 border-purple-200",
      },
    };

    return (
      <div className="flex flex-wrap gap-1">
        {freqs.map((f) => {
          const config = mapping[f] || {
            label: f,
            style: "bg-slate-100 text-slate-800 border-slate-200",
          };
          return (
            <span
              key={f}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border tracking-wide whitespace-nowrap ${config.style}`}
            >
              {config.label}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Weekly Preventive Maintenance Planner
          </h1>
          <div className="flex flex-wrap items-center gap-6 mt-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <span>Week:</span>
                <input
                  type="number"
                  value={weekNumber}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    setWeekNumber(w);
                    loadData(w, currentYear, frequencyFilter);
                  }}
                  className="w-14 border rounded px-1.5 py-0.5 text-center font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <span>Year:</span>
                <input
                  type="number"
                  value={currentYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setCurrentYear(y);
                    loadData(weekNumber, y, frequencyFilter);
                  }}
                  className="w-20 border rounded px-1.5 py-0.5 text-center font-bold"
                />
              </div>
            </div>
            <div className="inline-flex rounded-lg border bg-slate-100 p-0.5 shadow-sm">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleFilterChange(opt)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${frequencyFilter === opt ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg border bg-slate-100 p-0.5 shadow-sm">
              <span className="text-xs text-slate-400 self-center px-2">
                Approval View:
              </span>
              {APPROVAL_FILTERS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setApprovalFilter(opt)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${approvalFilter === opt ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={globalAutoShift}
            onChange={(e) => setGlobalAutoShift(e.target.value)}
            className="border rounded-lg p-2 text-sm bg-white font-semibold shadow-sm"
          >
            {SHIFT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={autoGeneratePlan}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
          >
            🤖 Auto Plan
          </button>
          <button
            onClick={manualGeneratePlan}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
          >
            ✍️ Manual Plan
          </button>
          <button
            onClick={exportPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={sendToProduction}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
          >
            📧 Send To Production
          </button>
          <button
            onClick={clearPlan}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm text-sm"
          >
            Clear
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-slate-500 animate-pulse">Loading data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-700 text-xs font-semibold uppercase">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAllChange(e.target.checked)}
                    />
                  </th>
                  <th className="py-3 px-4">Tool</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4 text-center">Tasks</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4 w-24">Duration</th>
                  <th className="py-3 px-4 w-32">Shift</th>
                  <th className="py-3 px-4 w-32">Day</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-slate-700">
                {machines.map((machine, index) => {
                  const isAlreadyPlanned = calendarPlans.some(
                    (p) => p.tool_number === machine.tool_number,
                  );
                  const planData = calendarPlans.find(
                    (p) => p.tool_number === machine.tool_number,
                  );

                  if (
                    approvalFilter !== "ALL" &&
                    planData?.production_status !== approvalFilter
                  ) {
                    if (!(approvalFilter === "PENDING" && !isAlreadyPlanned))
                      return null;
                  }

                  return (
                    <tr
                      key={machine.tool_number}
                      className={
                        isAlreadyPlanned ? "bg-emerald-50" : "hover:bg-slate-50"
                      }
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isAlreadyPlanned ? true : machine.selected}
                          disabled={isAlreadyPlanned}
                          onChange={(e) =>
                            handleCheckboxChange(index, e.target.checked)
                          }
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {machine.tool_number}
                      </td>
                      <td className="py-3.5 px-4">{machine.equipment}</td>
                      <td className="py-3.5 px-4 text-center">
                        {machine.number_of_tasks}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderFrequencyBadge(
                          machine.frequency,
                          frequencyFilter,
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          value={machine.duration_minutes}
                          disabled={isAlreadyPlanned}
                          onChange={(e) =>
                            handleDurationChange(index, Number(e.target.value))
                          }
                          className="w-full border rounded text-center"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={planData?.shift || machine.shift}
                          disabled={isAlreadyPlanned}
                          onChange={(e) =>
                            handleShiftChange(index, e.target.value)
                          }
                          className="w-full border rounded"
                        >
                          {SHIFT_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={planData?.planned_day || machine.planned_day}
                          disabled={isAlreadyPlanned}
                          onChange={(e) =>
                            handleDayChange(index, e.target.value)
                          }
                          className="w-full border rounded"
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 self-start">
            <h2 className="text-xl font-bold text-slate-900 mb-5 border-b pb-3">
              📅 Weekly Calendar
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                {DAYS_OF_WEEK.map((day) => {
                  const dayPlans = calendarPlans.filter(
                    (p) =>
                      String(p.planned_day).trim().toUpperCase() ===
                      day.toUpperCase(),
                  );
                  return (
                    <DroppableContainer key={day} id={day} label={day}>
                      {dayPlans.map((plan) => (
                        <DraggableCard
                          key={plan.id}
                          id={plan.id}
                          toolNumber={plan.tool_number}
                          duration={plan.duration_minutes}
                          shift={plan.shift}
                          status={plan.production_status}
                          onDelete={deletePlanTask}
                        />
                      ))}
                    </DroppableContainer>
                  );
                })}
              </div>
            </DndContext>
          </div>
        </div>
      )}

      {/* MODAL NOU: Partajare Link Public Securizat cu Token */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="text-center mb-4">
              <span className="text-3xl">🔒</span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Link de Aprobare Securizat
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Producția va accesa doar tabelul izolat, fără meniuri interne.
              </p>
            </div>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full border p-2.5 rounded-lg text-xs bg-slate-50 font-mono mb-4 text-blue-600 select-all font-bold text-center"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link public copiat!");
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
              >
                Copiază URL
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableContainer({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: String(id) });
  return (
    <div
      ref={setNodeRef}
      className={`p-2.5 rounded-xl border min-h-[120px] transition-colors ${isOver ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
    >
      <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
        {label}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DraggableCard({
  id,
  toolNumber,
  duration,
  shift,
  status,
  onDelete,
}: {
  id: string;
  toolNumber: string;
  duration: number;
  shift?: string;
  status?: string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: String(id) });
  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
  };
  const icons: { [key: string]: string } = {
    APPROVED: "🟢",
    REJECTED: "🔴",
    PENDING: "🟡",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex justify-between items-center text-sm bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border transition-all select-none cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30 scale-95 shadow-none" : "shadow-sm border-slate-200"}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
        >
          ✕
        </button>
        <span className="font-mono font-black text-slate-800 tracking-tight">
          {toolNumber}
        </span>
        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-bold">
          {shift?.replace("SHIFT ", "S") || "S1"}
        </span>
        <span title={`Status: ${status || "PENDING"}`} className="text-xs">
          {icons[status || "PENDING"]}
        </span>
      </div>
      <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
        {duration}m
      </span>
    </div>
  );
}
