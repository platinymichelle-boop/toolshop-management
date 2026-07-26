"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalTools: 0,
    spareParts: 0,
    openRepairs: 0,
    technicians: 0,
    activeImprovements: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setIsLoading(true);

        const [toolsRes, partsRes, repairsRes, techsRes, impRes] = await Promise.all([
          supabase.from("tools").select("*", { count: "exact", head: true }),
          supabase.from("spare_parts").select("*", { count: "exact", head: true }),
          supabase.from("repairs").select("*", { count: "exact", head: true }).neq("status", "Closed"),
          supabase.from("technicians").select("*", { count: "exact", head: true }).eq("active", true),
          supabase.from("improvements").select("*", { count: "exact", head: true }).neq("status", "Implemented"),
        ]);

        setStats({
          totalTools: toolsRes.count || 0,
          spareParts: partsRes.count || 0,
          openRepairs: repairsRes.count || 0,
          technicians: techsRes.count || 0,
          activeImprovements: impRes.count || 0
        });
      } catch (error) {
        console.error("Eroare la preluarea statisticilor:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Banner de Bun Venit Executiv */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            Sistem Management Operational
          </span>
          <h1 className="text-3xl font-black mt-2 tracking-tight">
            ToolShop Pro — Control Panel
          </h1>
          <p className="text-slate-300 mt-2 text-sm max-w-xl">
            Sistem integrat pentru monitorizarea stocurilor, eficienței tehnicienilor și implementarea fluxurilor Kaizen de îmbunătățire continuă.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 text-[12rem] font-black select-none pointer-events-none translate-y-12 translate-x-6">
          ⚙️
        </div>
      </div>

      {/* Grid Premium cu Indicatori Cheie (KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Card: Scule */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Scule</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.totalTools}</h2>
            </div>
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl text-lg font-bold">🧰</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span>●</span> Live din depozit
          </div>
        </div>

        {/* Card: Piese de schimb */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Piese Stoc</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">
                {isLoading ? "..." : stats.spareParts.toLocaleString("ro-RO")}
              </h2>
            </div>
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl text-lg font-bold">📦</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Sistem Kardex integrat</span>
          </div>
        </div>

        {/* Card: Reparații Active */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">În Service</p>
              <h2 className={`text-3xl font-black mt-1 ${stats.openRepairs > 5 ? "text-rose-600" : "text-slate-800"}`}>
                {isLoading ? "..." : stats.openRepairs}
              </h2>
            </div>
            <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-lg font-bold">🔧</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <span>⚠️ Necesită atenție</span>
          </div>
        </div>

        {/* Card: Tehnicieni */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tehnicieni</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.technicians}</h2>
            </div>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-lg font-bold">👨‍🔧</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>Disponibili azi</span>
          </div>
        </div>

        {/* Card NOU: Improvements (Ideea Proiectului!) */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Kaizen / Idei</p>
              <h2 className="text-3xl font-black text-indigo-950 mt-1">{isLoading ? "..." : stats.activeImprovements}</h2>
            </div>
            <span className="p-2.5 bg-indigo-500 text-white rounded-xl text-lg font-bold shadow-sm">💡</span>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
            <span>🚀 Propuneri active</span>
          </div>
        </div>

      </div>

      {/* Secțiune Grafică Secundară: Starea Încărcării Atelierului */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Eficientizarea Proceselor din Atelier</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>Rată de ocupare tehnicieni</span>
              <span>85%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[85%] rounded-full"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>Acuratețe Stoc Piese (Kardex Automatic)</span>
              <span>99.4%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[99.4%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
