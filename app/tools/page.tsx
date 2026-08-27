"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Machine {
  id: number;
  created_at: string;
  tool_number: string | null;
  status: string | null;
  machine_name: string | null;
  machine_type: string | null;
  area: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  installation_date: string | null;
  criticality: string | null;
  notes: string | null;
}

interface ActiveRepair {
  tool_number: string | null;
  status: string | null;
}

export default function MachinesPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [activeRepairs, setActiveRepairs] = useState<ActiveRepair[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    tool_number: "",
    machine_name: "",
    machine_type: "",
    area: "",
    manufacturer: "",
    serial_number: "",
    installation_date: "",
    criticality: "Medium",
    status: "Running",
    notes: "",
  });

  async function loadMachinesAndRepairs() {
    try {
      setIsLoading(true);
      const [machinesRes, repairsRes] = await Promise.all([
        supabase.from("tools").select("*").order("id", { ascending: true }),
        supabase
          .from("repairs")
          .select("tool_number, status")
          .not("status", "ilike", "closed"),
      ]);

      if (machinesRes.error) throw machinesRes.error;
      if (repairsRes.error) throw repairsRes.error;

      if (machinesRes.data) setMachines(machinesRes.data);
      if (repairsRes.data) setActiveRepairs(repairsRes.data);
    } catch (error: any) {
      console.error("Error loading maintenance data:", error.message);
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    loadMachinesAndRepairs();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingMachine(null);
    setFormData({
      tool_number: "",
      machine_name: "",
      machine_type: "",
      area: "",
      manufacturer: "",
      serial_number: "",
      installation_date: "",
      criticality: "Medium",
      status: "Running",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (machine: Machine, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMachine(machine);
    setFormData({
      tool_number: machine.tool_number || "",
      machine_name: machine.machine_name || "",
      machine_type: machine.machine_type || "",
      area: machine.area || "",
      manufacturer: machine.manufacturer || "",
      serial_number: machine.serial_number || "",
      installation_date: machine.installation_date || "",
      criticality: machine.criticality || "Medium",
      status: machine.status || "Running",
      notes: machine.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteMachine = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this machine?"))
      return;
    try {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
      loadMachinesAndRepairs();
    } catch (error: any) {
      alert("Failed to delete machine record: " + error.message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        const { error } = await supabase
          .from("tools")
          .update(formData)
          .eq("id", editingMachine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tools").insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      loadMachinesAndRepairs();
    } catch (error: any) {
      alert("Failed to save machine configuration: " + error.message);
    }
  };
  const filteredMachines = machines.filter((machine) => {
    const term = searchTerm.toLowerCase();
    const activeTicket = activeRepairs.find(
      (r) =>
        r.tool_number?.toLowerCase().trim() ===
        machine.tool_number?.toLowerCase().trim(),
    );
    const dynamicStatus = activeTicket
      ? "Maintenance"
      : machine.status || "Running";
    return (
      machine.tool_number?.toLowerCase().includes(term) ||
      machine.machine_name?.toLowerCase().includes(term) ||
      machine.manufacturer?.toLowerCase().includes(term) ||
      machine.area?.toLowerCase().includes(term) ||
      dynamicStatus.toLowerCase().includes(term)
    );
  });

  const getStatusStyles = (statusName: string | null) => {
    const normalized = statusName?.toLowerCase() || "running";
    if (normalized === "stopped")
      return "bg-red-100 text-red-800 border border-red-200";
    if (normalized === "maintenance")
      return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  };

  const getCriticalityStyles = (criticalityName: string | null) => {
    const normalized = criticalityName?.toLowerCase() || "medium";
    if (normalized === "high")
      return "bg-red-50 text-red-700 border border-red-200 font-bold";
    if (normalized === "low")
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    return "bg-amber-50 text-amber-700 border border-amber-200";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏭</span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Machines Management
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            Manage production machines and industrial equipment (
            {machines.length} records).
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          + Add New Machine
        </button>
      </div>
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <input
          type="text"
          placeholder="Search by Machine Code, Name, Manufacturer or Area..."
          className="w-full md:w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">System ID</th>
                <th className="py-4 px-6">Machine Code</th>
                <th className="py-4 px-6">Machine Name</th>
                <th className="py-4 px-6">Machine Type</th>
                <th className="py-4 px-6">Area</th>
                <th className="py-4 px-6">Manufacturer</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Criticality</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    Retrieving records from Supabase...
                  </td>
                </tr>
              ) : filteredMachines.length > 0 ? (
                filteredMachines.map((machine) => {
                  const activeTicket = activeRepairs.find(
                    (r) =>
                      r.tool_number?.toLowerCase().trim() ===
                      machine.tool_number?.toLowerCase().trim(),
                  );
                  const displayStatus = activeTicket
                    ? "Maintenance"
                    : machine.status || "Running";
                  return (
                    <tr
                      key={machine.id}
                      onClick={() =>
                        machine.tool_number &&
                        router.push(
                          `/tool?number=${encodeURIComponent(machine.tool_number.trim())}`,
                        )
                      }
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-6 font-mono font-semibold text-xs text-blue-600">
                        #{machine.id}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        {machine.tool_number || "Unassigned"}
                      </td>
                      <td className="py-4 px-6">
                        {machine.machine_name || "N/A"}
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-600">
                        {machine.machine_type || "N/A"}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {machine.area || "N/A"}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {machine.manufacturer || "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusStyles(displayStatus)}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCriticalityStyles(machine.criticality)}`}
                        >
                          {machine.criticality || "Medium"}
                        </span>
                      </td>
                      <td
                        className="py-4 px-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleOpenEditModal(machine, e)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteMachine(machine.id, e)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    No machine lines found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMachine
                  ? "⚙️ Modify Machine Profile"
                  : "🏭 Register Machine Asset"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Machine Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRESS-01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.tool_number}
                    onChange={(e) =>
                      setFormData({ ...formData, tool_number: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Machine Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 400T Press"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.machine_name}
                    onChange={(e) =>
                      setFormData({ ...formData, machine_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Machine Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.machine_type}
                    onChange={(e) =>
                      setFormData({ ...formData, machine_type: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Production Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Line A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Manufacturer OEM
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AIDA"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-89421"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serial_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Installation Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                    value={formData.installation_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        installation_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Criticality Rating
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500 bg-white"
                    value={formData.criticality}
                    onChange={(e) =>
                      setFormData({ ...formData, criticality: e.target.value })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Operational Status
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500 bg-white"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="Running">Running</option>
                    <option value="Stopped">Stopped</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Technical Maintenance Notes
                </label>
                <textarea
                  placeholder="Provide specific maintenance constraints..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  {editingMachine ? "Save Asset Profile" : "Register Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
