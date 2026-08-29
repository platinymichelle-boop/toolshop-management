"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Tool {
  id: string | number;
  tool_number: string;
}

interface Breakdown {
  id: string | number;
  press_number: string;
  status: string;
}

interface ToolStatus extends Tool {
  hasBreakdown: boolean;
}

export default function LiveFactoryStatus() {
  const router = useRouter();

  const [toolsStatus, setToolsStatus] = useState<ToolStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Funcție de normalizare SCADA pentru uniformizarea stringurilor
  const normalizeName = (name: string | null | undefined): string => {
    if (!name) return "";
    return name
      .toUpperCase()
      .replace(/PRESA|PRS|[-\s]/g, "")
      .trim();
  };

  const fetchFactoryStatus = async () => {
    try {
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("id, tool_number");

      if (toolsError) throw toolsError;

      const { data: breakdownsData, error: breakdownsError } = await supabase
        .from("breakdowns")
        .select("id, press_number, status");

      if (breakdownsError) throw breakdownsError;

      console.log("TOOLS", toolsData);
      console.log("BREAKDOWNS", breakdownsData);

      const activeBreakdownPressNumbers = new Set(
        (breakdownsData || [])
          .filter((b: Breakdown) => b.status === "Running")
          .map((b: Breakdown) => normalizeName(b.press_number))
          .filter((num) => num !== ""),
      );

      const mappedStatus: ToolStatus[] = (toolsData || []).map(
        (tool: Tool) => ({
          ...tool,
          hasBreakdown: activeBreakdownPressNumbers.has(
            normalizeName(tool.tool_number),
          ),
        }),
      );

      setToolsStatus(mappedStatus);
    } catch (error) {
      console.error("Error fetching factory status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchFactoryStatus();

    const dataInterval = setInterval(() => {
      fetchFactoryStatus();
    }, 30000);

    return () => clearInterval(dataInterval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("ro-RO", { hour12: false }));
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const totalRunning = toolsStatus.filter((t) => !t.hasBreakdown).length;
  const totalBreakdown = toolsStatus.filter((t) => t.hasBreakdown).length;

  const handleToolClick = (hasBreakdown: boolean) => {
    if (hasBreakdown) {
      router.push("/breakdown");
    }
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono shadow-inner text-slate-200 transition-all duration-700 ease-out transform ${
        isMounted ? "opacity-100 translateY-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* 1. SCADA Header & System Indicators */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl tracking-tight text-slate-100 font-bold flex items-center gap-2">
            🏭 LIVE FACTORY STATUS
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>

        {/* System Ticker & Time */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px]">
            <span className="text-slate-500">SYS_STATUS: </span>
            {totalBreakdown > 0 ? (
              <span className="text-amber-500 font-bold animate-pulse">
                {totalBreakdown} ACTIVE BREAKDOWNS
              </span>
            ) : (
              <span className="text-emerald-500 font-bold">
                ALL SERVICES OPERATIONAL
              </span>
            )}
          </div>
          <div className="text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 tracking-widest text-[11px]">
            T_STAMP: {currentTime || "--:--:--"}
          </div>
        </div>
      </div>

      {/* 2. Compact Industrial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            TOTAL_UNITS
          </span>
          <span className="text-xl font-bold text-slate-100 mt-1">
            {toolsStatus.length}
          </span>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-500/80 uppercase font-bold tracking-wider">
            RUNNING
          </span>
          <span className="text-xl font-bold text-emerald-400 mt-1">
            {totalRunning}
          </span>
        </div>
        <div
          className={`border rounded p-2.5 flex flex-col justify-between transition-all duration-300 ${
            totalBreakdown > 0
              ? "bg-red-950/30 border-red-900/60 shadow-[0_0_10px_rgba(239,68,68,0.05)]"
              : "bg-slate-950/60 border-slate-800/80"
          }`}
        >
          <span
            className={`text-[10px] uppercase font-bold tracking-wider ${totalBreakdown > 0 ? "text-red-400" : "text-slate-500"}`}
          >
            BREAKDOWN
          </span>
          <span
            className={`text-xl font-bold mt-1 ${totalBreakdown > 0 ? "text-red-400" : "text-slate-100"}`}
          >
            {totalBreakdown}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            REFRESH_INT
          </span>
          <span className="text-xl font-bold text-slate-400 mt-1">30s</span>
        </div>
      </div>

      {/* 3. Compact SCADA Grid Matrix Layout */}
      {loading && toolsStatus.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded bg-slate-950/30">
          INITIALIZING SCADA CORE MATRIX...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {toolsStatus.map((tool) => (
            <div
              key={tool.id}
              onClick={() => handleToolClick(tool.hasBreakdown)}
              className={`
                flex items-center justify-between p-2 rounded border bg-slate-950/80 tracking-wide text-xs
                transition-all duration-150 select-none
                ${
                  tool.hasBreakdown
                    ? "border-red-900/80 text-red-200 cursor-pointer animate-[pulse_3s_infinite_ease-in-out] hover:scale-[1.03] hover:bg-red-950/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.15)] hover:border-red-500"
                    : "border-slate-800 text-slate-300 cursor-default hover:scale-[1.03] hover:border-slate-600 hover:bg-slate-900 hover:shadow-md"
                }
              `}
            >
              {/* Unit Tag identifier */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight px-1 py-0.5 bg-slate-900 border border-slate-800 rounded">
                  TAG
                </span>
                <span className="font-bold tracking-wider">
                  {tool.tool_number}
                </span>
              </div>

              {/* Precise Status Signaler */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    tool.hasBreakdown
                      ? "bg-red-950 text-red-400 border border-red-900"
                      : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                  }`}
                >
                  {tool.hasBreakdown ? "FAIL" : "OK"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shadow-sm flex-shrink-0 ${
                    tool.hasBreakdown
                      ? "bg-red-500 shadow-red-500/50 animate-pulse"
                      : "bg-emerald-500 shadow-emerald-500/50"
                  }`}
                ></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
