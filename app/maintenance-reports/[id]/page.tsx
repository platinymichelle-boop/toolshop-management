"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface MaintenanceReport {
  id: number;
  sap_notification: string;
  functional_location: string;
  report_date: string;
  shift: string;
  main_equ: string;
  equipment_code: string;
  sub_equ: string;
  defection_type: string;
  breakdown_description: string;
  person_responsible: string;
  malfunction_end_date: string;
  malfunction_end_time: string;
  stoppage_code: string;
  production_order: string;
  total_production_amount: number;
  planned_production_amount: number;
  root_cause: string;
  corrective_action: string;
  technician_comments: string;
  spare_parts_used: string;
  endr_code: string;
  total_time: number;
  waiting_time: number;
  diagnostic_time: number;
  spare_part_time: number;
  repair_time: number;
  test_time: number;
  report_time: number;
  start_time: string;
  created_at: string;
}

export default function MaintenanceReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadReportDetails(Number(params.id));
    }
  }, [params?.id]);
  async function loadReportDetails(id: number) {
    const { data, error } = await supabase
      .from("maintenance_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      router.push("/maintenance-reports/history");
      return;
    }

    setReport(data);
    setLoading(false);
  }

  // Funcție avansată pentru generarea fișei de raport în format formular Excel
  function handleSingleExport() {
    if (!report) return;

    // Construim matricea de date rând cu rând (Array of Arrays) pentru aspectul de formular
    const aoaData = [
      ["SAP NOTIFICATION CLOSURE REPORT", ""],
      ["", ""], // Spațiu liber

      ["1. GENERAL INFORMATION", ""],
      ["SAP Notification", report.sap_notification || "-"],
      ["Date", report.report_date || "-"],
      ["Shift", `Shift ${report.shift || "-"}`],
      ["Person Responsible", report.person_responsible || "-"],
      ["", ""],

      ["2. EQUIPMENT INFORMATION", ""],
      ["Main Equipment", report.main_equ || "-"],
      ["Equipment Code", report.equipment_code || "-"],
      ["Sub Equipment", report.sub_equ || "-"],
      ["Defection Type", report.defection_type || "-"],
      ["", ""],

      ["3. BREAKDOWN DETAILS", ""],
      ["Description", report.breakdown_description || "-"],
      ["", ""],

      ["4. REPAIR INFORMATION", ""],
      ["Spare Parts Used", report.spare_parts_used || "-"],
      ["ENDR Code", report.endr_code || "-"],
      ["", ""],
      ["5. DOWNTIME INFORMATION", ""],
      ["Start Time", report.start_time || "-"],
      ["Malfunction End Date", report.malfunction_end_date || "-"],
      ["Malfunction End Time", report.malfunction_end_time || "-"],
      ["Waiting Time", `${report.waiting_time || 0} min`],
      ["Diagnostic Time", `${report.diagnostic_time || 0} min`],
      ["Spare Part Time", `${report.spare_part_time || 0} min`],
      ["Repair Time", `${report.repair_time || 0} min`],
      ["Test Time", `${report.test_time || 0} min`],
      ["Report Time", `${report.report_time || 0} min`],
      ["TOTAL DOWNTIME", `${report.total_time || 0} min`],
      ["", ""],

      ["6. SAP INFORMATION", ""],
      ["Stoppage Code", report.stoppage_code || "-"],
      ["Production Order", report.production_order || "-"],
      ["Total Production Amount", report.total_production_amount || 0],
      ["Planned Production Amount", report.planned_production_amount || 0],
    ];

    // Crearea worksheet-ului pe baza matricei definite manual
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

    // Definirea lățimilor automate pentru coloanele A și B
    const maxA = Math.max(
      ...aoaData.map((row) => row[0]?.toString().length || 10),
    );
    const maxB = Math.max(
      ...aoaData.map((row) => row[1]?.toString().length || 10),
    );

    worksheet["!cols"] = [
      { wch: Math.min(Math.max(maxA + 4, 25), 40) }, // Coloana A (Câmpuri)
      { wch: Math.min(Math.max(maxB + 4, 30), 80) }, // Coloana B (Valori)
    ];

    // Crearea workbook-ului și descărcarea fișierului individual
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SAP Form Report");

    const notificationName = report.sap_notification || `ID_${report.id}`;
    XLSX.writeFile(workbook, `SAP_Notification_${notificationName}.xlsx`);
  }

  // Logica pentru starea de încărcare din interfață
  if (loading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-slate-500 bg-slate-50 min-h-screen">
        Loading report details...
      </div>
    );
  }

  if (!report) return null;
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto bg-slate-50 min-h-screen space-y-6">
      {/* Header control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <Link
            href="/maintenance-reports/history"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Back to History
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Report ID: #{report.id}
          </h1>
        </div>
        <button
          onClick={handleSingleExport}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors self-start sm:self-center"
        >
          Export Individual SAP XLSX
        </button>
      </div>

      {/* SECTION 1: GENERAL INFORMATION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          General Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">SAP Notification</p>
            <p className="font-semibold mt-0.5">
              {report.sap_notification || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Date</p>
            <p className="font-semibold mt-0.5">{report.report_date || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Shift</p>
            <p className="font-semibold mt-0.5">Shift {report.shift || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Person Responsible</p>
            <p className="font-semibold mt-0.5">
              {report.person_responsible || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: EQUIPMENT INFORMATION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Equipment Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Main Equipment</p>
            <p className="font-semibold mt-0.5">{report.main_equ || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Equipment Code</p>
            <p className="font-semibold mt-0.5">
              {report.equipment_code || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Sub Equipment</p>
            <p className="font-semibold mt-0.5">{report.sub_equ || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Defection Type</p>
            <p className="font-semibold mt-0.5">
              {report.defection_type || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: BREAKDOWN DETAILS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Breakdown Details
        </h2>
        <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap bg-slate-50 border border-slate-100 p-3 rounded-lg">
          {report.breakdown_description || (
            <span className="text-slate-400 italic">
              No description provided
            </span>
          )}
        </p>
      </div>
      {/* SECTION 4: REPAIR INFORMATION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Repair Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Spare Parts Used</p>
            <p className="font-medium mt-0.5 p-2 bg-slate-50 rounded-lg">
              {report.spare_parts_used || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">ENDR Code</p>
            <p className="font-medium mt-0.5 p-2 bg-slate-50 rounded-lg">
              {report.endr_code || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: DOWNTIME INFORMATION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Downtime Information
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm border-b pb-3">
          <div>
            <p className="text-slate-500 text-xs">Start Time</p>
            <p className="font-semibold mt-0.5">{report.start_time || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Malfunction End Date</p>
            <p className="font-semibold mt-0.5">
              {report.malfunction_end_date || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Malfunction End Time</p>
            <p className="font-semibold mt-0.5">
              {report.malfunction_end_time || "-"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Waiting</span>
            <span className="font-bold">{report.waiting_time || 0}m</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Diagnostic</span>
            <span className="font-bold">{report.diagnostic_time || 0}m</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Spare Part</span>
            <span className="font-bold">{report.spare_part_time || 0}m</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Repair</span>
            <span className="font-bold">{report.repair_time || 0}m</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Test</span>
            <span className="font-bold">{report.test_time || 0}m</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg">
            <span className="text-slate-500 block">Report</span>
            <span className="font-bold">{report.report_time || 0}m</span>
          </div>
        </div>
        <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-400 font-bold">
              Total Downtime
            </span>
          </div>
          <div className="text-2xl font-black text-blue-400">
            {report.total_time} min
          </div>
        </div>
      </div>

      {/* SECTION 6: SAP INFORMATION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          SAP Information (Stored Back-end Data)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Stoppage Code</p>
            <p className="font-semibold mt-0.5">
              {report.stoppage_code || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Production Order</p>
            <p className="font-semibold mt-0.5">
              {report.production_order || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Total Prod Amount</p>
            <p className="font-semibold mt-0.5">
              {report.total_production_amount || 0}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Planned Prod Amount</p>
            <p className="font-semibold mt-0.5">
              {report.planned_production_amount || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
