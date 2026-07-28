"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";

interface PageProps {
  searchParams: Promise<{ number?: string }>;
}

export default function ToolPage({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const cleanToolNumber = (resolvedSearchParams.number || "").trim();

  const [isLoading, setIsLoading] = useState(true);
  const [tool, setTool] = useState<any>(null);
  const [activeRepair, setActiveRepair] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [isUpdatingStock, setIsUpdatingStock] = useState<number | null>(null);

  // Funcție live pentru încărcarea datelor fără cache
  async function loadLiveToolData() {
    if (!cleanToolNumber) return;
    try {
      setIsLoading(true);
      const searchPattern = `%${cleanToolNumber}%`;

      // 1. Preluăm datele de bază ale matriței
      const toolRes = await supabase
        .from("tools")
        .select("*")
        .ilike("tool_number", searchPattern)
        .maybeSingle();

      // 2. REPARAT: Căutăm orice tichet deschis eliminând spațiile goale ascunse
      const repairActiveRes = await supabase
        .from("repairs")
        .select("status")
        .ilike("tool_number", searchPattern)
        .not("status", "ilike", "closed")
        .order("id", { ascending: false });

      const partsRes = await supabase
        .from("spare_parts")
        .select("*")
        .ilike("tool_number", searchPattern)
        .order("endr_code", { ascending: true });

      const historyRes = await supabase
        .from("repairs")
        .select("*")
        .ilike("tool_number", searchPattern)
        .order("id", { ascending: false });

      setTool(toolRes.data);
      
      // Dacă am găsit cel puțin un tichet deschis în listă, îl salvăm pe cel mai recent
      if (repairActiveRes.data && repairActiveRes.data.length > 0) {
        setActiveRepair(repairActiveRes.data[0]);
      } else {
        setActiveRepair(null);
      }

      setParts(partsRes.data || []);
      setRepairHistory(historyRes.data || []);
    } catch (error) {
      console.error("Eroare la încărcarea fișei tehnice:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLiveToolData();
  }, [cleanToolNumber]);

  // FUNCȚIE NOUĂ: Modificarea stocului (+/-) direct în Supabase, vizibilă peste tot în aplicație
  async function handleStockChange(partId: number, currentStock: number, delta: number) {
    try {
      setIsUpdatingStock(partId);
      const newStock = Math.max(0, currentStock + delta); // Nu permitem stoc negativ

      const { error } = await supabase
        .from("spare_parts")
        .update({ stock_quantity: newStock })
        .eq("id", partId);

      if (error) throw error;

      // Actualizăm starea locală a pieselor instantaneu pe ecran
      setParts(prevParts => 
        prevParts.map(part => 
          part.id === partId ? { ...part, stock_quantity: newStock } : part
        )
      );
    } catch (error: any) {
      alert("Eroare la actualizarea stocului: " + error.message);
    } finally {
      setIsUpdatingStock(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">
        Se încarcă fișa tehnică live pentru {cleanToolNumber}...
      </div>
    );
  }

  const dynamicStatus = activeRepair ? activeRepair.status : "Available";

  const statusColor = 
    dynamicStatus === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    dynamicStatus?.toLowerCase() === "new" ? "bg-blue-50 text-blue-700 border-blue-200" :
    dynamicStatus?.toLowerCase() === "testing" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
    "bg-amber-50 text-amber-700 border-amber-200"; // In Progress
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header-ul paginii tehnice */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {tool?.tool_number || cleanToolNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Fișă tehnică de monitorizare reper și mentenanță.</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}>
          ● {dynamicStatus}
        </span>
      </div>

      {/* Indicatori de Gestiune */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locație Depozitare</p>
            <p className="text-lg font-black text-slate-800 mt-1">{tool?.kardex_shelf ? `Raft ${tool.kardex_shelf}` : "Nalocat"}</p>
          </div>
          <span className="text-2xl p-3 bg-slate-50 rounded-xl">🏢</span>
        </div>
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reparații</p>
            <p className="text-lg font-black text-slate-800 mt-1">{repairHistory?.length || 0} intervenții</p>
          </div>
          <span className="text-2xl p-3 bg-slate-50 rounded-xl">🛠️</span>
        </div>
      </div>

      {/* Tabel 1: Piese Asociate (Cu butoane de stoc noi) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Piese de Schimb Asociate (Kardex)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Cod ENDR</th>
                <th className="py-3 px-6">Specificație Tehnică</th>
                <th className="py-3 px-6">Locație Raft</th>
                <th className="py-3 px-6 text-center w-48">Gestiune Stoc Live</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {parts && parts.length > 0 ? (
                parts.map((part: any) => {
                  const currentQty = part.stock_quantity || 0;
                  const isPending = isUpdatingStock === part.id;

                  return (
                    <tr key={part.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-indigo-600">{part.endr_code}</td>
                      <td className="py-3.5 px-6 font-medium text-slate-800">{part.specification || "-"}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">{part.kardex_shelf ? `Raft ${part.kardex_shelf}` : "-"}</td>
                      
                      {/* MODIFICAT: Celulă nouă pentru controlul stocului cu butoane premium + / - */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleStockChange(part.id, currentQty, -1)}
                            disabled={isPending || currentQty <= 0}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 shadow-sm disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
                            title="Scade o piesă din stoc"
                          >
                            -
                          </button>
                          
                          <span className={`min-w-[60px] text-center font-mono font-black text-xs px-2 py-1 rounded ${
                            currentQty > 0 ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700 animate-pulse"
                          }`}>
                            {isPending ? "..." : `${currentQty} buc`}
                          </span>

                          <button
                            onClick={() => handleStockChange(part.id, currentQty, 1)}
                            disabled={isPending}
                            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded-lg font-black text-sm transition-colors border border-slate-200/60 shadow-sm disabled:opacity-40"
                            title="Adaugă o piesă în stoc"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">Nu există piese asociate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel 2: Istoric Reparații */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Istoric Intervenții și Mentenanță</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">ID Tichet</th>
                <th className="py-3 px-6">Dată</th>
                <th className="py-3 px-6">Defecțiune</th>
                <th className="py-3 px-6">Tehnician</th>
                <th className="py-3 px-6">Piese Consumate</th>
                <th className="py-3 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {repairHistory && repairHistory.length > 0 ? (
                repairHistory.map((rep: any) => (
                  <tr key={rep.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-400">#{rep.id}</td>
                    <td className="py-3.5 px-6 text-xs font-medium text-slate-500">{new Date(rep.created_at).toLocaleDateString("ro-RO")}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-800 max-w-xs truncate" title={rep.failure || ""}>{rep.failure}</td>
                    <td className="py-3.5 px-6 text-slate-700 font-semibold">🧑‍🔧 {rep.technician || "Nalocat"}</td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-500">
                      {rep.replaced_part ? `📦 ${rep.replaced_part} (x${rep.part_quantity || 0})` : "-"}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase ${rep.status?.toLowerCase() === "closed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {rep.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">Nu există intervenții în istoric.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
