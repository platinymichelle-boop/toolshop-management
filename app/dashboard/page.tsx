"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Wrench,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Users,
  Lightbulb,
  Clock,
  TrendingUp,
  FileText,
} from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  colorClass,
}) => (
  <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
  </div>
);

interface Breakdown {
  id: string;
  created_at: string;
  press_number: string;
  technician_name?: string;
  description: string;
  status: string;
}

interface Repair {
  id: string;
  created_at: string;
  press_number: string;
  description: string;
  status: string;
  technician_name?: string;
}

interface MachineBreakdownCount {
  press_number: string;
  count: number;
}

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [totalMachines, setTotalMachines] = useState<number>(0);
  const [openWorkOrders, setOpenWorkOrders] = useState<number>(0);
  const [completedWorkOrders, setCompletedWorkOrders] = useState<number>(0);
  const [activeBreakdowns, setActiveBreakdowns] = useState<number>(0);
  const [availableTechnicians, setAvailableTechnicians] = useState<number>(0);
  const [openImprovements, setOpenImprovements] = useState<number>(0);
  const [recentBreakdowns, setRecentBreakdowns] = useState<Breakdown[]>([]);
  const [topProblemMachines, setTopProblemMachines] = useState<
    MachineBreakdownCount[]
  >([]);
  const [openRepairs, setOpenRepairs] = useState<Repair[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { count: countTools } = await supabase
          .from("tools")
          .select("*", { count: "exact", head: true });
        setTotalMachines(countTools || 0);
        const { count: countOpenRepairs } = await supabase
          .from("repairs")
          .select("*", { count: "exact", head: true })
          .neq("status", "Closed");
        setOpenWorkOrders(countOpenRepairs || 0);
        const { count: countClosedRepairs } = await supabase
          .from("repairs")
          .select("*", { count: "exact", head: true })
          .eq("status", "Closed");
        setCompletedWorkOrders(countClosedRepairs || 0);
        const { count: countActiveBreakdowns } = await supabase
          .from("breakdowns")
          .select("*", { count: "exact", head: true })
          .neq("status", "Closed");
        setActiveBreakdowns(countActiveBreakdowns || 0);
        const { count: countTechs } = await supabase
          .from("technicians")
          .select("*", { count: "exact", head: true })
          .eq("active", true);
        setAvailableTechnicians(countTechs || 0);
        const { count: countImprovements } = await supabase
          .from("improvements")
          .select("*", { count: "exact", head: true })
          .neq("status", "Implemented");
        setOpenImprovements(countImprovements || 0);
        const { data: recentBreakdownsData } = await supabase
          .from("breakdowns")
          .select(
            "id, created_at, press_number, technician_name, description, status",
          )
          .order("created_at", { ascending: false })
          .limit(10);
        setRecentBreakdowns(recentBreakdownsData || []);
        const { data: openRepairsData } = await supabase
          .from("repairs")
          .select(
            "id, created_at, press_number, description, status, technician_name",
          )
          .neq("status", "Closed")
          .order("created_at", { ascending: false });
        setOpenRepairs(openRepairsData || []);
        const { data: allBreakdowns } = await supabase
          .from("breakdowns")
          .select("press_number");
        if (allBreakdowns && allBreakdowns.length > 0) {
          const counts: { [key: string]: number } = {};
          allBreakdowns.forEach((item) => {
            if (item.press_number)
              counts[item.press_number] = (counts[item.press_number] || 0) + 1;
          });
          const sortedMachines: MachineBreakdownCount[] = Object.keys(counts)
            .map((key) => ({ press_number: key, count: counts[key] }))
            .sort((a, b) => b.count - a.count);
          setTopProblemMachines(sortedMachines.slice(0, 5));
        } else {
          setTopProblemMachines([]);
        }
      } catch (error) {
        console.error("Error loading dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Maintenance Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview of shop floor operations and live equipment
            status.
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          Live Database Connected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Machines"
          value={totalMachines}
          icon={<Wrench className="h-6 w-6 text-blue-600" />}
          colorClass="bg-blue-100"
        />
        <KPICard
          title="Open Work Orders"
          value={openWorkOrders}
          icon={<ClipboardList className="h-6 w-6 text-yellow-600" />}
          colorClass="bg-yellow-100"
        />
        <KPICard
          title="Completed Work Orders"
          value={completedWorkOrders}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          colorClass="bg-green-100"
        />
        <KPICard
          title="Active Breakdowns"
          value={activeBreakdowns}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          colorClass="bg-red-100"
        />
        <KPICard
          title="Available Techs"
          value={availableTechnicians}
          icon={<Users className="h-6 w-6 text-teal-600" />}
          colorClass="bg-teal-100"
        />
        <KPICard
          title="Open Kaizens"
          value={openImprovements}
          icon={<Lightbulb className="h-6 w-6 text-purple-600" />}
          colorClass="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Breakdowns by Machine (Top 5)
            </h2>
          </div>
          <div className="space-y-4">
            {topProblemMachines.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                No recorded breakdown events found.
              </p>
            ) : (
              topProblemMachines.map((machine) => {
                const maxCount = topProblemMachines[0]?.count || 1;
                const percentage = (machine.count / maxCount) * 100;
                return (
                  <div key={machine.press_number} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-700">
                        Machine: {machine.press_number}
                      </span>
                      <span className="text-gray-500 font-medium">
                        {machine.count} incidents
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Top Problem Machines
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Press Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Breakdown Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {topProblemMachines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No machine incident metrics recorded.
                    </td>
                  </tr>
                ) : (
                  topProblemMachines.map((machine) => (
                    <tr key={machine.press_number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {machine.press_number}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {machine.count} Failures
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">
            Recent Breakdowns (Latest 10)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Press Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {recentBreakdowns.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No breakdowns found in historical records.
                  </td>
                </tr>
              ) : (
                recentBreakdowns.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {b.press_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {b.technician_name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">
                      {b.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.status === "Open" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">
            Open Work Orders (Active Repairs)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Logged
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Press Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Tech
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {openRepairs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    All work orders are completed! Clear backlog.
                  </td>
                </tr>
              ) : (
                openRepairs.map((repair) => (
                  <tr key={repair.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(repair.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {repair.press_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {repair.technician_name || "Pending Assignment"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-md">
                      {repair.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {repair.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;