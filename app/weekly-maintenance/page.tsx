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
const FREQUENCY_OPTIONS = ["ALL", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

export default function WeeklyMaintenancePage() {
  const [machines, setMachines] = useState<GroupedMachine[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekNumber, setWeekNumber] = useState(0);
  const [currentYear, setCurrentYear] = useState(0);
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");

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
  async function loadData(w: number, y: number, freq: string) {
    setLoading(true);
    await Promise.all([loadAvailableTasks(freq), loadCurrentCalendar(w, y)]);
    setLoading(false);
  }

  async function loadAvailableTasks(freq: string) {
    let query = supabase
      .from("pm_tasks")
      .select("*")
      .lte("next_due_at", new Date().toISOString());

    if (freq === "DAILY") {
      query = query.eq("frequency", "1Z");
    } else if (freq === "WEEKLY") {
      query = query.eq("frequency", "1S");
    } else if (freq === "MONTHLY") {
      query = query.in("frequency", ["1L", "6L", "12L"]);
    } else if (freq === "YEARLY") {
      query = query.in("frequency", ["1A", "2A", "3A", "5A"]);
    }

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
        groups[task.tool_number].totalMinutes += task.estimated_minutes || 0;
        if (task.frequency) {
          groups[task.tool_number].frequencies.add(task.frequency);
        }
      });

      const groupedArr: GroupedMachine[] = Object.keys(groups).map(
        (toolNum) => {
          const freqArr = Array.from(groups[toolNum].frequencies);
          const displayFrequency =
            freqArr.length > 0 ? freqArr.join(", ") : "N/A";

          return {
            tool_number: toolNum,
            equipment: groups[toolNum].equipment,
            number_of_tasks: groups[toolNum].count,
            duration_minutes: groups[toolNum].totalMinutes,
            planned_day: "MONDAY",
            selected: false,
            frequency: displayFrequency,
          };
        },
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
  function handleFilterChange(freq: string) {
    setFrequencyFilter(freq);
    loadData(weekNumber, currentYear, freq);
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

    // Titlu principal stilizat premium
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("WEEKLY PREVENTIVE MAINTENANCE PLAN", 14, 20);

    // Subtitlu cu detalii de timp
    doc.setFont("helvetica", "medium");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(
      `Generated Schedule for Week ${weekNumber} / ${currentYear}`,
      14,
      28,
    );

    // Linie subtilă de separare pentru header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    const sortedPlans = [...calendarPlans].sort((a, b) => {
      return (
        DAYS_OF_WEEK.indexOf(a.planned_day) -
        DAYS_OF_WEEK.indexOf(b.planned_day)
      );
    });

    const pdfMapping: { [key: string]: string } = {
      "1Z": "Daily",
      "1S": "Weekly",
      "1L": "Monthly",
      "6L": "6 Months",
      "12L": "12 Months",
      "1A": "1 Year",
      "2A": "2 Years",
      "3A": "3 Years",
      "5A": "5 Years",
      AM: "As Needed",
    };

    const body = sortedPlans.map((p) => {
      const matchingMachine = machines.find(
        (m) => m.tool_number === p.tool_number,
      );
      const rawFreqs = matchingMachine
        ? matchingMachine.frequency.split(", ")
        : [];
      const cleanFreqs = rawFreqs.map((f) => pdfMapping[f] || f).join(", ");

      return [
        p.planned_day.charAt(0) + p.planned_day.slice(1).toLowerCase(),
        p.tool_number,
        p.machine_name || "N/A",
        cleanFreqs || "N/A",
        `${p.duration_minutes} min`,
        p.status,
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [
        [
          "Planned Day",
          "Machine ID",
          "Equipment Name",
          "Frequency",
          "Duration",
          "Status",
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
      margin: { top: 35, left: 14, right: 14 },
      theme: "striped",
    });

    const totalMachines = sortedPlans.length;
    const totalDowntime = sortedPlans.reduce(
      (sum, p) => sum + p.duration_minutes,
      0,
    );
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Panou sumator elegant la finalul tabelului
    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, 182, 20, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, finalY, 182, 20, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Planned Machines: ${totalMachines}`, 20, finalY + 12);
    doc.text(
      `Total Allocated Downtime: ${totalDowntime} min`,
      110,
      finalY + 12,
    );

    doc.save(`Weekly_Maintenance_Plan_W${weekNumber}_${currentYear}.pdf`);
  }
  function renderFrequencyBadge(freqString: string) {
    const freqs = freqString.split(", ");
    const mapping: { [key: string]: { label: string; style: string } } = {
      "1Z": {
        label: "Daily",
        style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      "1S": {
        label: "Weekly",
        style: "bg-blue-50 text-blue-700 border-blue-200",
      },
      "1L": {
        label: "Monthly",
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
      "2A": {
        label: "2 Years",
        style: "bg-purple-50 text-purple-700 border-purple-200",
      },
      "3A": {
        label: "3 Years",
        style: "bg-purple-50 text-purple-700 border-purple-200",
      },
      "5A": {
        label: "5 Years",
        style: "bg-purple-50 text-purple-700 border-purple-200",
      },
      AM: {
        label: "As Needed",
        style: "bg-slate-100 text-slate-600 border-slate-200",
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
                    loadData(weekNumber, y, frequencyFilter);
                  }}
                  className="w-20 border rounded px-1.5 py-0.5 text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-sm">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFilterChange(option)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    frequencyFilter === option
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {option.charAt(0) + option.slice(1).toLowerCase()}
                </button>
              ))}
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
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4 w-32">Duration (min)</th>
                    <th className="py-3 px-4 w-40">Planned Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                  {machines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                            {renderFrequencyBadge(machine.frequency)}
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
