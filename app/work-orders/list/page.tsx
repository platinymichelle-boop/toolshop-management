"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus } from "lucide-react"; // Am adăugat Plus pentru optimizare UI pe mobil

interface WorkOrder {
  id: number;
  created_at: string;
  wo_number: string;
  tool_number: string;
  tool_id?: string;
  scheduled_date: string;
  status: string;
  created_by: string;
  actions_count: number;
}

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkOrders() {
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setWorkOrders(data || []);
      } catch (err: any) {
        alert(err.message || "Failed to load work orders");
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto font-medium text-slate-600">
        Loading work orders...
      </div>
    );
  }

  return (
    // Păstrăm structura adaptivă de padding (p-4 pe mobil, p-6 pe desktop)
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 
        [MODIFICARE ANTET RESPONSIVE] 
        Trecem de la flex-row fix la flex-col pe mobil pentru ca titlul 
        și butoanele să nu se suprapună sau să iasă din ecran.
      */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Work Orders History
        </h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            href="/preventive-maintenance"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <Link
            href="/work-orders"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New WO</span>
          </Link>
        </div>
      </div>

      {/* 
        [REZOLVARE COMPLETA SCROLL MOBIL] 
        Schimbăm overflow-hidden cu overflow-x-auto pe containerul exterior al tabelului.
        Adăugăm min-w-[700px] pe eticheta <table> pentru a forța browserul de pe telefon 
        să genereze scroll-ul orizontal nativ, lăsând toate coloanele vizibile la glisare (swipe).
      */}
      <div className="bg-white border rounded-xl overflow-x-auto shadow-sm select-none">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs md:text-sm font-semibold whitespace-nowrap">
              <th className="p-4">WO Number</th>
              <th className="p-4">Tool Number</th>
              <th className="p-4">Scheduled Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions Count</th>
              <th className="p-4">Created By</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs md:text-sm whitespace-nowrap">
            {workOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-slate-400 font-medium italic"
                >
                  No work orders generated yet.
                </td>
              </tr>
            ) : (
              workOrders.map((wo) => (
                <tr
                  key={wo.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4 font-bold text-blue-600">
                    {wo.wo_number}
                  </td>
                  <td className="p-4 font-medium text-slate-800">
                    {wo.tool_number || wo.tool_id}
                  </td>
                  <td className="p-4 text-slate-600">
                    {new Date(wo.scheduled_date).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      {wo.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">
                    {wo.actions_count} tasks
                  </td>
                  <td className="p-4 text-slate-600">{wo.created_by}</td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="inline-flex px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors"
                    >
                      View & Print
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
