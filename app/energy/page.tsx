"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import EnergyForm from "@/components/EnergyForm";
import SapKpiImport from "@/components/SapKpiImport";
import {
  Layers,
  Activity,
  Star,
  AlertTriangle,
  TrendingUp,
  Zap,
  DollarSign,
  Euro,
  ShieldCheck,
  HelpCircle,
  Calendar,
  Cpu,
  CheckCircle2,
  XCircle,
  Info,
  Sliders,
  AlertCircle,
  Trash2,
  FolderUp,
  Settings,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function EnergyPage() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalGoodParts, setTotalGoodParts] = useState(0);
  const [costPerPart, setCostPerPart] = useState(0);
  const [kwhPerPart, setKwhPerPart] = useState(0);
  const [worstMachines, setWorstMachines] = useState<any[]>([]);
  const [averageOee, setAverageOee] = useState(0);
  const [energyScore, setEnergyScore] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [machineCount, setMachineCount] = useState(0);
  const [worstDowntime, setWorstDowntime] = useState<any[]>([]);
  const [topOpportunity, setTopOpportunity] = useState<any>(null);
  const [productionLoss, setProductionLoss] = useState(0);
  const [bestMachine, setBestMachine] = useState<any>(null);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [forecastGoodParts, setForecastGoodParts] = useState(0);
  const [forecastOee, setForecastOee] = useState(0);
  const [showEnergyForm, setShowEnergyForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshKey, selectedDate]);
  async function loadData() {
    const { data: latest } = await supabase
      .from("energy_consumption")
      .select("*")
      .order("period_date", { ascending: false })
      .limit(1)
      .single();

    setData(latest);

    const { data: dates } = await supabase
      .from("energy_sap_kpi")
      .select("report_date");

    const uniqueDates = [
      ...new Set((dates || []).map((d) => d.report_date).filter(Boolean)),
    ];

    const { data: bestOee } = await supabase
      .from("energy_sap_kpi")
      .select("work_center,oee")
      .eq("report_date", selectedDate)
      .order("oee", { ascending: false })
      .limit(1)
      .single();

    setBestMachine(bestOee);
    setAvailableDates(uniqueDates);

    if (!selectedDate && uniqueDates.length > 0) {
      setSelectedDate(uniqueDates[0]);
    }

    const { data: productionData } = await supabase
      .from("energy_sap_kpi")
      .select(
        `
        good_quantity,
        availability,
        performance
      `,
      )
      .eq("report_date", selectedDate);

    let loss = 0;
    (productionData || []).forEach((row) => {
      const good = Number(row.good_quantity || 0);
      const availability = Number(row.availability || 0);
      if (availability > 0) {
        const theoretical = good / (availability / 100);
        loss += theoretical - good;
      }
    });

    setProductionLoss(loss);
    const { data: trendData } = await supabase.from("energy_sap_kpi").select(`
      report_date,
      good_quantity,
      oee,
      scheduled_downtime_min,
      unscheduled_downtime_min
    `);

    const grouped: Record<string, any> = {};
    (trendData || []).forEach((row) => {
      const date = row.report_date;
      if (!grouped[date]) {
        grouped[date] = {
          report_date: date,
          good_parts: 0,
          total_oee: 0,
          oee_count: 0,
          downtime: 0,
        };
      }
      grouped[date].good_parts += Number(row.good_quantity || 0);
      grouped[date].total_oee += Number(row.oee || 0);
      grouped[date].oee_count += 1;
      grouped[date].downtime +=
        Number(row.scheduled_downtime_min || 0) +
        Number(row.unscheduled_downtime_min || 0);
    });

    const trend = Object.values(grouped).map((item: any) => ({
      report_date: item.report_date,
      good_parts: item.good_parts,
      average_oee: item.total_oee / item.oee_count,
      downtime: item.downtime,
    }));

    trend.sort((a: any, b: any) => a.report_date.localeCompare(b.report_date));
    setDailyTrend(trend);

    if (trend.length > 0) {
      const avgParts =
        trend.reduce((sum, day) => sum + day.good_parts, 0) / trend.length;
      const avgOeeTrend =
        trend.reduce((sum, day) => sum + day.average_oee, 0) / trend.length;
      const daysInMonth = 30;
      setForecastGoodParts(Math.round(avgParts * daysInMonth));
      setForecastOee(avgOeeTrend);
    }
    const { data: machines } = await supabase
      .from("energy_sap_kpi")
      .select("work_center")
      .eq("report_date", selectedDate);

    setMachineCount(machines?.length || 0);

    const { data: downtimeData } = await supabase
      .from("energy_sap_kpi")
      .select("work_center,scheduled_downtime_min,unscheduled_downtime_min")
      .eq("report_date", selectedDate);

    const rankedDowntime = (downtimeData || [])
      .map((m) => ({
        ...m,
        total_downtime:
          Number(m.scheduled_downtime_min || 0) +
          Number(m.unscheduled_downtime_min || 0),
      }))
      .sort((a, b) => b.total_downtime - a.total_downtime)
      .slice(0, 10);

    setWorstDowntime(rankedDowntime);

    const { data: machineData } = await supabase
      .from("energy_sap_kpi")
      .select(
        `
        work_center,
        good_quantity,
        oee,
        scheduled_downtime_min,
        unscheduled_downtime_min
      `,
      )
      .eq("report_date", selectedDate);

    const rankedMachines = (machineData || [])
      .map((m) => ({
        ...m,
        opportunityScore:
          100 -
          Number(m.oee || 0) +
          (Number(m.scheduled_downtime_min || 0) +
            Number(m.unscheduled_downtime_min || 0)) /
            10,
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    setTopOpportunity(rankedMachines[0]);

    const { data: historyData } = await supabase
      .from("energy_consumption")
      .select("*")
      .order("period_date", { ascending: false });

    setHistory(historyData || []);
    const { data: kpiData } = await supabase
      .from("energy_sap_kpi")
      .select("good_quantity")
      .eq("report_date", selectedDate);

    const totalParts =
      kpiData?.reduce((sum, row) => sum + Number(row.good_quantity || 0), 0) ||
      0;
    setTotalGoodParts(totalParts);

    if (latest && totalParts > 0) {
      setCostPerPart(Number(latest.energy_cost) / totalParts);
      setKwhPerPart(Number(latest.consumption_kwh) / totalParts);
    }

    const { data: worstOee } = await supabase
      .from("energy_sap_kpi")
      .select("work_center,oee")
      .eq("report_date", selectedDate)
      .order("oee", { ascending: true })
      .limit(10);

    setWorstMachines(worstOee || []);

    const { data: oeeData } = await supabase
      .from("energy_sap_kpi")
      .select("oee")
      .eq("report_date", selectedDate);

    const avgOee =
      oeeData && oeeData.length > 0
        ? oeeData.reduce((sum, row) => sum + Number(row.oee || 0), 0) /
          oeeData.length
        : 0;

    setAverageOee(avgOee);

    if (latest && Number(latest.consumption_kwh) > 0) {
      const score = (avgOee * totalParts) / Number(latest.consumption_kwh);
      setEnergyScore(score);
    }

    const dailyInsights: string[] = [];
    if (avgOee >= 85) {
      dailyInsights.push(`Excellent OEE performance (${avgOee.toFixed(1)}%).`);
    } else if (avgOee >= 70) {
      dailyInsights.push(`Good OEE performance (${avgOee.toFixed(1)}%).`);
    } else if (avgOee >= 60) {
      dailyInsights.push(`Average OEE performance (${avgOee.toFixed(1)}%).`);
    } else {
      dailyInsights.push(
        `Average OEE is low (${avgOee.toFixed(1)}%). Production efficiency should be reviewed.`,
      );
    }

    if (rankedMachines.length > 0) {
      dailyInsights.push(
        `${rankedMachines[0].work_center} is currently the biggest improvement opportunity.`,
      );
    }
    if (rankedDowntime.length > 0) {
      dailyInsights.push(
        `${rankedDowntime[0].work_center} has the highest downtime (${rankedDowntime[0].total_downtime.toFixed(0)} min).`,
      );
    }
    if (bestOee) {
      dailyInsights.push(
        `Best performing machine: ${bestOee.work_center} (${Number(bestOee.oee).toFixed(1)}% OEE).`,
      );
    }
    setInsights(dailyInsights);
  }

  async function deleteEnergyEntry(id: string) {
    await supabase.from("energy_consumption").delete().eq("id", id);
    loadData();
  }
  const getInsightStyle = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("excellent") || lower.includes("good oee")) {
      return {
        bg: "bg-emerald-950/30 border-emerald-800/60 text-emerald-300",
        icon: CheckCircle2,
      };
    }
    if (
      lower.includes("low") ||
      lower.includes("highest downtime") ||
      lower.includes("opportunity")
    ) {
      return {
        bg: "bg-rose-950/30 border-rose-800/60 text-rose-300",
        icon: XCircle,
      };
    }
    return {
      bg: "bg-amber-950/30 border-amber-800/60 text-amber-300",
      icon: AlertTriangle,
    };
  };

  return (
    <div className="space-y-8 p-6 bg-[#0f172a] min-h-screen text-[#f8fafc] font-sans antialiased selection:bg-blue-600">
      {/* SECTION 1: HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1.5">
            <Cpu className="h-3.5 w-3.5" /> Core Plant Systems
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Energy Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor, analyze and optimize plant energy and production
            efficiency.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex flex-col items-end shadow-inner">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Active Lines
            </span>
            <span className="text-base font-mono font-bold text-emerald-400">
              {machineCount} Units
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 ml-2" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-mono text-white focus:outline-none pr-8 cursor-pointer"
            >
              {availableDates.map((date) => (
                <option
                  key={date}
                  value={date}
                  className="bg-slate-900 text-white font-mono"
                >
                  {date}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Good Parts",
            value: totalGoodParts.toLocaleString(),
            sub: "Gross Output",
            icon: Layers,
            color: "text-blue-400",
          },
          {
            title: "Average OEE",
            value: `${averageOee.toFixed(1)}%`,
            sub: "Overall Plant Status",
            icon: Activity,
            color: averageOee >= 75 ? "text-emerald-400" : "text-amber-400",
          },
          {
            title: "Best OEE Machine",
            value: bestMachine?.work_center || "-",
            sub: `${Number(bestMachine?.oee || 0).toFixed(1)}% Peak OEE`,
            icon: Star,
            color: "text-purple-400",
          },
          {
            title: "Estimated Lost Parts",
            value: Math.round(productionLoss).toLocaleString(),
            sub: "Availability Gap Loss",
            icon: AlertTriangle,
            color: "text-red-400",
          },
          {
            title: "Biggest Opportunity",
            value: topOpportunity?.work_center || "-",
            sub: `Score: ${topOpportunity?.opportunityScore?.toFixed(1) || 0}`,
            icon: TrendingUp,
            color: "text-amber-400",
          },
          {
            title: "Consumption",
            value: `${Number(data?.consumption_kwh || 0).toLocaleString()} kWh`,
            sub: "Grid Distribution Load",
            icon: Zap,
            color: "text-blue-400",
          },
          {
            title: "Energy Cost",
            value: `€${Number(data?.energy_cost || 0).toLocaleString()}`,
            sub: "Accrued OPEX",
            icon: DollarSign,
            color: "text-amber-500",
          },
          {
            title: "Price / kWh",
            value: `€${Number(data?.price_per_kwh || 0).toFixed(4)}`,
            sub: "Contract Blended Rate",
            icon: Euro,
            color: "text-slate-400",
          },
          {
            title: "Energy Efficiency Score",
            value: energyScore.toFixed(0),
            sub: "Utilization Quotient",
            icon: ShieldCheck,
            color: "text-emerald-400",
          },
          {
            title: "Cost / Part",
            value: `€${costPerPart.toFixed(4)}`,
            sub: "Financial Footprint",
            icon: HelpCircle,
            color: "text-slate-300",
          },
          {
            title: "kWh / Part",
            value: kwhPerPart.toFixed(4),
            sub: "Physical Footprint",
            icon: Zap,
            color: "text-cyan-400",
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="mt-1">
                <div className="text-2xl font-bold tracking-tight text-white truncate font-mono">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Predictive Run-rate
            </span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">
                Est. Good Parts
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {forecastGoodParts.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">
                Forecast OEE
              </span>
              <span className="text-sm font-bold font-mono text-blue-400">
                {forecastOee.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* SECTION 3: INSIGHTS & SECTION 5: TRENDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Info className="h-4 w-4 text-blue-400" /> Daily Insights
            </h2>
            <div className="space-y-3">
              {insights.map((item, index) => {
                const style = getInsightStyle(item);
                const Icon = style.icon;
                return (
                  <div
                    key={index}
                    className={`flex gap-3 border p-3.5 rounded-lg ${style.bg} items-start`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-relaxed">
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Synchronized
            Performance Matrix
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyTrend}
                margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="partsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="oeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="report_date"
                  stroke="#64748b"
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    color: "#f8fafc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="good_parts"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#partsGrad)"
                  name="Good Parts"
                />
                <Area
                  type="monotone"
                  dataKey="average_oee"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#oeeGrad)"
                  name="Avg OEE %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 4: ANALYSIS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-500" /> Worst OEE Machines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3 font-semibold">Machine</th>
                  <th className="pb-3 text-right font-semibold">OEE %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {worstMachines.map((machine: any, index: number) => (
                  <tr
                    key={`${machine.work_center}-${index}`}
                    className="hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 font-medium text-white">
                      {machine.work_center}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-red-400">
                      {Number(machine.oee).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" /> Worst Downtime
            Machines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="pb-3 font-semibold">Machine</th>
                  <th className="pb-3 text-right font-semibold">
                    Downtime (min)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {worstDowntime.map((machine: any, index: number) => (
                  <tr
                    key={`${machine.work_center}-${index}`}
                    className="hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 font-medium text-white">
                      {machine.work_center}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-amber-500">
                      {machine.total_downtime.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 6: MANAGEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
            <FolderUp className="h-4 w-4 text-blue-400" /> SAP Daily KPI Import
          </h2>
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <SapKpiImport />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-400" /> Operations
              Command
            </h2>
            <p className="text-xs text-slate-400">
              Log external framework telemetry packages manually into the core
              grid database.
            </p>
          </div>
          <button
            onClick={() => setShowEnergyForm(true)}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold text-xs px-4 py-3 rounded-lg uppercase tracking-wider"
          >
            Add Energy Entry
          </button>
        </div>
      </div>

      {/* SECTION 7: ENERGY HISTORY */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Energy History
          </h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Consumption</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-medium text-slate-300">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-mono text-white font-bold">
                    {item.period_date}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-blue-950 text-blue-400 border border-blue-900">
                      {item.period_type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-white">
                    {Number(item.consumption_kwh).toLocaleString()} kWh
                  </td>
                  <td className="p-4 text-right font-mono text-amber-400">
                    €{Number(item.energy_cost).toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-400">
                    €{item.price_per_kwh}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => deleteEnergyEntry(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEnergyForm && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Am adăugat bg-white, text-slate-900 și p-8 pentru a izola formularul pe fundal deschis, vizibil */}
          <div className="bg-white text-slate-900 rounded-xl p-8 w-full max-w-xl shadow-2xl relative border border-slate-200">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                Add Energy Entry
              </h2>
              <button
                onClick={() => setShowEnergyForm(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Wrapper forțat cu utilități Tailwind pentru a asigura vizibilitatea textelor din interior */}
            <div className="text-slate-950 block-inputs-visible space-y-4">
              <EnergyForm
                onSaved={() => {
                  setShowEnergyForm(false);
                  setRefreshKey((prev) => prev + 1);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
