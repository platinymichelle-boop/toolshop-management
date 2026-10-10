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

// Structură rigidă pentru maparea schimburilor din producție
interface ShiftTeam {
  id: string;
  name: string;
  members: string[];
}

export default function WorkOrdersPage() {
  const [tools, setTools] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState("");

  // Definirea statică a echipelor pe schimburi conform organigramei din fabrică
  const shifts: ShiftTeam[] = [
    {
      id: "Shift 1",
      name: "Shift 1",
      members: ["Guner Uslu", "Nita Razvan", "Danalache Claudiu"],
    },
    {
      id: "Shift 2",
      name: "Shift 2",
      members: ["Unciuleac Marcel", "Perjoiu Romulus", "Esanu Alin"],
    },
    {
      id: "Shift 3",
      name: "Shift 3",
      members: ["Chiran Nicolae", "Iancu Cristian", "Militaru Nicolae"],
    },
  ];

  const [selectedShift, setSelectedShift] = useState("");

  const [statuses, setStatuses] = useState<string[]>([
    "OPEN",
    "DUE_SOON",
    "OVERDUE",
  ]);

  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [plannedDate, setPlannedDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    if (selectedTool) {
      loadTasks();
    }
  }, [selectedTool, statuses]);
  // ==========================================================
  // [MODIFICARE] REZOLVARE DISPARIȚIE UTILAJE (NUT PROJECTION / PRESE)
  // Încărcare completă, fără limitări sau filtre implicite ascunse
  // ==========================================================
  async function loadTools() {
    const { data, error } = await supabase
      .from("pm_tasks")
      .select("tool_number");

    if (error) {
      console.error("Error loading tools:", error.message);
      return;
    }

    // Extragere valori unice și curățare de spații albe accidentale
    const uniqueTools = [
      ...new Set((data || []).map((x) => x.tool_number?.trim())),
    ].filter(Boolean);

    setTools(uniqueTools.sort());
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

  // ==========================================================
  // GENERARE AUTOMATĂ WO SECVENȚIAL (Format: WO-2026-0001)
  // ==========================================================
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

  function selectAllActions() {
    if (selectedActions.length === tasks.length) {
      setSelectedActions([]);
    } else {
      setSelectedActions(tasks.map((t) => String(t.id)));
    }
  }

  const selectedWorkOrderActions = tasks.filter((task) =>
    selectedActions.includes(String(task.id)),
  );

  // ==========================================================
  // [MODIFICARE] CREARE WORK ORDER REAL BAZAT PE SCHIMBURI
  // ==========================================================
  async function createWorkOrder() {
    if (!selectedTool) {
      alert("No tool selected");
      return;
    }

    if (!selectedShift) {
      alert("Please select a Shift team");
      return;
    }

    if (selectedActions.length === 0) {
      alert("No actions selected");
      return;
    }

    try {
      setIsGenerating(true);
      const woNumber = await generateWONumber();

      // Salvare în tabela părinte utilizând Schimbul selectat ca semnatar principal
      const { data: woData, error: woError } = await supabase
        .from("work_orders")
        .insert({
          wo_number: woNumber,
          tool_id: selectedTool,
          tool_number: selectedTool,
          tool_name: `Tool ${selectedTool}`,
          scheduled_date: plannedDate || new Date().toISOString().split("T")[0],
          status: "OPEN",
          created_by: selectedShift, // Salvează valoarea „Shift 1”, „Shift 2” sau „Shift 3”
          actions_count: selectedWorkOrderActions.length,
        })
        .select()
        .single();

      if (woError) throw new Error(woError.message);

      // Pregătirea acțiunilor pentru tabela copil
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

      // Resetarea selecțiilor
      setSelectedActions([]);
      setSelectedShift("");
    } catch (error: any) {
      alert(error.message || "Failed creating Work Order");
    } finally {
      setIsGenerating(false);
    }
  }
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

      {/* ==========================================================
          [MODIFICARE] BARĂ ORIZONTALĂ SUPERIOARĂ PENTRU UTILAJE (TOOLS)
         ========================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
          Select Active Industrial Tool / Equipment
        </label>
        <div className="flex flex-wrap gap-2">
          {tools.length === 0 ? (
            <span className="text-xs font-medium text-slate-400 italic">
              Loading tools from database...
            </span>
          ) : (
            tools.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setSelectedTool(tool)}
                className={`px-4 py-3 rounded-lg text-sm font-bold tracking-tight border transition-all ${
                  selectedTool === tool
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-[1.02]"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {tool}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ==========================================================
            [MODIFICARE] BARA SMART DE SCHIMBURI (SHIFT TEAM PICKER)
           ========================================================== */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
            Assign Shift Team (Click to Select)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setSelectedShift(shift.id)}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between space-y-3 ${
                  selectedShift === shift.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 ring-2 ring-offset-2 ring-slate-900"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-base font-black tracking-tight">
                    {shift.name}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedShift === shift.id
                        ? "border-white bg-white"
                        : "border-slate-400"
                    }`}
                  >
                    {selectedShift === shift.id && (
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                </div>

                {/* Afișarea echipei de tehnicieni dedesubt */}
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
        {/* PARMETRII ADIȚIONALI (DATĂ ȘI PRIORITATE) */}
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

      {/* FILTRE STATUS ȘI LISTĂ SARCINI PREVENTIVE DETECTATE */}
      {selectedTool && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-black text-slate-900 text-base">
                PM Preventive Actions — Tool: {selectedTool}
              </h2>

              {/* Filtre Status integrate curat sub formă de checkbox-uri */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
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
            </div>

            {/* Selector Master: Select All / Deselect All */}
            <label className="flex items-center gap-2 cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg transition-colors text-xs font-bold font-mono text-slate-700">
              <input
                type="checkbox"
                onChange={selectAllActions}
                checked={
                  tasks.length > 0 && selectedActions.length === tasks.length
                }
                className="w-4 h-4 rounded cursor-pointer accent-blue-600"
              />
              {selectedActions.length === tasks.length
                ? "DESELECT ALL"
                : "SELECT ALL TASKS"}
            </label>
          </div>

          {/* TABEL OPERAȚIUNI PM */}
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
                {tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400 font-medium italic"
                    >
                      Nu există acțiuni preventive deschise pentru criteriile
                      selectate.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/40 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedActions.includes(String(task.id))}
                          onChange={() => toggleAction(String(task.id))}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-slate-900 font-bold">
                        {task.equipment}
                      </td>
                      <td className="p-4 text-slate-600 font-semibold">
                        {task.action}
                      </td>
                      <td className="p-4 text-center text-xs font-mono uppercase font-bold text-slate-500">
                        {task.frequency}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                            task.status === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : task.status === "DUE_SOON"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
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

      {/* BUTON CENTRAL GENERARE WORK ORDER */}
      <div className="pt-2">
        <button
          onClick={createWorkOrder}
          disabled={
            !selectedTool ||
            !selectedShift ||
            selectedActions.length === 0 ||
            isGenerating
          }
          className={`px-6 py-3.5 text-white font-bold rounded-xl text-sm transition-all shadow-sm w-full sm:w-auto tracking-tight ${
            !selectedTool ||
            !selectedShift ||
            selectedActions.length === 0 ||
            isGenerating
              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
              : "bg-blue-600 hover:bg-blue-700 hover:shadow-md shadow-blue-100 active:scale-[0.99]"
          }`}
        >
          {isGenerating ? "Generating CMMS Record..." : "Generate Work Order"}
        </button>
      </div>
    </div>
  );
}
