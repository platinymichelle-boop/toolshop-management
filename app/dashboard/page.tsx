"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTools: 0,
    spareParts: 0,
    openRepairs: 0,
    closedRepairs: 0, // Adăugat pentru sculele finalizate
    technicians: 0,
    activeImprovements: 0
  });

  // Funcție extrasă pentru a putea fi apelată și la prima încărcare, dar și la modificări live
  async function fetchDashboardStats() {
    try {
      const [toolsRes, partsRes, repairsRes, closedRes, techsRes, impRes] = await Promise.all([
        supabase.from("tools").select("*", { count: "exact", head: true }),
        supabase.from("spare_parts").select("*", { count: "exact", head: true }),
        supabase.from("repairs").select("*", { count: "exact", head: true }).neq("status", "Closed"),
        supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "Closed"), // Interogare scule finalizate
        supabase.from("technicians").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("improvements").select("*", { count: "exact", head: true }).neq("status", "Implemented"),
      ]);

      setStats({
        totalTools: toolsRes.count || 0,
        spareParts: partsRes.count || 0,
        openRepairs: repairsRes.count || 0,
        closedRepairs: closedRes.count || 0, // Salvare valoare
        technicians: techsRes.count || 0,
        activeImprovements: impRes.count || 0
      });
    } catch (error) {
      console.error("Eroare la preluarea statisticilor:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    // 1. Preluăm datele inițiale
    fetchDashboardStats();

    // 2. Ascultăm în timp real modificările din tabelele cheie
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "repairs" },
        () => {
          fetchDashboardStats(); // Recalculează când se adaugă/modifică/șterge un tichet de reparație
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tools" },
        () => {
          fetchDashboardStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "improvements" },
        () => {
          fetchDashboardStats();
        }
      )
      .subscribe();

    // Curățăm abonamentul (subscription) când utilizatorul părăsește pagina
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const localeFormat = language === "en" ? "en-US" : language === "tr" ? "tr-TR" : "ro-RO";

  return (
    <div className="space-y-8">
      {/* Banner de Bun Venit Executiv */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-2xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            {t.dashBadge}
          </span>
          <h1 className="text-3xl font-black mt-2 tracking-tight">{t.dashTitle}</h1>
          <p className="text-slate-300 mt-2 text-sm max-w-xl">{t.dashSub}</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 text-[12rem] font-black select-none pointer-events-none translate-y-12 translate-x-6">⚙️</div>
      </div>

      {/* Grid Premium modificat la 6 coloane (lg:grid-cols-6) pentru noul card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        
        {/* Card CLICABIL: Scule */}
        <Link href="/tools" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">{t.cardTools}</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.totalTools}</h2>
            </div>
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl text-lg font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">🧰</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span>●</span> {t.cardToolsSub}
          </div>
        </Link>

        {/* Card CLICABIL: Piese de schimb */}
        <Link href="/spare-parts" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-amber-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-amber-600 transition-colors">{t.cardParts}</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.spareParts.toLocaleString(localeFormat)}</h2>
            </div>
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl text-lg font-bold group-hover:bg-amber-500 group-hover:text-white transition-all">📦</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>{t.cardPartsSub}</span>
          </div>
        </Link>

        {/* Card CLICABIL: Reparații Active */}
        <Link href="/repairs" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-rose-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-rose-500 transition-colors">{t.cardRepairs}</p>
              <h2 className={`text-3xl font-black mt-1 ${stats.openRepairs > 5 ? "text-rose-600" : "text-slate-800"}`}>{isLoading ? "..." : stats.openRepairs}</h2>
            </div>
            <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-lg font-bold group-hover:bg-rose-500 group-hover:text-white transition-all">🔧</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <span>{t.cardRepairsSub}</span>
          </div>
        </Link>
        {/* Card CLICABIL: Scule Finalizate (Completed Tools) */}
        <Link href="/repairs" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Completed Tools</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.closedRepairs}</h2>
            </div>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-lg font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">✅</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>Ready for assembly</span>
          </div>
        </Link>

        {/* Card CLICABIL: Tehnicieni */}
        <Link href="/technicians" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">{t.cardTechs}</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.technicians}</h2>
            </div>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-lg font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">👨‍🔧</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>{t.cardTechsSub}</span>
          </div>
        </Link>

        {/* Card CLICABIL: Improvements */}
        <Link href="/improvements" className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">KAIZEN / IDEAS</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{isLoading ? "..." : stats.activeImprovements}</h2>
            </div>
            <span className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl text-lg font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">💡</span>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-100/30 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <span>Active proposals</span>
          </div>
        </Link>

      </div>

      {/* Secțiunea inferioară: Eficiență */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Workshop Process Efficiency</h3>
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
          <span>Technician occupancy rate</span>
          <span className="text-slate-800 font-black">85%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: "85%" }}></div>
        </div>
      </div>

    </div>
  );
}
