"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
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
  const [isExporting, startExportTransition] = useTransition();
  const router = useRouter();

  // Stări noi pentru Filtrare și Paginare
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("All");
  const [selectedShift, setSelectedShift] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from("maintenance_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }

  // Extragerea dinamică a listei unice de echipamente pentru dropdown-ul de filtrare
  const equipmentOptions = useMemo(() => {
    const codes = reports.map((r) => r.equipment_code).filter(Boolean);
    return ["All", ...Array.from(new Set(codes))];
  }, [reports]);

  // Logica de filtrare combinată a datelor
  const filteredReports = useMemo(() => {
    setCurrentPage(1); // Resetăm pagina când filtrele se schimbă
    return reports.filter((report) => {
      const matchesSearch = (report.sap_notification || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesEquipment =
        selectedEquipment === "All" ||
        report.equipment_code === selectedEquipment;
      const matchesShift =
        selectedShift === "All" || String(report.shift) === selectedShift;

      return matchesSearch && matchesEquipment && matchesShift;
    });
  }, [reports, searchTerm, selectedEquipment, selectedShift]);

  // Calculul metricilor / KPI-uri pentru rapoartele vizibile (Downtime total, mediu etc.)
  const stats = useMemo(() => {
    const totalReports = filteredReports.length;
    const totalMinutes = filteredReports.reduce(
      (sum, r) => sum + (r.total_time || 0),
      0,
    );
    const avgMinutes =
      totalReports > 0 ? Math.round(totalMinutes / totalReports) : 0;
    const totalHours = (totalMinutes / 60).toFixed(1);

    return { totalReports, totalHours, avgMinutes };
  }, [filteredReports]);

  // Împărțirea listei filtrate în pagini discrete (10 elemente/pagină)
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;

  // Export individual focalizat pe un singur raport
  function handleIndividualSapExport(report: MaintenanceReport) {
    const sapData = [
      {
        "SAP Notification": report.sap_notification || "-",
        Date: report.report_date || "-",
        Shift: report.shift || "-",
        Equipment: report.equipment_code || "-",
        "Sub Equipment": report.sub_equ || "-",
        "Defection Type": report.defection_type || "-",
        Description: report.breakdown_description || "-",
        "Person Responsible": report.person_responsible || "-",
        "Spare Parts Used": report.spare_parts_used || "-",
        "ENDR Code": report.endr_code || "-",
        "Malfunction End Date": report.malfunction_end_date || "-",
        "Malfunction End Time": report.malfunction_end_time || "-",
        "Stoppage Code": report.stoppage_code || "-",
        "Production Order": report.production_order || "-",
        "Total Production Amount": report.total_production_amount || 0,
        "Planned Production Amount": report.planned_production_amount || 0,
        "Total Downtime (min)": report.total_time || 0,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sapData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SAP Notification");
    const notificationName = report.sap_notification || `ID_${report.id}`;
    XLSX.writeFile(workbook, `SAP_Notification_${notificationName}.xlsx`);
  }

  function generateReportAOA(report: MaintenanceReport) {
    return [
      ["SAP NOTIFICATION CLOSURE REPORT", ""],
      ["", ""],
      ["1. GENERAL INFORMATION", ""],
      ["SAP Notification", report.sap_notification || "-"],
      ["Date", report.report_date || "-"],
      ["Shift", report.shift ? `Shift ${report.shift}` : "-"],
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
  }
  // Exportul Global securizat și optimizat
  function handleGlobalExport() {
    if (filteredReports.length === 0) return;

    startExportTransition(() => {
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

      filteredReports.forEach((report) => {
        summaryRows.push([
          report.sap_notification || "-",
          report.report_date || "-",
          report.shift ? `Shift ${report.shift}` : "-",
          report.equipment_code || "-",
          report.sub_equ || "-",
          report.defection_type || "-",
          report.person_responsible || "-",
          report.endr_code || "-",
          `${report.total_time || 0} min`,
        ]);
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = summaryRows.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const usedSheetNames = new Set<string>();

      // 2. Construcție Sheet-uri Individuale
      filteredReports.forEach((report) => {
        const aoaData = generateReportAOA(report);
        const reportSheet = XLSX.utils.aoa_to_sheet(aoaData);

        let maxA = 15;
        let maxB = 20;
        aoaData.forEach(([colA, colB]) => {
          if (colA && colA.toString().length > maxA)
            maxA = colA.toString().length;
          if (colB && colB.toString().length > maxB)
            maxB = colB.toString().length;
        });

        reportSheet["!cols"] = [
          { wch: Math.min(maxA + 3, 40) },
          { wch: Math.min(maxB + 3, 70) },
        ];

        let baseName = report.sap_notification
          ? report.sap_notification.trim().slice(0, 25)
          : `ID_${report.id}`;

        let finalSheetName = baseName;
        let counter = 1;

        while (usedSheetNames.has(finalSheetName.toUpperCase())) {
          const suffix = `_${counter}`;
          finalSheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
          counter++;
        }

        usedSheetNames.add(finalSheetName.toUpperCase());
        XLSX.utils.book_append_sheet(workbook, reportSheet, finalSheetName);
      });

      const currentDate = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(
        workbook,
        `Filtered_Maintenance_Reports_${currentDate}.xlsx`,
      );
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      {/* SECTIUNEA HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Maintenance Report Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor breakdown metrics, filter records in real-time, and handle
            SAP exports.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleGlobalExport}
            disabled={isExporting || filteredReports.length === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:cursor-not-allowed"
          >
            {isExporting
              ? "Generating Excel..."
              : `Export Filtered (${filteredReports.length})`}
          </button>
        </div>
      </div>

      {/* SECTIUNEA KPIs / STATISTICI */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-xs font-medium uppercase text-slate-400 tracking-wider">
              Total Reports
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats.totalReports}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-xs font-medium uppercase text-slate-400 tracking-wider">
              Total Downtime
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {stats.totalHours}{" "}
              <span className="text-sm font-semibold">hrs</span>
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <p className="text-xs font-medium uppercase text-slate-400 tracking-wider">
              Average Repair
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats.avgMinutes}{" "}
              <span className="text-sm font-semibold">min</span>
            </p>
          </div>
        </div>
      )}
      {/* BARA DE FILTRE INTERACTIVE */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Search SAP Notif.
          </label>
          <input
            type="text"
            placeholder="Type notification code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-slate-50/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Equipment Code
          </label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-slate-50/50"
          >
            {equipmentOptions.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All Equipments" : option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Shift
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-slate-50/50"
          >
            <option value="All">All Shifts</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
            <option value="3">Shift 3</option>
          </select>
        </div>
      </div>

      {/* TABELUL SI PAGINAREA */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm font-medium text-slate-500 animate-pulse">
            Loading database entries...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-sm font-medium text-slate-500">
            No maintenance reports found matching the criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b">
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
                  {paginatedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-900">
                        {report.sap_notification || (
                          <span className="text-slate-400 italic font-normal">
                            None
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {report.report_date}
                      </td>
                      <td className="p-3 font-medium">
                        {report.equipment_code}
                      </td>
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

            {/* INTERFATA PAGINARE */}
            <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-500">
                Page {currentPage} of {totalPages} ({filteredReports.length}{" "}
                total items)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
