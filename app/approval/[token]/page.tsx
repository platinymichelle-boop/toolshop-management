"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";

interface PlanItem {
  id: string;
  tool_number: string;
  machine_name: string;
  planned_day: string;
  duration_minutes: number;
  production_status: "PENDING" | "APPROVED" | "REJECTED";
  production_comment: string | null;
  week_number: number;
  year: number;
  shift?: string;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function PublicApprovalPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const token = unwrappedParams?.token;

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [weekInfo, setWeekInfo] = useState<{
    week: number;
    year: number;
  } | null>(null);

  useEffect(() => {
    if (token) {
      fetchPlansByToken();
    }
  }, [token]);

  async function fetchPlansByToken() {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_maintenance_plans")
      .select(
        "id, tool_number, machine_name, planned_day, duration_minutes, production_status, production_comment, week_number, year, shift",
      )
      .eq("approval_token", token);

    if (!error && data && data.length > 0) {
      setPlans(data as PlanItem[]);
      setWeekInfo({ week: data[0].week_number, year: data[0].year });

      const initialComments: { [key: string]: string } = {};
      data.forEach((p: any) => {
        initialComments[p.id] = p.production_comment || "";
      });
      setComments(initialComments);
    }
    setLoading(false);
  }
  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    const comment = comments[id] || "";

    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, production_status: status, production_comment: comment }
          : p,
      ),
    );

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .update({
        production_status: status,
        production_comment: comment,
        approved_at: new Date().toISOString(),
        approved_by: "Production Public Portal",
      })
      .eq("id", Number(id))
      .eq("approval_token", token);

    if (error) {
      alert(`Eroare la salvare: ${error.message}`);
      fetchPlansByToken();
    }
  }

  const totals = plans.reduce(
    (acc, p) => {
      if (p.production_status === "APPROVED") acc.approved++;
      else if (p.production_status === "REJECTED") acc.rejected++;
      else acc.pending++;
      acc.minutes += p.duration_minutes;
      return acc;
    },
    { approved: 0, rejected: 0, pending: 0, minutes: 0 },
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <p className="text-slate-500 font-semibold animate-pulse">
          Se încarcă panoul public de aprobare...
        </p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md border">
          <p className="text-red-500 text-5xl mb-3">⚠️</p>
          <h2 className="text-xl font-bold text-slate-800">
            Link Invalid sau Expirat
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Acest token de aprobare nu a fost găsit sau a fost retras de
            departamentul de Mentenanță.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 select-none">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border p-6 md:p-8">
        <div className="mb-8 border-b pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Production Portal
            </span>
            <h1 className="text-3xl font-black text-slate-900 mt-2">
              Week {weekInfo?.week} / {weekInfo?.year} - Maintenance Approval
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sursă securizată externă. Schimbările efectuate aici se transmit
              instant plannerului de mentenanță.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">
              Status Solicitare
            </p>
            <p className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md mt-1 inline-block">
              {totals.pending === 0
                ? "✅ EVALUAT COMPLET"
                : "⏳ NECESITĂ REVIZUIRE"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
              Aprobate
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {totals.approved}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
            <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
              Respinse
            </p>
            <p className="text-2xl font-black text-red-700 mt-1">
              {totals.rejected}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
              În Așteptare
            </p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {totals.pending}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Timp Oprire
            </p>
            <p className="text-2xl font-black text-slate-700 mt-1">
              {(totals.minutes / 60).toFixed(1)} ore
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider border-b">
                <th className="py-3.5 px-4">Machine ID</th>
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 w-64">Production Comment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {plans.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-4 px-4 font-mono font-black text-slate-900 bg-slate-50/50">
                    {p.tool_number}
                  </td>
                  <td className="py-4 px-4 font-medium">
                    {p.machine_name || "N/A"}
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-bold">
                      {p.planned_day}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                    {p.shift || "SHIFT 1"}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-600">
                    {p.duration_minutes} min
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${p.production_status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : p.production_status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {p.production_status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="text"
                      value={comments[p.id] || ""}
                      onChange={(e) =>
                        setComments({ ...comments, [p.id]: e.target.value })
                      }
                      placeholder="Scrie motivul selectării..."
                      className="border border-slate-300 rounded px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                    />
                  </td>
                  <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => updateStatus(p.id, "APPROVED")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => updateStatus(p.id, "REJECTED")}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    >
                      ❌ Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
