"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

export default function ReportsPage() {
  // Preluăm obiectul de traduceri din contextul tău global (RO/EN/TR)
  const { t }: { t: any } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setStats] = useState({
    totalTickets: 0,
    activeTickets: 0,
    completedTickets: 0,
    highPriorityCount: 0,
    partsConsumed: 0,
  });

  const [techPerformance, setTechPerformance] = useState<{ name: string; count: number }[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<{ type: string; count: number }[]>([]);

  async function calculateReportsData() {
    try {
      setIsLoading(true);

      const { data: repairs, error } = await supabase
        .from("repairs")
        .select("id, status, priority, technician, part_quantity");

      if (error) throw error;

      if (repairs) {
        const total = repairs.length;
        const active = repairs.filter(r => r.status?.toLowerCase() !== "closed").length;
        const completed = repairs.filter(r => r.status?.toLowerCase() === "closed").length;
        const highPriority = repairs.filter(r => r.priority === "High").length;
        
        const totalParts = repairs.reduce((acc, curr) => acc + (curr.part_quantity || 0), 0);

        setStats({
          totalTickets: total,
          activeTickets: active,
          completedTickets: completed,
          highPriorityCount: highPriority,
          partsConsumed: totalParts
        });

        const techMap: Record<string, number> = {};
        repairs.forEach(r => {
          if (r.status?.toLowerCase() === "closed" && r.technician) {
            techMap[r.technician] = (techMap[r.technician] || 0) + 1;
          }
        });
        const formattedTechs = Object.keys(techMap).map(key => ({
          name: key,
          count: techMap[key]
        })).sort((a, b) => b.count - a.count);
        setTechPerformance(formattedTechs);

        const priorityMap: Record<string, number> = {};
        repairs.forEach(r => {
          const pr = r.priority || "Medium";
          priorityMap[pr] = (priorityMap[pr] || 0) + 1;
        });
        const formattedPriorities = Object.keys(priorityMap).map(key => ({
          type: key,
          count: priorityMap[key]
        }));
        setPriorityDistribution(formattedPriorities);
      }
    } catch (err) {
      console.error("Eroare la calcularea rapoartelor:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    calculateReportsData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-medium text-slate-400 animate-pulse">
        Loading...
      </div>
    );
  }
  return (
    <div className="space-y-8 pb-12">
      {/* Antet Pagina Tradus din Context */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t.reportsTitle || "Rapoarte Performanță Ateliere"}
        </h1>
        <p className="text-gray-500 mt-1">
          {t.reportsSub || "Analiza metricilor cheie (KPI), eficienței echipei și consumului de piese din Supabase."}
        </p>
      </div>

      {/* Rând Indicatori Rapizi (KPI Cards) cu traduceri dinamice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.rateFinalizare || "Rată Finalizare"}
          </p>
          <div className="flex justify-between items-baseline mt-2">
            <h2 className="text-3xl font-black text-slate-800">
              {metrics.totalTickets > 0 ? Math.round((metrics.completedTickets / metrics.totalTickets) * 100) : 0}%
            </h2>
            <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Live</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.completedTickets} {t.din || "din"} {metrics.totalTickets} {t.ticheteInchise || "tichete închise"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.cardRepairs || "Tichete Active"}
          </p>
          <div className="flex justify-between items-baseline mt-2">
            <h2 className="text-3xl font-black text-amber-600">{metrics.activeTickets}</h2>
            <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">
              {t.inServiceBadge || "In Service"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {t.activeRepairsSub || "Reparații ce necesită atenție urgentă"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.sculeRisc || "Scule Risc Ridicat"}
          </p>
          <div className="flex justify-between items-baseline mt-2">
            <h2 className="text-3xl font-black text-rose-600">{metrics.highPriorityCount}</h2>
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">High Priority</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {t.highPrioritySub || "Matrițe marcate cu prioritate mare"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.pieseConsumateTitle || "Piese Consumate"}
          </p>
          <div className="flex justify-between items-baseline mt-2">
            <h2 className="text-3xl font-black text-slate-800">{metrics.partsConsumed}</h2>
            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">Kardex Out</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {t.kardexOutSub || "Total unități scăzute din stoc automat"}
          </p>
        </div>
      </div>

      {/* Grid Secțiuni Analitice (Grafice Structurale CSS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Caseta 1: Eficiență și Top Tehnicieni */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {t.clasamentTech || "Clasament Eficiență Tehnicieni"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.clasamentTechSub || "Numărul total de lucrări remediate cu succes și închise."}
            </p>
          </div>

          <div className="space-y-4">
            {techPerformance.length > 0 ? (
              techPerformance.map((tech) => {
                const maxCount = techPerformance[0]?.count || 1;
                const percentage = Math.round((tech.count / maxCount) * 100);

                return (
                  <div key={tech.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>🧑‍🔧 {tech.name}</span>
                      <span className="text-slate-900 font-black">
                        {tech.count} {tech.count === 1 ? (t.toolSingular || "kalıplar") : (t.toolPlural || "kalıplar")}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                {t.noTechData || "Nu există date despre tehnicieni în tichetele închise."}
              </p>
            )}
          </div>
        </div>

        {/* Caseta 2: Analiza Priorităților și Încărcării pe Linii */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {t.analizaIncarcare || "Analiza Încărcării după Prioritate"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.analizaIncarcareSub || "Distribuția totală a defectelor semnalate din producție."}
            </p>
          </div>

          <div className="space-y-4">
            {priorityDistribution.map((pr) => {
              const total = metrics.totalTickets || 1;
              const barWidth = Math.round((pr.count / total) * 100);
              
              const colorClass = 
                pr.type === "High" ? "bg-rose-500" : 
                pr.type === "Low" ? "bg-slate-400" : "bg-amber-500";

              // Mapare dinamică pentru numele priorităților în engleză/turcă
              const translatedPriority = 
                pr.type === "High" ? (t.priorityHigh || "High") : 
                pr.type === "Low" ? (t.priorityLow || "Low") : (t.priorityMedium || "Medium");

              return (
                <div key={pr.type} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                      {translatedPriority}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {pr.count} {t.tichete || "tichete"} ({barWidth}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-100 h-3 rounded-lg overflow-hidden">
                    <div 
                      className={`${colorClass} h-full transition-all duration-500`} 
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
