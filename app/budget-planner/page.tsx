"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface BudgetForecast {
  id: number;
  category: string;
  avr_cost: number;
  forecast_cost: number;
  frequency: number;
  frequency_unit: string;
  budget_value: number;
  budget_year?: number;
}

interface BudgetAssumption {
  inflation: number;
  steel_coefficient: number;
  production_growth: number;
  budget_year?: number;
}

interface BudgetActual {
  id?: number;
  budget_year: number;
  budget_month: number;
  category: string;
  account_type: string;
  amount_eur: number;
  short_text?: string;
  currency?: string;
  total_value?: number;
  raw_release_date?: string;
}

interface HistoricalMatrixRow {
  category: string;
  v2023: number;
  v2024: number;
  v2025: number;
  calculatedAvr: number;
}

export default function BudgetPlannerPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2027);
  const [items, setItems] = useState<BudgetForecast[]>([]);
  const [assumptions, setAssumptions] = useState<BudgetAssumption | null>(null);
  const [actuals, setActuals] = useState<BudgetActual[]>([]);
  const [historicalMatrix, setHistoricalMatrix] = useState<
    HistoricalMatrixRow[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<string>("Realistic");

  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [parsedRows, setParsedRows] = useState<BudgetActual[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const years = [2026, 2027, 2028, 2029, 2030];

  useEffect(() => {
    loadData();
    loadHistoricalData();
  }, [selectedYear]);

  useEffect(() => {
    buildHistoricalMatrix();
  }, [actuals]);
  async function loadData() {
    setLoading(true);
    try {
      const { data: forecastData } = await supabase
        .from("budget_forecast")
        .select("*")
        .eq("budget_year", selectedYear)
        .order("category");

      if (forecastData) setItems(forecastData);
      else setItems([]);

      const { data: assumptionData } = await supabase
        .from("budget_assumptions")
        .select("*")
        .eq("budget_year", selectedYear)
        .single();

      if (assumptionData) {
        setAssumptions(assumptionData);
      } else {
        setAssumptions({
          inflation: 6,
          steel_coefficient: 1.0,
          production_growth: 5,
          budget_year: selectedYear,
        });
      }
    } catch (error) {
      console.error("Error loading forecast data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoricalData() {
    try {
      const { data: actualsData } = await supabase
        .from("budget_actuals")
        .select("*")
        .order("budget_year", { ascending: false })
        .order("budget_month");

      if (actualsData) {
        setActuals(actualsData);
      }
    } catch (error) {
      console.error("Error loading historical data:", error);
    }
  }

  function buildHistoricalMatrix() {
    if (actuals.length === 0) {
      setHistoricalMatrix([]);
      return;
    }

    const categories = Array.from(new Set(actuals.map((a) => a.category)));
    const matrix: HistoricalMatrixRow[] = categories.map((cat) => {
      const rows = actuals.filter((a) => a.category === cat);

      const v2023 = rows
        .filter((r) => r.budget_year === 2023)
        .reduce((sum, r) => sum + r.amount_eur, 0);
      const v2024 = rows
        .filter((r) => r.budget_year === 2024)
        .reduce((sum, r) => sum + r.amount_eur, 0);
      const v2025 = rows
        .filter((r) => r.budget_year === 2025)
        .reduce((sum, r) => sum + r.amount_eur, 0);

      const distinctYears = Array.from(
        new Set(rows.map((r) => r.budget_year)),
      ).filter((y) => [2023, 2024, 2025].includes(y));
      const yearsCount = distinctYears.length || 1;
      const calculatedAvr = (v2023 + v2024 + v2025) / yearsCount;

      return {
        category: cat,
        v2023: Number(v2023.toFixed(2)),
        v2024: Number(v2024.toFixed(2)),
        v2025: Number(v2025.toFixed(2)),
        calculatedAvr: Number(calculatedAvr.toFixed(2)),
      };
    });

    setHistoricalMatrix(matrix);
  }
  async function calculateAvrFromHistory() {
    if (historicalMatrix.length === 0) {
      alert(
        "No historical data available to aggregate. Please import data first.",
      );
      return;
    }

    setLoading(true);
    try {
      const updatePromises = historicalMatrix.map(async (row) => {
        const { data: existingForecasts } = await supabase
          .from("budget_forecast")
          .select("id")
          .eq("category", row.category)
          .eq("budget_year", selectedYear);

        if (existingForecasts && existingForecasts.length > 0) {
          return Promise.all(
            existingForecasts.map((f) =>
              supabase
                .from("budget_forecast")
                .update({ avr_cost: row.calculatedAvr })
                .eq("id", f.id),
            ),
          );
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      alert("AVR cost automatically synchronized across active matrices!");
      await loadData();
    } catch (err: any) {
      alert(`AVR Calculation engine failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveAssumptions() {
    if (!assumptions) return;

    const { data } = await supabase
      .from("budget_assumptions")
      .select("budget_year")
      .eq("budget_year", selectedYear)
      .single();

    let error;
    if (data) {
      const { error: err } = await supabase
        .from("budget_assumptions")
        .update({
          inflation: assumptions.inflation,
          steel_coefficient: assumptions.steel_coefficient,
          production_growth: assumptions.production_growth,
        })
        .eq("budget_year", selectedYear);
      error = err;
    } else {
      const { error: err } = await supabase.from("budget_assumptions").insert({
        budget_year: selectedYear,
        inflation: assumptions.inflation,
        steel_coefficient: assumptions.steel_coefficient,
        production_growth: assumptions.production_growth,
      });
      error = err;
    }

    if (error) {
      alert(error.message);
      return;
    }
    alert(`Assumptions for ${selectedYear} saved successfully`);
  }
  const handleInputChange = (
    id: number,
    field: keyof BudgetForecast,
    value: string | number,
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        const updatedItem = { ...item, [field]: value };

        if (field === "forecast_cost" || field === "frequency") {
          const fCost =
            field === "forecast_cost" ? Number(value) : item.forecast_cost;
          const freq = field === "frequency" ? Number(value) : item.frequency;
          updatedItem.budget_value = Number((fCost * freq).toFixed(2));
        }
        return updatedItem;
      }),
    );
  };

  async function saveRow(item: BudgetForecast) {
    const { error } = await supabase
      .from("budget_forecast")
      .update({
        avr_cost: item.avr_cost,
        forecast_cost: item.forecast_cost,
        frequency: item.frequency,
        frequency_unit: item.frequency_unit,
        budget_value: item.budget_value,
      })
      .eq("id", item.id);

    if (error) {
      alert(`Error saving row: ${error.message}`);
      return;
    }
    alert(`Row "${item.category}" updated successfully!`);
  }

  const applyScenario = (
    scenario: "Conservative" | "Realistic" | "Aggressive",
  ) => {
    setCurrentScenario(scenario);
    setAssumptions((prev) => {
      if (!prev) return null;
      if (scenario === "Conservative") {
        return { ...prev, inflation: 3, production_growth: 2 };
      } else if (scenario === "Realistic") {
        return { ...prev, inflation: 6, production_growth: 5 };
      } else {
        return { ...prev, inflation: 10, production_growth: 10 };
      }
    });
  };
  async function handleRecalculateForecast() {
    if (!assumptions) {
      alert("Please load or save assumptions first.");
      return;
    }

    setLoading(true);
    const { inflation, steel_coefficient, production_growth } = assumptions;

    const updatedItems = items.map((item) => {
      const avrCost = item.avr_cost ?? 0;
      const forecastCost =
        avrCost *
        (1 + inflation / 100) *
        steel_coefficient *
        (1 + production_growth / 100);
      const budgetValue = forecastCost * (item.frequency ?? 0);

      return {
        ...item,
        forecast_cost: Number(forecastCost.toFixed(2)),
        budget_value: Number(budgetValue.toFixed(2)),
      };
    });

    try {
      const updatePromises = updatedItems.map((item) =>
        supabase
          .from("budget_forecast")
          .update({
            forecast_cost: item.forecast_cost,
            budget_value: item.budget_value,
          })
          .eq("id", item.id),
      );

      await Promise.all(updatePromises);
      alert("All forecasts recalculated and updated successfully!");
      await loadData();
    } catch (err: any) {
      alert(`Recalculation save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function generateNextYearBudget() {
    const nextYear = selectedYear + 1;
    if (!years.includes(nextYear)) {
      alert(`Year ${nextYear} is out of range.`);
      return;
    }

    setLoading(true);
    try {
      const { data: existingNextYear } = await supabase
        .from("budget_forecast")
        .select("id")
        .eq("budget_year", nextYear);

      if (existingNextYear && existingNextYear.length > 0) {
        alert(
          `Data for ${nextYear} already exists. Generation stopped to prevent overwrite.`,
        );
        return;
      }

      if (items.length === 0) {
        alert("No data available in current year to copy.");
        return;
      }

      const { data: nextYearAssump } = await supabase
        .from("budget_assumptions")
        .select("*")
        .eq("budget_year", nextYear)
        .single();

      const currentInflation = assumptions?.inflation ?? 6;
      const currentSteel = assumptions?.steel_coefficient ?? 1;
      const currentGrowth = assumptions?.production_growth ?? 5;

      const targetInflation = nextYearAssump?.inflation ?? currentInflation;
      const targetSteel = nextYearAssump?.steel_coefficient ?? currentSteel;
      const targetGrowth = nextYearAssump?.production_growth ?? currentGrowth;

      const newRows = items.map((item) => {
        const fCost =
          item.avr_cost *
          (1 + targetInflation / 100) *
          targetSteel *
          (1 + targetGrowth / 100);
        const bValue = fCost * item.frequency;

        return {
          category: item.category,
          avr_cost: item.avr_cost,
          frequency: item.frequency,
          frequency_unit: item.frequency_unit,
          budget_year: nextYear,
          forecast_cost: Number(fCost.toFixed(2)),
          budget_value: Number(bValue.toFixed(2)),
        };
      });

      const { error: insertError } = await supabase
        .from("budget_forecast")
        .insert(newRows);
      if (insertError) throw insertError;

      alert(
        `Successfully generated layout and forecasts for Fiscal Year ${nextYear}!`,
      );
      setSelectedYear(nextYear);
    } catch (err: any) {
      alert(`Failed to generate next year's budget: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });

      const ws = wb.Sheets["Data"];
      if (!ws) {
        alert("Critical Error: Worksheet 'Data' not found.");
        return;
      }

      const rawData = XLSX.utils.sheet_to_json<any>(ws);

      const formattedActuals: BudgetActual[] = rawData.map((row) => {
        const text = String(row["Short Text"] || "").toLowerCase();
        let calculatedCategory = "OTHER";

        if (
          text.includes("renolin") ||
          text.includes("oil") ||
          text.includes("lubrication")
        ) {
          calculatedCategory = "OIL";
        } else if (text.includes("filter") || text.includes("filtru")) {
          calculatedCategory = "FILTER";
        } else if (
          text.includes("sensor") ||
          text.includes("encoder") ||
          text.includes("curtain")
        ) {
          calculatedCategory = "SENSOR";
        } else if (
          text.includes("motor") ||
          text.includes("servo") ||
          text.includes("inverter") ||
          text.includes("drive")
        ) {
          calculatedCategory = "MOTOR";
        }

        let cleanYear = selectedYear;
        let cleanMonth = 1;
        const rawReleaseDate = row["Release Date"];

        if (
          typeof rawReleaseDate === "number" ||
          !isNaN(Number(rawReleaseDate))
        ) {
          const numValue = Number(rawReleaseDate);
          try {
            const parsedDate = XLSX.SSF.parse_date_code(numValue);
            if (parsedDate && parsedDate.y && parsedDate.m) {
              cleanYear = parsedDate.y;
              cleanMonth = parsedDate.m;
            }
          } catch (ssfErr) {
            console.error("XLSX SSF parsing error:", ssfErr);
          }
        } else if (rawReleaseDate) {
          const stringDate = String(rawReleaseDate).trim();
          if (stringDate.includes("/")) {
            const dateParts = stringDate.split("/");
            if (dateParts.length === 3) {
              const m = parseInt(dateParts[0], 10);
              const y = parseInt(dateParts[2], 10);
              if (!isNaN(m) && m >= 1 && m <= 12) cleanMonth = m;
              if (!isNaN(y) && y >= 2000 && y <= 2100) cleanYear = y;
            }
          }
        }

        const rawValue = Number(row["Total Value"] || 0);
        const rawCurrency = String(row["Currency"] || "EUR").toUpperCase();

        let finalAmountEur = rawValue;
        if (rawCurrency === "RON") finalAmountEur = rawValue / 4.97;
        else if (rawCurrency === "USD") finalAmountEur = rawValue / 0.92;

        return {
          budget_year: cleanYear,
          budget_month: cleanMonth,
          category: calculatedCategory,
          account_type: "Operational Expense",
          amount_eur: Number(finalAmountEur.toFixed(2)),
          short_text: String(row["Short Text"] || "-"),
          currency: rawCurrency,
          total_value: rawValue,
          raw_release_date: String(rawReleaseDate || "N/A"),
        };
      });

      setParsedRows(formattedActuals);
      setShowPreview(true);
      alert(`Parsed ${formattedActuals.length} entries successfully.`);
    };
    reader.readAsBinaryString(file);
  };

  async function executeHistoricalImport() {
    if (parsedRows.length === 0) return;
    setLoading(true);
    try {
      for (const row of parsedRows) {
        const { data: existingRecord } = await supabase
          .from("budget_actuals")
          .select("id")
          .eq("budget_year", row.budget_year)
          .eq("budget_month", row.budget_month)
          .eq("category", row.category)
          .eq("account_type", row.account_type)
          .maybeSingle();

        if (existingRecord) {
          await supabase
            .from("budget_actuals")
            .update({ amount_eur: row.amount_eur })
            .eq("id", existingRecord.id);
        } else {
          await supabase.from("budget_actuals").insert({
            budget_year: row.budget_year,
            budget_month: row.budget_month,
            category: row.category,
            account_type: row.account_type,
            amount_eur: row.amount_eur,

            short_text: row.short_text,
            raw_release_date: row.raw_release_date,
            currency: row.currency,
            total_value: row.total_value,
          });
        }
      }
      alert("Import completed successfully!");
      setParsedRows([]);
      setShowPreview(false);
      await loadHistoricalData();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }
  const totalBudget = items.reduce(
    (sum, item) => sum + (item.budget_value || 0),
    0,
  );
  const monthlyBudget = totalBudget / 12;
  const averageCategoryBudget =
    items.length > 0 ? totalBudget / items.length : 0;
  const totalCategories = items.length;

  const sortedItems = [...items].sort(
    (a, b) => b.budget_value - a.budget_value,
  );
  const top5Categories = sortedItems.slice(0, 5);

  const highestCategory = sortedItems[0]
    ? `${sortedItems[0].category} (€${sortedItems[0].budget_value.toLocaleString()})`
    : "N/A";
  const lowestCategory = sortedItems[sortedItems.length - 1]
    ? `${sortedItems[sortedItems.length - 1].category} (€${sortedItems[sortedItems.length - 1].budget_value.toLocaleString()})`
    : "N/A";

  const totalHistoricalCost = actuals.reduce(
    (sum, entry) => sum + (entry.amount_eur || 0),
    0,
  );
  const uniqueYears =
    Array.from(new Set(actuals.map((entry) => entry.budget_year)))
      .sort()
      .join(", ") || "None";

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border shadow-sm gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Maintenance Budget Planner
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Executive Forecast & Strategy Engine
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border">
          <label className="text-xs font-bold text-slate-600 uppercase pl-2">
            Fiscal Timeline:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white border text-slate-800 font-bold text-sm rounded-lg px-4 py-1.5 shadow-sm focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HISTORICAL COST IMPORT SECTION */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">
            Historical Cost Import (Data Engine)
          </h2>
          <button
            onClick={calculateAvrFromHistory}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            📊 Calculate AVR From History
          </button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelUpload}
            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all"
          />
          {showPreview && (
            <button
              onClick={executeHistoricalImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-sm transition-colors"
            >
              Confirm & Import Historical Data
            </button>
          )}
        </div>

        {showPreview && (
          <div className="border border-amber-200 bg-amber-50/30 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              File Processing Engine Preview ({parsedRows.length} Rows Parsed)
            </h3>
            <div className="overflow-x-auto max-h-60 rounded-lg border bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border-b">Release Date</th>
                    <th className="p-2 border-b text-indigo-700">
                      Detected Year
                    </th>
                    <th className="p-2 border-b text-indigo-700">
                      Detected Month
                    </th>
                    <th className="p-2 border-b">Short Text Description</th>
                    <th className="p-2 border-b">Categorization</th>
                    <th className="p-2 border-b">Calculated EUR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parsedRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-600 font-bold">
                        {row.raw_release_date}
                      </td>
                      <td className="p-2 text-indigo-700 font-black">
                        {row.budget_year}
                      </td>
                      <td className="p-2 text-indigo-700 font-black">
                        {row.budget_month}
                      </td>
                      <td className="p-2 font-medium truncate max-w-[200px]">
                        {row.short_text}
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                          {row.category}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-900">
                        €{row.amount_eur.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-xl border text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Total Records Stored
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {actuals.length} rows
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Years Available
            </div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {uniqueYears}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase">
              Total Historical Cost
            </div>
            <div className="text-xl font-bold text-slate-700 mt-1">
              €
              {totalHistoricalCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>
      {/* HISTORICAL COST BY CATEGORY MATRIX DASHBOARD */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
          Historical Cost By Category
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-700 font-bold text-xs uppercase">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">2023 (€)</th>
                <th className="p-3">2024 (€)</th>
                <th className="p-3">2025 (€)</th>
                <th className="p-3 bg-indigo-50 text-indigo-700 font-black">
                  AVR (€)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {historicalMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-950">
                    {row.category}
                  </td>
                  <td className="p-3">€{row.v2023.toLocaleString()}</td>
                  <td className="p-3">€{row.v2024.toLocaleString()}</td>
                  <td className="p-3">€{row.v2025.toLocaleString()}</td>
                  <td className="p-3 bg-indigo-50/50 font-black text-indigo-700">
                    €{row.calculatedAvr.toLocaleString()}
                  </td>
                </tr>
              ))}
              {historicalMatrix.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-slate-400 text-xs font-medium"
                  >
                    No strategic history logs compiled yet. Ready to synchronize
                    data layers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Presets Component */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Macroeconomic Strategy Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Conservative",
              desc: "Inflation: 3% | Production Growth: 2%",
              style:
                "border-blue-200 bg-blue-50/40 text-blue-700 hover:bg-blue-50",
            },
            {
              name: "Realistic",
              desc: "Inflation: 6% | Production Growth: 5%",
              style:
                "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100",
            },
            {
              name: "Aggressive",
              desc: "Inflation: 10% | Production Growth: 10%",
              style:
                "border-orange-200 bg-orange-50/40 text-orange-700 hover:bg-orange-50",
            },
          ].map((scen) => (
            <button
              key={scen.name}
              onClick={() => applyScenario(scen.name as any)}
              className={`p-4 rounded-xl border text-left transition-all ${scen.style} ${currentScenario === scen.name ? "ring-2 ring-indigo-600 border-transparent shadow-sm" : ""}`}
            >
              <div className="font-bold text-base">{scen.name} Blueprint</div>
              <div className="text-xs mt-1 opacity-80">{scen.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-2 uppercase">
            Inflation Target %
          </div>
          <input
            type="number"
            value={assumptions?.inflation ?? 0}
            onChange={(e) =>
              setAssumptions((prev) =>
                prev ? { ...prev, inflation: Number(e.target.value) } : null,
              )
            }
            className="w-full border rounded-lg px-3 py-2 outline-none font-medium focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-2 uppercase">
            Steel Coefficient
          </div>
          <input
            type="number"
            step="0.0001"
            value={assumptions?.steel_coefficient ?? 0}
            onChange={(e) =>
              setAssumptions((prev) =>
                prev
                  ? { ...prev, steel_coefficient: Number(e.target.value) }
                  : null,
              )
            }
            className="w-full border rounded-lg px-3 py-2 outline-none font-medium focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-2 uppercase">
            Production Growth %
          </div>
          <input
            type="number"
            value={assumptions?.production_growth ?? 0}
            onChange={(e) =>
              setAssumptions((prev) =>
                prev
                  ? { ...prev, production_growth: Number(e.target.value) }
                  : null,
              )
            }
            className="w-full border rounded-lg px-3 py-2 outline-none font-medium focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={saveAssumptions}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        >
          Save Assumptions
        </button>
        <button
          onClick={generateNextYearBudget}
          disabled={loading}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        >
          ✨ Generate Next Year Budget (FY {selectedYear + 1})
        </button>
      </div>

      <hr className="border-slate-200" />
      {/* Allocation Budget Cards and Spreadsheets Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 bg-gradient-to-br from-indigo-50/50 to-indigo-50 border-indigo-100 shadow-sm">
          <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
            Forecast Budget (Annual)
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            €
            {totalBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 bg-gradient-to-br from-emerald-50/50 to-emerald-50 border-emerald-100 shadow-sm">
          <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
            Monthly Operating Budget
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            €
            {monthlyBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 bg-gradient-to-br from-amber-50/50 to-amber-50 border-amber-100 shadow-sm">
          <div className="text-xs text-amber-600 font-bold uppercase tracking-wider">
            Average Category Budget
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            €
            {averageCategoryBudget.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <h2 className="text-lg font-bold text-slate-800">
          Forecast Matrix (FY {selectedYear})
        </h2>
        <button
          onClick={handleRecalculateForecast}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors"
        >
          🔄 Recalculate Forecast
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/5">
                  Category
                </th>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/8">
                  AVR Cost (€)
                </th>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/8">
                  FRC Cost (€)
                </th>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/12">
                  Frequency
                </th>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/8">
                  Unit
                </th>
                <th className="text-left p-3.5 text-xs font-bold text-slate-500 uppercase w-1/6">
                  Budget Value (€)
                </th>
                <th className="text-center p-3.5 text-xs font-bold text-slate-500 uppercase w-1/12">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-3 font-semibold text-slate-900">
                    {item.category}
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.avr_cost ?? 0}
                      onChange={(e) =>
                        handleInputChange(
                          item.id,
                          "avr_cost",
                          Number(e.target.value),
                        )
                      }
                      className="w-full border rounded-lg px-2 py-1 text-sm outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.forecast_cost ?? 0}
                      onChange={(e) =>
                        handleInputChange(
                          item.id,
                          "forecast_cost",
                          Number(e.target.value),
                        )
                      }
                      className="w-full border rounded-lg px-2 py-1 text-sm outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.frequency ?? 0}
                      onChange={(e) =>
                        handleInputChange(
                          item.id,
                          "frequency",
                          Number(e.target.value),
                        )
                      }
                      className="w-full border rounded-lg px-2 py-1 text-sm outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={item.frequency_unit ?? ""}
                      onChange={(e) =>
                        handleInputChange(
                          item.id,
                          "frequency_unit",
                          e.target.value,
                        )
                      }
                      className="w-full border rounded-lg px-2 py-1 text-sm outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.budget_value ?? 0}
                      onChange={(e) =>
                        handleInputChange(
                          item.id,
                          "budget_value",
                          Number(e.target.value),
                        )
                      }
                      className="w-full border rounded-lg px-2 py-1 text-sm outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => saveRow(item)}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
