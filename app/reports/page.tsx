"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

interface ReportStats {
  totalRepairs: number;
  completedRepairs: number;
  inProgressRepairs: number;
  urgentRepairs: number;
  avgHoursWorked: number;
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReportStats>({
    totalRepairs: 0,
    completedRepairs: 0,
    inProgressRepairs: 0,
    urgentRepairs: 0,
    avgHoursWorked: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function calculateReports() {
      try {
        setIsLoading(true);

        const { data: repairs, error } = await supabase
          .from("repairs")
          .select("status, priority, hours_worked");

        if (error) throw error;

        if (repairs) {
          const total = repairs.length;
          const completed = repairs.filter(r => r.status === "Closed" || r.status === "Finalizat").length;
          const urgent = repairs.filter(r => r.priority === "High" || r.priority === "Urgent").length;
          const inProgress = total - completed;

          const validHours = repairs.filter(r => r.hours_worked !== null) as { hours_worked: number }[];
          const totalHours = validHours.reduce((sum, r) => sum + Number(r.hours_worked), 0);
          const avgHours = validHours.length > 0 ? Math.round((totalHours / total) * 10) / 10 : 0;

          setStats({
            totalRepairs: total,
            completedRepairs: completed,
            inProgressRepairs: inProgress,
            urgentRepairs: urgent,
            avgHoursWorked: avgHours,
          });
        }
      } catch (error: any) {
        console.error("Eroare la generarea raportului:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    calculateReports();
  }, []);

  const completionRate = stats.totalRepairs > 0 
    ? Math.round((stats.completedRepairs / stats.totalRepairs) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Antet */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t.repPageTitle}
        </h1>
        <p className="text-gray-500 mt-1">
          {t.repPageSub}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t.repLoading}</p>
      ) : (
        <>
          {/* Rândul Principal de Indicatori */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rata de Închidere */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">{t.kpiResolveRate}</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-black text-slate-800">{completionRate}%</h2>
                  <p className="text-xs text-green-600 font-medium">{t.kpiTotalService}</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Media de ore lucrate */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">{t.kpiAvgTime}</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-black text-slate-800">{stats.avgHoursWorked} h</h2>
                  <p className="text-xs text-blue-600 font-medium">{t.kpiPerTool}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">{t.kpiHoursCalc}</p>
            </div>

            {/* Încărcare Urgențe */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">{t.kpiCritical}</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-black text-rose-600">{stats.urgentRepairs}</h2>
                  <p className="text-xs text-gray-500 font-medium">{t.kpiHighPriority}</p>
                </div>
              </div>
              <p className="text-xs text-amber-600 font-medium mt-4">{t.kpiImmediateAttention}</p>
            </div>

          </div>

          {/* Rezumatul Tabelului Executiv */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t.secVolTitle}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-gray-100">
              <div className="p-2">
                <span className="text-xs font-medium text-gray-400 uppercase">{t.tabTotal}</span>
                <p className="text-2xl font-bold text-slate-700 mt-1">{stats.totalRepairs}</p>
              </div>
              <div className="p-2">
                <span className="text-xs font-medium text-gray-400 uppercase">{t.tabActive}</span>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgressRepairs}</p>
              </div>
              <div className="p-2">
                <span className="text-xs font-medium text-gray-400 uppercase">{t.tabCompleted}</span>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedRepairs}</p>
              </div>
              <div className="p-2">
                <span className="text-xs font-medium text-gray-400 uppercase">{t.tabStockEff}</span>
                <p className="text-2xl font-bold text-blue-600 mt-1">{t.tabStable}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
