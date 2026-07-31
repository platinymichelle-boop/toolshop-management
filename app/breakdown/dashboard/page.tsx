"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function BreakdownDashboard() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    mttrMinutes: 0,
  });

  useEffect(() => {
    async function loadBreakdownData() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("breakdowns")
          .select("*")
          .order("start_time", { ascending: false });

        if (error) throw error;
        if (data) {
          setHistory(data);
          calculateStats(data);
        }
      } catch (err) {
        console.error("Eroare la încărcarea istoricului:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBreakdownData();
  }, []);

  // Calculează indicatorii cheie de performanță (KPIs) pentru management
  const calculateStats = (data: any[]) => {
    const total = data.length;
    const active = data.filter((item) => item.status === "Running").length;
    const completed = data.filter((item) => item.status === "Completed" && item.end_time);

    let totalDurationMinutes = 0;
    completed.forEach((item) => {
      const start = new Date(item.start_time).getTime();
      const end = new Date(item.end_time).getTime();
      totalDurationMinutes += (end - start) / 1000 / 60; // Convertim în minute
    });

    const mttr = completed.length > 0 ? Math.round(totalDurationMinutes / completed.length) : 0;

    setStats({
      totalIncidents: total,
      activeIncidents: active,
      mttrMinutes: mttr,
    });
  };

  // Formatează durata dintre start_time și end_time într-un format lizibil
  const formatDuration = (startStr: string, endStr: string | null) => {
    if (!endStr) return "În desfășurare";
    const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };
  return (
    <div className="p-6 max-w-6xl mx-auto bg-slate-900 min-h-screen text-slate-100 pb-20">
      
      {/* Antet de control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-amber-500">
            📊 Management Breakdown Analytics
          </h1>
          <p className="text-xs text-slate-400">Monitorizare MTTR, timpi de staționare și istoric intervenții.</p>
        </div>
        <Link 
          href="/breakdown" 
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
        >
          ➕ Înregistrează Avarie Nouă
        </Link>
      </div>

      {/* Carduri Statistice (KPIs pentru Management) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
          <div className="text-xs font-bold uppercase text-slate-400">Total Incidente Raportate</div>
          <div className="text-3xl font-black text-white mt-1">{stats.totalIncidents}</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md border-l-4 border-l-red-500">
          <div className="text-xs font-bold uppercase text-slate-400">Opriri Active (Live)</div>
          <div className="text-3xl font-black text-red-500 mt-1">{stats.activeIncidents}</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md border-l-4 border-l-amber-500">
          <div className="text-xs font-bold uppercase text-slate-400">MTTR (Timp Mediu de Reparație)</div>
          <div className="text-3xl font-black text-amber-500 mt-1">
            {stats.mttrMinutes} <span className="text-sm font-normal text-slate-400">minute</span>
          </div>
        </div>
      </div>

      {/* Tabel Istoric Evenimente */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 font-bold text-sm uppercase tracking-wider text-slate-300">
          Registru complet de avarii
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-700 text-xs font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Utilaj / Linie</th>
                <th className="py-3 px-4">Tehnician</th>
                <th className="py-3 px-4">Detalii defect & Matriță</th>
                <th className="py-3 px-4">Durată Reparație</th>
                <th className="py-3 px-4 text-center">Foto (Inainte / Dupa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 animate-pulse">
                    Se încarcă datele pentru management...
                  </td>
                </tr>
              ) : history.length > 0 ? (
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {row.press_number}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {row.technician_name}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" title={row.issue_description}>
                      {row.issue_description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                        row.status === "Running" 
                          ? "bg-red-500/10 text-red-500 animate-pulse" 
                          : "bg-slate-950 text-emerald-400"
                      }`}>
                        {formatDuration(row.start_time, row.end_time)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-2">
                        {row.image_before_url && (
                          <a 
                            href={row.image_before_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-amber-500 hover:underline font-semibold"
                          >
                            📸 Before
                          </a>
                        )}
                        {row.image_after_url && (
                          <a 
                            href={row.image_after_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-emerald-500 hover:underline font-semibold"
                          >
                            📸 After
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nu există nicio avarie înregistrată în baza de date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
