"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
    return <div className="p-6 max-w-7xl mx-auto font-medium text-slate-600">Loading work orders...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Work Orders History</h1>
        <Link href="/work-orders" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm">
          + New Work Order
        </Link>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-semibold">
              <th className="p-4">WO Number</th>
              <th className="p-4">Tool Number</th>
              <th className="p-4">Scheduled Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions Count</th>
              <th className="p-4">Created By</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {workOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                  No work orders generated yet.
                </td>
              </tr>
            ) : (
              workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-blue-600">{wo.wo_number}</td>
                  <td className="p-4 font-medium text-slate-800">{wo.tool_number || wo.tool_id}</td>
                  <td className="p-4 text-slate-600">{new Date(wo.scheduled_date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      {wo.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{wo.actions_count} tasks</td>
                  <td className="p-4 text-slate-600">{wo.created_by}</td>
                  <td className="p-4 text-right space-x-2">
                    <Link href={`/work-orders/${wo.id}`} className="inline-flex px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 transition-colors">
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
