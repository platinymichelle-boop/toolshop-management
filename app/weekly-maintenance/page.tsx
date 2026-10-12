"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PMTask {
  id: string;
  tool_number: string;
  equipment: string;
  action: string;
  next_due_at: string;
  estimated_minutes: number | null;
}

interface GroupedMachine {
  tool_number: string;
  equipment: string;
  number_of_tasks: number;
  duration_minutes: number;
  planned_day: string;
  selected: boolean;
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
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export default function WeeklyMaintenancePage() {
  const [machines, setMachines] = useState<GroupedMachine[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekNumber, setWeekNumber] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);

  useEffect(() => {
    const now = new Date();
    const w = getWeekNumber(now);
    const y = now.getFullYear();
    setWeekNumber(w);
    setCurrentYear(y);
    loadData(w, y);
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

  async function loadData(w: number, y: number) {
    setLoading(true);
    await Promise.all([loadAvailableTasks(), loadCurrentCalendar(w, y)]);
    setLoading(false);
  }

  async function loadAvailableTasks() {
    const { data, error } = await supabase
      .from("pm_tasks")
      .select("*")
      .lte("next_due_at", new Date().toISOString());

    if (!error && data) {
      const typedData = data as PMTask[];
      const groups: {
        [key: string]: {
          equipment: string;
          count: number;
          totalMinutes: number;
        };
      } = {};

      typedData.forEach((task) => {
        if (!groups[task.tool_number]) {
          groups[task.tool_number] = {
            equipment: task.equipment || "Unknown",
            count: 0,
            totalMinutes: 0,
          };
        }
        groups[task.tool_number].count += 1;
        groups[task.tool_number].totalMinutes += task.estimated_minutes || 0;
      });

      const groupedArr: GroupedMachine[] = Object.keys(groups).map(
        (toolNum) => ({
          tool_number: toolNum,
          equipment: groups[toolNum].equipment,
          number_of_tasks: groups[toolNum].count,
          duration_minutes: groups[toolNum].totalMinutes,
          planned_day: "MONDAY",
          selected: false,
        }),
      );

      groupedArr.sort((a, b) => a.tool_number.localeCompare(b.tool_number));
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

  function handleCheckboxChange(index: number, checked: boolean) {
    const updated = [...machines];
    updated[index].selected = checked;
    setMachines(updated);
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

  async function clearPlan() {
    if (
      !confirm(
        `Sigur dorești să ștergi întregul plan pentru Săptămâna ${weekNumber}, ${currentYear}?`,
      )
    ) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .delete()
      .eq("week_number", weekNumber)
      .eq("year", currentYear);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setCalendarPlans([]);
    alert("Planul selectat a fost șters cu succes.");
  }

  async function savePlan() {
    const selected = machines.filter((m) => m.selected);

    const alreadyPlannedTools = calendarPlans.map((p) => p.tool_number);
    const validSelected = selected.filter(
      (m) => !alreadyPlannedTools.includes(m.tool_number),
    );

    if (validSelected.length === 0) {
      alert("Selectează cel puțin un utilaj nou care nu este deja planificat.");
      return;
    }

    setLoading(true);

    const records = validSelected.map((m) => ({
      tool_id: null,
      pm_task_id: null,
      week_number: weekNumber,
      year: currentYear,
      planned_day: m.planned_day,
      tool_number: m.tool_number,
      machine_name: m.equipment,
      action: `Weekly Shutdown Maintenance (${m.number_of_tasks} tasks)`,
      duration_minutes: m.duration_minutes,
      status: "PENDING",
      production_status: "PENDING",
    }));

    const { error: insertError } = await supabase
      .from("weekly_maintenance_plans")
      .insert(records);

    if (insertError) {
      setLoading(false);
      alert(insertError.message);
      return;
    }

    alert("Utilajele selectate au fost adăugate în plan!");
    await loadCurrentCalendar(weekNumber, currentYear);

    setMachines((prev) =>
      prev.map((m) => (m.selected ? { ...m, selected: false } : m)),
    );
    setLoading(false);
  }

  function exportPDF() {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(26, 54, 93);
    doc.text("WEEKLY MAINTENANCE SHUTDOWN PLAN", 14, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(74, 85, 104);
    doc.text(`Week ${weekNumber} - ${currentYear}`, 14, 30);

    const sortedPlans = [...calendarPlans].sort((a, b) => {
      return (
        DAYS_OF_WEEK.indexOf(a.planned_day) -
        DAYS_OF_WEEK.indexOf(b.planned_day)
      );
    });

    const body = sortedPlans.map((p) => [
      p.planned_day,
      p.tool_number,
      p.machine_name || "",
      p.duration_minutes,
      p.status,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [["Day", "Machine", "Equipment", "Duration (min)", "Status"]],
      body: body,
      headStyles: {
        fillColor: "#1A365D",
        textColor: "#FFFFFF",
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: "#F7FAFC" },
      margin: { top: 35 },
    });

    const totalMachines = sortedPlans.length;
    const totalDowntime = sortedPlans.reduce(
      (sum, p) => sum + p.duration_minutes,
      0,
    );

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(45, 55, 72);
    doc.text(`Total Machines: ${totalMachines}`, 14, finalY);
    doc.text(`Total Downtime (min): ${totalDowntime} min`, 14, finalY + 7);

    doc.save(`Weekly_Maintenance_Shutdown_Plan_W${weekNumber}.pdf`);
  }
  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Weekly Maintenance Shutdown Planner
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <span>Week:</span>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setWeekNumber(w);
                  loadData(w, currentYear);
                }}
                className="w-14 border rounded px-1.5 py-0.5 text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  loadData(weekNumber, y);
                }}
                className="w-20 border rounded px-1.5 py-0.5 text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={savePlan}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
          >
            Generate Weekly Plan
          </button>
          <button
            onClick={exportPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={clearPlan}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
          >
            Clear Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-slate-500 font-medium animate-pulse">
            Loading data...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                Available PMs by Machine
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Select</th>
                    <th className="py-3 px-4">Tool Number</th>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4 text-center">Tasks Count</th>
                    <th className="py-3 px-4 w-32">Duration (min)</th>
                    <th className="py-3 px-4 w-40">Planned Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {machines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400"
                      >
                        No outstanding PM tasks found for this period.
                      </td>
                    </tr>
                  ) : (
                    machines.map((machine, index) => {
                      const isAlreadyPlanned = calendarPlans.some(
                        (p) => p.tool_number === machine.tool_number,
                      );
                      return (
                        <tr
                          key={machine.tool_number}
                          className={`transition-colors ${
                            isAlreadyPlanned
                              ? "bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900"
                              : machine.selected
                                ? "bg-blue-50/60 hover:bg-blue-50"
                                : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={
                                isAlreadyPlanned ? true : machine.selected
                              }
                              disabled={isAlreadyPlanned}
                              onChange={(e) =>
                                handleCheckboxChange(index, e.target.checked)
                              }
                              className={`h-4 w-4 rounded border-slate-300 focus:ring-blue-500 ${
                                isAlreadyPlanned
                                  ? "text-emerald-600 focus:ring-emerald-500 cursor-not-allowed bg-emerald-200"
                                  : "text-blue-600"
                              }`}
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold flex items-center gap-2">
                            <span>{machine.tool_number}</span>
                            {isAlreadyPlanned && (
                              <span className="text-[10px] font-sans font-semibold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                                Planned
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3.5 px-4 ${isAlreadyPlanned ? "text-emerald-700/80" : "text-slate-600"}`}
                          >
                            {machine.equipment}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold">
                            {machine.number_of_tasks}
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              type="number"
                              value={machine.duration_minutes}
                              disabled={isAlreadyPlanned}
                              onChange={(e) =>
                                handleDurationChange(
                                  index,
                                  Number(e.target.value),
                                )
                              }
                              className={`w-full border rounded px-2.5 py-1 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                isAlreadyPlanned
                                  ? "bg-emerald-100/50 border-emerald-300 text-emerald-800 cursor-not-allowed font-bold"
                                  : "border-slate-300 bg-white"
                              }`}
                              min={0}
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={
                                isAlreadyPlanned
                                  ? calendarPlans.find(
                                      (p) =>
                                        p.tool_number === machine.tool_number,
                                    )?.planned_day
                                  : machine.planned_day
                              }
                              disabled={isAlreadyPlanned}
                              onChange={(e) =>
                                handleDayChange(index, e.target.value)
                              }
                              className={`w-full border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                isAlreadyPlanned
                                  ? "bg-emerald-100/50 border-emerald-300 text-emerald-800 cursor-not-allowed"
                                  : "border-slate-300"
                              }`}
                            >
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d} value={d}>
                                  {d.charAt(0) + d.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 self-start">
            <h2 className="text-xl font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <span>📅</span> Weekly Calendar
            </h2>
            <div className="space-y-6">
              {DAYS_OF_WEEK.map((day) => {
                const dayPlans = calendarPlans.filter(
                  (p) => p.planned_day === day,
                );
                return (
                  <div key={day} className="group">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
                      {day}
                    </h3>
                    {dayPlans.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pl-3 border-l-2 border-slate-100 py-1">
                        No maintenance planned
                      </p>
                    ) : (
                      <div className="space-y-1.5 pl-3 border-l-2 border-blue-500">
                        {dayPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="flex justify-between items-center text-sm bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 transition-colors"
                          >
                            <span className="font-mono font-bold text-slate-800">
                              {plan.tool_number}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border shadow-sm">
                              {plan.duration_minutes} min
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
