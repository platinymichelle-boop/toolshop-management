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
}

interface PageProps {
  params: Promise<{ week: string; year: string }>;
}

export default function ProductionApprovalPage({ params }: PageProps) {
  const { week, year } = use(params);
  const weekNum = Number(week);
  const yearNum = Number(year);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPlans();
  }, [weekNum, yearNum]);

  async function fetchPlans() {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_maintenance_plans")
      .select("id, tool_number, machine_name, planned_day, duration_minutes, production_status, production_comment, week_number, year")
      .eq("week_number", weekNum)
      .eq("year", yearNum);

    if (!error && data) {
      setPlans(data as PlanItem[]);
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
    
    // Update optimist local
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, production_status: status, production_comment: comment } : p))
    );

    const { error } = await supabase
      .from("weekly_maintenance_plans")
      .update({
        production_status: status,
        production_comment: comment,
        approved_at: new Date().toISOString(),
        approved_by: "Production Manager"
      })
      .eq("id", Number(id));

    if (error) {
      alert(`Eroare la salvare: ${error.message}`);
      fetchPlans();
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
    { approved: 0, rejected: 0, pending: 0, minutes: 0 }
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Loading approval dashboard...</p>
      </div>
    );
  }
  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Week {weekNum}, {yearNum} - Production Approval</h1>
        <p className="text-sm text-slate-500 mt-1">Review the maintenance schedule and approve or reject downtime windows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Approved</p><p className="text-2xl font-extrabold text-emerald-600">{totals.approved}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Rejected</p><p className="text-2xl font-extrabold text-red-600">{totals.rejected}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Pending</p><p className="text-2xl font-extrabold text-amber-500">{totals.pending}</p></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Total Hours</p><p className="text-2xl font-extrabold text-slate-700">{(totals.minutes / 60).toFixed(1)} h</p></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase border-b">
              <th className="py-3 px-4">Machine ID</th><th className="py-3 px-4">Equipment</th><th className="py-3 px-4">Day</th><th className="py-3 px-4">Duration</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Comment</th><th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-slate-700">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-4 px-4 font-mono font-bold">{p.tool_number}</td>
                <td className="py-4 px-4">{p.machine_name || "N/A"}</td>
                <td className="py-4 px-4 text-xs font-semibold text-slate-500">{p.planned_day}</td>
                <td className="py-4 px-4">{p.duration_minutes} min</td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.production_status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : p.production_status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{p.production_status}</span>
                </td>
                <td className="py-4 px-4">
                  <input type="text" value={comments[p.id] || ""} onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })} placeholder="Add reason..." className="border rounded px-2 py-1 text-xs w-full focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => updateStatus(p.id, "APPROVED")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded transition-colors">✅ Approve</button>
                  <button onClick={() => updateStatus(p.id, "REJECTED")} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1 rounded transition-colors">❌ Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
