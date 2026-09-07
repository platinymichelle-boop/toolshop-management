"use client";

import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

function excelDateToJSDate(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  return dateInfo.toISOString().split("T")[0];
}

export default function SapKpiImport() {
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer);

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any>(worksheet);

    for (const row of rows) {
      await supabase.from("energy_sap_kpi").insert({
        report_date: excelDateToJSDate(Number(row["Date"])),

        work_center: row["Work Center"],

        good_quantity: row["GOODQUANTITY"] || 0,
        scrap_quantity: row["SCRAPQUANTITY"] || 0,
        reject_quantity: row["REJECTQUANTITY"] || 0,

        availability: row["Availability"] || 0,
        quality: row["Quality"] || 0,
        performance: row["Performance"] || 0,
        oee: row["Oee"] || 0,

        scheduled_downtime_min: row["Scheduled Downtime(Min)"] || 0,

        unscheduled_downtime_min: row["Unscheduled Downtime(Min)"] || 0,

        net_operating_time_min: row["Net Operating Time(Min)"] || 0,

        net_production_time_min: row["Net Production Time(Min)"] || 0,

        loading_time_min: row["Loading Time(Min)"] || 0,
      });
    }

    alert(`Imported ${rows.length} records`);
  }

  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-xl font-bold mb-2">SAP Daily KPI Import</h2>

      <p className="text-sm text-muted-foreground mb-4">
        Upload SAP KPI Excel File
      </p>

      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
    </div>
  );
}
