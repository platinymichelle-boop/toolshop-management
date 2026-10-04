"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  created_at: string;
  waiting_time?: number;
  diagnostic_time?: number;
  spare_part_time?: number;
  repair_time?: number;
  test_time?: number;
  report_time?: number;
  start_time?: string;
}

export default function MaintenanceReportHistoryPage() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);
  async function loadReports() {
    const { data, error } = await supabase
      .from("maintenance_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReports(data || []);
    setLoading(false);
  }

  // Export individual focalizat pe un singur raport (Rămâne neschimbat)
  function handleIndividualSapExport(report: MaintenanceReport) {
    const sapData = [
      {
        "SAP Notification": report.sap_notification,
        Date: report.report_date,
        Shift: report.shift,
        Equipment: report.equipment_code,
        "Sub Equipment": report.sub_equ,
        "Defection Type": report.defection_type,
        Description: report.breakdown_description,
        "Person Responsible": report.person_responsible,
        "Spare Parts Used": report.spare_parts_used,
        "ENDR Code": report.endr_code,
        "Malfunction End Date": report.malfunction_end_date,
        "Malfunction End Time": report.malfunction_end_time,
        "Stoppage Code": report.stoppage_code,
        "Production Order": report.production_order,
        "Total Production Amount": report.total_production_amount,
        "Planned Production Amount": report.planned_production_amount,
        "Total Downtime (min)": report.total_time,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sapData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "SAP Notification Closure",
    );

    const notificationName = report.sap_notification || `ID_${report.id}`;
    XLSX.writeFile(workbook, `SAP_Notification_${notificationName}.xlsx`);
  }

  // Funcție nouă pentru Exportul Global (Multiple Sheet-uri cu Summary + Rapoarte Structurate)
  function handleGlobalExport() {
    if (reports.length === 0) return;

    const workbook = XLSX.utils.book_new();

    // 1. Construcție Date pentru Summary Sheet
    const summaryRows = [
      [
        "SAP Notification",
        "Date",
        "Shift",
        "Equipment",
        "Sub Equipment",
        "Defection Type",
        "Person Responsible",
        "ENDR Code",
        "Total Downtime",
      ],
    ];
    reports.forEach((report) => {
      summaryRows.push([
        report.sap_notification || "-",
        report.report_date || "-",
        `Shift ${report.shift || "-"}`,
        report.equipment_code || "-",
        report.sub_equ || "-",
        report.defection_type || "-",
        report.person_responsible || "-",
        report.endr_code || "-",
        `${report.total_time || 0} min`,
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

    // Auto-width pentru Summary Sheet
    summarySheet["!cols"] = summaryRows[0].map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // 2. Construcție Sheet-uri Individuale structurate pe secțiuni (Formular Key-Value)
    reports.forEach((report) => {
      const aoaData = [
        ["SAP NOTIFICATION CLOSURE REPORT", ""],
        ["", ""],

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

      const reportSheet = XLSX.utils.aoa_to_sheet(aoaData);

      // Auto-width pe coloanele A și B ale fiecărui sheet individual din interiorul registrului
      const maxA = Math.max(
        ...aoaData.map((row) => row[0]?.toString().length || 10),
      );
      const maxB = Math.max(
        ...aoaData.map((row) => row[1]?.toString().length || 10),
      );

      reportSheet["!cols"] = [
        { wch: Math.min(Math.max(maxA + 4, 25), 40) },
        { wch: Math.min(Math.max(maxB + 4, 30), 80) },
      ];

      // Denumire unică a sheet-ului pe baza notificării SAP (Limitat la 31 caractere pentru Excel)
      const sheetName = report.sap_notification
        ? report.sap_notification.slice(0, 31)
        : `ID_${report.id}`;
      XLSX.utils.book_append_sheet(workbook, reportSheet, sheetName);
    });

    // Formatare nume fișier conform cerinței (ex: All_Maintenance_Reports_2026-10-04.xlsx)
    const currentDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `All_Maintenance_Reports_${currentDate}.xlsx`);
  }
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      {/* Header cu acțiuni de export multiple */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Maintenance Report History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Select an individual report to view details or export data for SAP
            closure.
          </p>
        </div>

        {/* Buton nou adăugat pentru exportul global complex */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleGlobalExport}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            Export All Reports
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm font-medium text-slate-500">
            Loading history...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-sm font-medium text-slate-500">
            No maintenance reports found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3">SAP Notification</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Person Responsible</th>
                  <th className="p-3">Total Time</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="p-3 font-semibold text-slate-900">
                      {report.sap_notification || (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {report.report_date}
                    </td>
                    <td className="p-3 font-medium">{report.equipment_code}</td>
                    <td className="p-3">
                      {report.person_responsible || (
                        <span className="text-slate-400 italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-slate-900">
                      {report.total_time} min
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() =>
                          router.push(`/maintenance-reports/${report.id}`)
                        }
                        className="inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleIndividualSapExport(report)}
                        className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                      >
                        Export SAP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
