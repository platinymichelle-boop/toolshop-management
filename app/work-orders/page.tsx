"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface PMTask {
  id: number;
  tool_number: string;
  equipment: string;
  sub_equipment: string;
  action: string;
  frequency: string;
  status: string;
}

interface ShiftTeam {
  id: string;
  name: string;
  members: string[];
}

function getISOWeekNumber(date: Date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}
export default function WorkOrdersPage() {
  const [tools, setTools] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [dbTechnicians, setDbTechnicians] = useState<any[]>([]);

  // NOU: Stări pentru controlul categoriilor de matrițe
  const [selectedType, setSelectedType] = useState<string>("TOATE");
  const [dbToolsWithData, setDbToolsWithData] = useState<any[]>([]);

  const currentWeek = getISOWeekNumber(new Date());
  const rotationIndex = (currentWeek + 1) % 3;

  const getTeamMembers = (teamCode: string, fallbackMembers: string[]) => {
    if (dbTechnicians.length === 0) return fallbackMembers;
    const filtered = dbTechnicians.filter(
      (t) => t.team === teamCode || t.shift === teamCode || t.role === teamCode,
    );
    if (filtered.length === 0) return fallbackMembers;
    return filtered.map((t) => t.name || t.full_name);
  };

  const teams = [
    {
      code: "TEAM_A",
      members: getTeamMembers("TEAM_A", [
        "MATEESCU ANCUTA",
        "STAN GEORGE",
        "DIACONU FLORIAN",
        "CIOBOTEA LIVIU",
        "PREDA ALEXANDRU SANDEL",
      ]),
    },
    {
      code: "TEAM_B",
      members: getTeamMembers("TEAM_B", [
        "BIDILICA ANDREI",
        "BANESCU SORIN",
        "ILIE OVIDIU",
        "DORCIOMAN ROMEO",
        "CRISTESCU NARCIS",
        "DOBRESCU DRAGOS",
      ]),
    },
    {
      code: "TEAM_C",
      members: getTeamMembers("TEAM_C", [
        "POPA NICUSOR",
        "BARBU COSMIN",
        "PENESCU VALERIU",
        "DOBRE GEORGE",
        "HERACHE CRISTIAN",
        "FIERARU NICOLAE",
      ]),
    },
  ];
  const shifts = [
    {
      id: "Shift 1",
      name: "Shift 1",
      teamCode: teams[(0 + rotationIndex) % 3].code,
      members: teams[(0 + rotationIndex) % 3].members,
    },
    {
      id: "Shift 2",
      name: "Shift 2",
      teamCode: teams[(1 + rotationIndex) % 3].code,
      members: teams[(1 + rotationIndex) % 3].members,
    },
    {
      id: "Shift 3",
      name: "Shift 3",
      teamCode: teams[(2 + rotationIndex) % 3].code,
      members: teams[(2 + rotationIndex) % 3].members,
    },
  ];

  const getCurrentShift = () => {
    const hour = new Date().getHours();

    if (hour >= 7 && hour < 15) return "Shift 1";
    if (hour >= 15 && hour < 23) return "Shift 2";
    return "Shift 3";
  };

  const [selectedShift, setSelectedShift] = useState(getCurrentShift());
  const [statuses, setStatuses] = useState<string[]>([
    "OPEN",
    "DUE_SOON",
    "OVERDUE",
  ]);
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState("ALL");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannedDate, setPlannedDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString("ro-RO"));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("ro-RO"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadTools();
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTool) {
      loadTasks();
    }
  }, [selectedTool, statuses]);

  async function loadTechnicians() {
    try {
      const { data, error } = await supabase.from("technicians").select("*");
      if (error) {
        console.error("Eroare la încărcarea tehnicienilor:", error.message);
        return;
      }
      if (data) setDbTechnicians(data);
    } catch (err: any) {
      console.error("Catch Block Technicians Error:", err.message);
    }
  }
  async function loadTools() {
    try {
      const { data, error } = await supabase.rpc("get_unique_pm_tools");
      if (error) {
        console.error("RPC Error loading tools:", error.message);
        return;
      }
      if (data) {
        setDbToolsWithData(data);
        const uniqueTools = data
          .map((item: any) => String(item.tool_number || "").trim())
          .filter(Boolean);
        setTools(uniqueTools);
      }
    } catch (err: any) {
      console.error("Catch Block Error:", err.message);
    }
  }

  async function loadTasks() {
    const { data } = await supabase
      .from("pm_tasks")
      .select("*")
      .eq("tool_number", selectedTool)
      .in("status", statuses);
    setTasks(data || []);
    setSelectedActions([]);
  }

  async function generateWONumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `WO-${currentYear}-`;
    const { data, error } = await supabase
      .from("work_orders")
      .select("wo_number")
      .like("wo_number", `${prefix}%`)
      .order("wo_number", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return `${prefix}0001`;
    }

    // REZOLVARE: Adaugă [0] pentru a citi prima înregistrare găsită în array
    const lastWoNumber = data[0].wo_number;
    const parts = lastWoNumber.split("-");

    const lastSequence = parseInt(parts[2], 10);
    const nextSequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
    const paddedSequence = String(nextSequence).padStart(4, "0");
    return `${prefix}${paddedSequence}`;
  }

  function toggleStatus(status: string) {
    if (statuses.includes(status)) {
      setStatuses(statuses.filter((s) => s !== status));
    } else {
      setStatuses([...statuses, status]);
    }
  }

  function toggleAction(id: string) {
    if (selectedActions.includes(id)) {
      setSelectedActions(selectedActions.filter((actionId) => actionId !== id));
    } else {
      setSelectedActions([...selectedActions, id]);
    }
  }

  const filteredTasks =
    selectedFrequency === "ALL"
      ? tasks
      : tasks.filter((task) => task.frequency === selectedFrequency);

  // Filtrare dinamică a butoanelor de matrițe în funcție de tab-ul activ selectat
  const filteredToolsByTab = dbToolsWithData.filter((t: any) => {
    if (selectedType === "TOATE") return true;
    return (
      (t.tool_type || "NEATRIBUIT").toUpperCase() === selectedType.toUpperCase()
    );
  });
  function selectAllActions() {
    const filteredIds = filteredTasks.map((t) => String(t.id));
    const allFilteredSelected = filteredIds.every((id) =>
      selectedActions.includes(id),
    );

    if (allFilteredSelected) {
      setSelectedActions(
        selectedActions.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      const newSelections = [...selectedActions];
      filteredIds.forEach((id) => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      setSelectedActions(newSelections);
    }
  }

  const selectedWorkOrderActions = filteredTasks.filter((task) =>
    selectedActions.includes(String(task.id)),
  );

  async function createWorkOrder() {
    if (!selectedTool) {
      alert("No tool selected");
      return;
    }
    if (!selectedShift) {
      alert("Please select a Shift team");
      return;
    }
    if (selectedWorkOrderActions.length === 0) {
      alert("No actions selected from the active frequency filter");
      return;
    }

    try {
      setIsGenerating(true);
      const woNumber = await generateWONumber();
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .insert({
          wo_number: woNumber,
          tool_id: selectedTool,
          tool_number: selectedTool,
          tool_name: `Tool ${selectedTool}`,
          scheduled_date: plannedDate || new Date().toISOString().split("T")[0],
          priority: priority,
          team_code: shifts.find((s) => s.id === selectedShift)?.teamCode,
          status: "OPEN",
          created_by: selectedShift,
          actions_count: selectedWorkOrderActions.length,
        })
        .select()
        .single();

      if (woError) throw new Error(woError.message);

      const actionsPayload = selectedWorkOrderActions.map((task) => ({
        work_order_id: woData.id,
        preventive_action_id: task.id,
        task_description: task.action,
        frequency: task.frequency,
      }));

      const { error: actionsError } = await supabase
        .from("work_order_actions")
        .insert(actionsPayload);

      if (actionsError) throw new Error(actionsError.message);

      alert(`Work Order ${woNumber} created successfully`);
      const filteredIds = filteredTasks.map((t) => String(t.id));
      setSelectedActions(
        selectedActions.filter((id) => !filteredIds.includes(id)),
      );
    } catch (error: any) {
      alert(error.message || "Failed creating Work Order");
    } finally {
      setIsGenerating(false);
    }
  }

  const frequencies = [
    { value: "ALL", label: "Toate Frecvențele" },
    { value: "Săptămânal", label: "Săptămânal (1S)" },
    { value: "Lunar", label: "Lunar (1L)" },
    { value: "La 3 Audit", label: "Quarterly (3L)" },
    { value: "Semestrial", label: "Semi Annual (6L)" },
    { value: "Anual", label: "Yearly (1A)" },
  ];

  const isAllFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks
      .map((t) => String(t.id))
      .every((id) => selectedActions.includes(id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER MANAGER PANEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Work Orders Generation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configurarea fluxului și emiterea ordinelor de lucru pentru
            mentenanța preventivă.
          </p>
        </div>
        <Link
          href="/work-orders/list"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-sm shadow-sm"
        >
          View History &rarr;
        </Link>
      </div>
      {/* UTILAJE SELECTOR CU FILTRARE PE CATEGORII */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
              Select Active Industrial Tool / Equipment
            </label>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 self-start sm:self-auto">
            {["TOATE", "PROGRESIV", "TRANSFER", "BLANKING", "NEATRIBUIT"].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedType(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedType === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-2">
          {filteredToolsByTab.length === 0 ? (
            <span className="text-xs font-medium text-slate-400 italic">
              Nu există matrițe în categoria selectată...
            </span>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-2 min-w-[640px] md:min-w-none">
              {filteredToolsByTab.map((t: any) => (
                <button
                  key={t.tool_number}
                  type="button"
                  onClick={() => setSelectedTool(t.tool_number)}
                  className={`px-3 py-3 rounded-lg text-sm font-bold tracking-tight border text-center transition-all truncate ${selectedTool === t.tool_number ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-[1.02]" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"}`}
                  title={t.tool_number}
                >
                  {t.tool_number}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROTATIE AUTOMATA + CEAS */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-sm font-mono text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-blue-400 uppercase tracking-wide">
            Current ISO Week: {currentWeek}
          </div>
          <div className="text-slate-400 pt-1">
            <p className="font-bold text-white mb-1 uppercase tracking-wider text-[10px]">
              Rotation Map for this week:
            </p>
            {shifts.map((s) => (
              <p key={s.id}>
                • {s.name} &rarr;{" "}
                <span className="text-amber-400 font-bold">{s.teamCode}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-center sm:text-right min-w-[140px] shadow-inner self-stretch sm:self-auto flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mb-0.5">
            System Time
          </span>
          <span className="text-xl font-black text-green-400 tracking-wider tabular-nums">
            {currentTime || "--:--:--"}
          </span>
        </div>
      </div>
      {/* INTERFATA PICKER SCHIMBURI ȘI PARAMETRI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
            Shift Team Assignment (Auto-Selected based on ISO rotation)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setSelectedShift(shift.id)}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between space-y-3 ${selectedShift === shift.id ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 ring-2 ring-offset-2 ring-slate-900" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"}`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-base font-black tracking-tight">
                    {shift.name}{" "}
                    <span
                      className={`text-xs ml-1 font-bold ${selectedShift === shift.id ? "text-blue-400" : "text-slate-400"}`}
                    >
                      ({shift.teamCode})
                    </span>
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedShift === shift.id ? "border-white bg-white" : "border-slate-400"}`}
                  >
                    {selectedShift === shift.id && (
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                </div>
                <div className="space-y-1 w-full pt-2 border-t border-slate-200/20">
                  {shift.members.map((member) => (
                    <p
                      key={member}
                      className={`text-xs ${selectedShift === shift.id ? "text-slate-300" : "text-slate-500"} font-medium`}
                    >
                      • {member}
                    </p>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm h-full flex flex-col justify-center">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono mb-2">
              Planned Date
            </label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 font-medium rounded-lg p-2.5 text-sm focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono mb-2">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 font-bold rounded-lg p-2.5 text-sm focus:bg-white transition-colors"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* SARCINI PREVENTIVE */}
      {selectedTool && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-3 flex-1">
              <h2 className="font-black text-slate-900 text-base">
                PM Preventive Actions — Tool: {selectedTool}
              </h2>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {["OPEN", "DUE_SOON", "OVERDUE"].map((status) => (
                    <label
                      key={status}
                      className="flex items-center text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={statuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="mr-1.5 w-4 h-4 accent-blue-600 rounded"
                      />
                      {status}
                    </label>
                  ))}
                </div>
                <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                    Frequency:
                  </label>
                  <select
                    value={selectedFrequency}
                    onChange={(e) => setSelectedFrequency(e.target.value)}
                    className="border border-slate-200 bg-white font-bold rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {frequencies.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg transition-colors text-xs font-bold font-mono text-slate-700">
                <input
                  type="checkbox"
                  onChange={selectAllActions}
                  checked={isAllFilteredSelected}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                />
                {isAllFilteredSelected ? "DESELECT ALL" : "SELECT ALL TASKS"}
              </label>
              <button
                type="button"
                onClick={createWorkOrder}
                disabled={isGenerating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition-colors text-xs tracking-tight shadow-sm"
              >
                {isGenerating ? "GENERATING..." : "GENERATE WORK ORDER"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-black tracking-wider uppercase font-mono bg-slate-50/30">
                  <th className="p-4 w-14 text-center">Bifă</th>
                  <th className="p-4 w-1/4">Equipment</th>
                  <th className="p-4">Action Description</th>
                  <th className="p-4 w-24 text-center">Freq</th>
                  <th className="p-4 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400 font-medium italic"
                    >
                      Nu există acțiuni preventive care să corespundă filtrelor
                      selectate.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedActions.includes(String(task.id))}
                          onChange={() => toggleAction(String(task.id))}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {task.equipment}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {task.sub_equipment || "—"}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-normal leading-relaxed">
                        {task.action}
                      </td>
                      <td className="p-4 text-center font-mono text-xs font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {task.frequency}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xxs font-black tracking-wider uppercase ${task.status === "OPEN" ? "bg-green-50 text-green-700 border border-green-200" : task.status === "DUE_SOON" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
