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
    technicians: 0,
    activeImprovements: 0
  });

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

      {/* Grid Premium cu Indicatori Cheie (KPI) transformați în link-uri navigabile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
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
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">{t.cardKaizen}</p>
              <h2 className="text-3xl font-black text-indigo-950 mt-1">{isLoading ? "..." : stats.activeImprovements}</h2>
            </div>
            <span className="p-2.5 bg-indigo-500 text-white rounded-xl text-lg font-bold shadow-sm group-hover:bg-indigo-600 transition-all">💡</span>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
            <span>{t.cardKaizenSub}</span>
          </div>
        </Link>

      </div>

      {/* Secțiune Grafică Secundară */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">{t.sectionTitle}</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>{t.barTechs}</span>
              <span>85%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[85%] rounded-full"></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>{t.barStock}</span>
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
